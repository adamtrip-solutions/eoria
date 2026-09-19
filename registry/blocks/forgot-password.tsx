import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { CircleAlert, MailCheck } from 'lucide-react-native'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type ForgotPasswordProps = {
  /** Send the reset email here. Once it returns or resolves, the screen shows "Check your inbox". A rejection shows its message above the form. */
  onSubmit?: (email: string) => void | Promise<void>
  /** Renders "Back to sign in" on the form and on the confirmation. */
  onBack?: () => void
  defaultEmail?: string
  /** Pads the top by the safe area. Pass `insetTop={false}` when the screen sits under a navigation header. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

export function ForgotPassword({
  onSubmit,
  onBack,
  defaultEmail = '',
  insetTop = true,
  style,
}: ForgotPasswordProps) {
  const [email, setEmail] = useState(defaultEmail)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  /** The address the email went to. Set once the send succeeds. */
  const [sentTo, setSentTo] = useState<string>()
  // `pending` blocks a second submit from the keyboard before `busy` renders.
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const emailError = EMAIL.test(email.trim()) ? undefined : 'Enter a valid email address.'

  const submit = async () => {
    setSubmitted(true)
    if (emailError || pending.current) return
    pending.current = true
    setFailure(undefined)
    const address = email.trim()
    try {
      const result = onSubmit?.(address)
      if (result instanceof Promise) {
        setBusy(true)
        await result
      }
      if (mounted.current) {
        setSentTo(address)
        AccessibilityInfo.announceForAccessibility('Check your inbox')
      }
    } catch (error) {
      if (mounted.current) {
        const message = messageOf(error)
        setFailure(message)
        AccessibilityInfo.announceForAccessibility(message)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const startOver = () => {
    setSentTo(undefined)
    setSubmitted(false)
  }

  return (
    <View style={[styles.root, insetTop && styles.rootInsetTop, style]}>
      <KeyboardScrollView contentContainerStyle={styles.content}>
        {sentTo ? (
          <Empty>
            <EmptyMedia icon={<MailCheck />} />
            <EmptyTitle>Check your inbox</EmptyTitle>
            {/* The same line whether or not the account exists, so the screen does not reveal who has one. */}
            <EmptyDescription>
              {`If ${sentTo} has an account, a link to reset the password is on its way.`}
            </EmptyDescription>
            <EmptyActions>
              {onBack ? <Button onPress={onBack}>Back to sign in</Button> : null}
              <Button variant="link" size="sm" onPress={startOver}>
                Use a different email
              </Button>
            </EmptyActions>
          </Empty>
        ) : (
          <>
            <VStack gap={1}>
              <Text variant="heading" accessibilityRole="header">
                Reset your password
              </Text>
              <Text variant="muted">Enter your email and we will send you a reset link.</Text>
            </VStack>

            {failure ? (
              <Alert variant="destructive" icon={<CircleAlert />}>
                <AlertTitle>Could not send the email</AlertTitle>
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}

            <VStack gap={5}>
              <Field invalid={submitted && !!emailError} disabled={busy}>
                <FieldLabel>Email</FieldLabel>
                <FieldControl>
                  <Input
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    returnKeyType="send"
                    value={email}
                    onChangeText={setEmail}
                    onSubmitEditing={submit}
                  />
                </FieldControl>
                <FieldError>{emailError}</FieldError>
              </Field>

              <Button size="lg" width="full" loading={busy} onPress={submit}>
                Send reset link
              </Button>
            </VStack>

            {onBack ? (
              <HStack justify="center">
                <Button variant="link" size="sm" onPress={onBack}>
                  Back to sign in
                </Button>
              </HStack>
            ) : null}
          </>
        )}
      </KeyboardScrollView>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  rootInsetTop: { paddingTop: rt.insets.top },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    gap: theme.space[8],
    paddingTop: theme.space[6],
    paddingBottom: rt.insets.bottom + theme.space[8],
    paddingLeft: rt.insets.left + theme.space[6],
    paddingRight: rt.insets.right + theme.space[6],
  },
}))

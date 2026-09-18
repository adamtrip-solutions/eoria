import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  View,
  type StyleProp,
  type TextInput,
  type ViewStyle,
} from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { CircleAlert } from 'lucide-react-native'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { PasswordInput } from '@/components/ui/password-input'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

const MIN_PASSWORD = 8

export type ResetPasswordProps = {
  /** Gets the new password once both fields pass. Return a promise to keep the button busy. A rejection shows its message above the form. */
  onSubmit?: (password: string) => void | Promise<void>
  /** Renders the "Back to sign in" link. */
  onBack?: () => void
  /** Pads the top by the safe area. Pass `insetTop={false}` when the screen sits under a navigation header. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

export function ResetPassword({ onSubmit, onBack, insetTop = true, style }: ResetPasswordProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const confirmationRef = useRef<TextInput>(null)
  // `pending` blocks a second submit from the keyboard before `busy` renders.
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const passwordError =
    password.length >= MIN_PASSWORD ? undefined : `Use at least ${MIN_PASSWORD} characters.`
  const confirmationError = confirmation === password ? undefined : 'The passwords do not match.'

  const submit = async () => {
    setSubmitted(true)
    if (passwordError || confirmationError || pending.current) return
    pending.current = true
    setFailure(undefined)
    try {
      const result = onSubmit?.(password)
      if (result instanceof Promise) {
        setBusy(true)
        await result
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

  return (
    <View style={[styles.root, insetTop && styles.rootInsetTop, style]}>
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <VStack gap={1}>
          <Text variant="heading" accessibilityRole="header">
            Choose a new password
          </Text>
          <Text variant="muted">You will use it the next time you sign in.</Text>
        </VStack>

        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />}>
            <AlertTitle>Could not change the password</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}

        <VStack gap={5}>
          <Field invalid={submitted && !!passwordError} disabled={busy}>
            <FieldLabel>New password</FieldLabel>
            <FieldControl>
              <PasswordInput
                placeholder="New password"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                submitBehavior="submit"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() => confirmationRef.current?.focus()}
              />
            </FieldControl>
            <FieldDescription>{`At least ${MIN_PASSWORD} characters.`}</FieldDescription>
            <FieldError>{passwordError}</FieldError>
          </Field>

          <Field invalid={submitted && !!confirmationError} disabled={busy}>
            <FieldLabel>Confirm password</FieldLabel>
            <FieldControl>
              <PasswordInput
                ref={confirmationRef}
                placeholder="Type it again"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                showLabel="Show confirmation"
                hideLabel="Hide confirmation"
                value={confirmation}
                onChangeText={setConfirmation}
                onSubmitEditing={submit}
              />
            </FieldControl>
            <FieldError>{confirmationError}</FieldError>
          </Field>

          <Button size="lg" width="full" loading={busy} onPress={submit}>
            Save password
          </Button>
        </VStack>

        {onBack ? (
          <HStack justify="center">
            <Button variant="link" size="sm" onPress={onBack}>
              Back to sign in
            </Button>
          </HStack>
        ) : null}
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

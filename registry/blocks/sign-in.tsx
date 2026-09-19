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
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { PasswordInput } from '@/components/ui/password-input'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

export type SignInValues = { email: string; password: string }

export type SignInProps = {
  /** Return a promise to keep the button busy. A rejection shows its message above the form. */
  onSubmit?: (values: SignInValues) => void | Promise<void>
  /** Renders the "Forgot password?" link. */
  onForgotPassword?: () => void
  /** Renders the "Create one" link under the form. */
  onSignUp?: () => void
  /** Renders "Continue with Apple". */
  onApple?: () => void
  /** Renders "Continue with Google". */
  onGoogle?: () => void
  defaultValues?: Partial<SignInValues>
  /** Pads the top by the safe area. Pass `insetTop={false}` when the screen sits under a navigation header. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

export function SignIn({
  onSubmit,
  onForgotPassword,
  onSignUp,
  onApple,
  onGoogle,
  defaultValues,
  insetTop = true,
  style,
}: SignInProps) {
  const [email, setEmail] = useState(defaultValues?.email ?? '')
  const [password, setPassword] = useState(defaultValues?.password ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const passwordRef = useRef<TextInput>(null)
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
  const passwordError =
    password.length >= MIN_PASSWORD ? undefined : `Use at least ${MIN_PASSWORD} characters.`

  const submit = async () => {
    setSubmitted(true)
    if (emailError || passwordError || pending.current) return
    pending.current = true
    setFailure(undefined)
    try {
      const result = onSubmit?.({ email: email.trim(), password })
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
            Welcome back
          </Text>
          <Text variant="muted">Sign in to your account.</Text>
        </VStack>

        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />}>
            <AlertTitle>Could not sign in</AlertTitle>
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
                returnKeyType="next"
                submitBehavior="submit"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </FieldControl>
            <FieldError>{emailError}</FieldError>
          </Field>

          <Field invalid={submitted && !!passwordError} disabled={busy}>
            <HStack justify="space-between">
              <FieldLabel>Password</FieldLabel>
              {onForgotPassword ? (
                <Button variant="link" size="sm" onPress={onForgotPassword}>
                  Forgot password?
                </Button>
              ) : null}
            </HStack>
            <FieldControl>
              <PasswordInput
                ref={passwordRef}
                placeholder="Your password"
                returnKeyType="go"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />
            </FieldControl>
            <FieldError>{passwordError}</FieldError>
          </Field>

          <Button size="lg" width="full" loading={busy} onPress={submit}>
            Sign in
          </Button>
        </VStack>

        {onApple || onGoogle ? (
          <>
            <HStack gap={3}>
              <Separator style={styles.line} />
              <Text variant="caption">or</Text>
              <Separator style={styles.line} />
            </HStack>
            <VStack gap={2}>
              {onApple ? (
                <Button variant="outline" width="full" disabled={busy} onPress={onApple}>
                  Continue with Apple
                </Button>
              ) : null}
              {onGoogle ? (
                <Button variant="outline" width="full" disabled={busy} onPress={onGoogle}>
                  Continue with Google
                </Button>
              ) : null}
            </VStack>
          </>
        ) : null}

        {onSignUp ? (
          <HStack justify="center" gap={1}>
            <Text variant="muted">No account?</Text>
            <Button
              variant="link"
              size="sm"
              accessibilityLabel="Create an account"
              onPress={onSignUp}
            >
              Create one
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
  line: { flex: 1 },
}))

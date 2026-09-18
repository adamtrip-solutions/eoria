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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8
const TERMS_LABEL = 'I agree to the terms and the privacy policy'

export type SignUpValues = { name: string; email: string; password: string }

export type SignUpProps = {
  /** Runs only with the terms ticked. Return a promise to keep the button busy. A rejection shows its message above the form. */
  onSubmit?: (values: SignUpValues) => void | Promise<void>
  /** Renders the "Sign in" link under the form. */
  onSignIn?: () => void
  /** Renders a "Read the terms" link under the checkbox. */
  onTerms?: () => void
  /** Renders "Continue with Apple". */
  onApple?: () => void
  /** Renders "Continue with Google". */
  onGoogle?: () => void
  defaultValues?: Partial<SignUpValues> & { terms?: boolean }
  /** Pads the top by the safe area. Pass `insetTop={false}` when the screen sits under a navigation header. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

export function SignUp({
  onSubmit,
  onSignIn,
  onTerms,
  onApple,
  onGoogle,
  defaultValues,
  insetTop = true,
  style,
}: SignUpProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [email, setEmail] = useState(defaultValues?.email ?? '')
  const [password, setPassword] = useState(defaultValues?.password ?? '')
  const [terms, setTerms] = useState(defaultValues?.terms ?? false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failure, setFailure] = useState<string>()
  const emailRef = useRef<TextInput>(null)
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

  const nameError = name.trim() ? undefined : 'Enter your name.'
  const emailError = EMAIL.test(email.trim()) ? undefined : 'Enter a valid email address.'
  const passwordError =
    password.length >= MIN_PASSWORD ? undefined : `Use at least ${MIN_PASSWORD} characters.`
  const termsError = terms ? undefined : 'Accept the terms to continue.'
  const showTermsError = submitted && !!termsError

  const submit = async () => {
    setSubmitted(true)
    if (nameError || emailError || passwordError || termsError || pending.current) return
    pending.current = true
    setFailure(undefined)
    try {
      const result = onSubmit?.({ name: name.trim(), email: email.trim(), password })
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
            Create your account
          </Text>
          <Text variant="muted">It takes a minute.</Text>
        </VStack>

        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />}>
            <AlertTitle>Could not create the account</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}

        <VStack gap={5}>
          <Field invalid={submitted && !!nameError} disabled={busy}>
            <FieldLabel>Name</FieldLabel>
            <FieldControl>
              <Input
                placeholder="Ada Lovelace"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                returnKeyType="next"
                submitBehavior="submit"
                value={name}
                onChangeText={setName}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
            </FieldControl>
            <FieldError>{nameError}</FieldError>
          </Field>

          <Field invalid={submitted && !!emailError} disabled={busy}>
            <FieldLabel>Email</FieldLabel>
            <FieldControl>
              <Input
                ref={emailRef}
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
            <FieldLabel>Password</FieldLabel>
            <FieldControl>
              <PasswordInput
                ref={passwordRef}
                placeholder="Choose a password"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                value={password}
                onChangeText={setPassword}
              />
            </FieldControl>
            <FieldDescription>{`At least ${MIN_PASSWORD} characters.`}</FieldDescription>
            <FieldError>{passwordError}</FieldError>
          </Field>

          {/* Field draws and announces the error. The checkbox is not a FieldControl
              child, so it carries its own label and gets the error as its hint. */}
          <Field invalid={showTermsError} disabled={busy}>
            <HStack gap={3}>
              <Checkbox
                checked={terms}
                onCheckedChange={setTerms}
                disabled={busy}
                accessibilityLabel={TERMS_LABEL}
                accessibilityHint={showTermsError ? termsError : undefined}
              />
              {/* The checkbox already reads this text, so the label stays out of the screen reader's way. */}
              <Label
                accessible={false}
                disabled={busy}
                style={styles.termsLabel}
                onPress={() => setTerms((value) => !value)}
              >
                {TERMS_LABEL}
              </Label>
            </HStack>
            {onTerms ? (
              // The row keeps the link at its own width instead of stretching across the field.
              <HStack>
                <Button variant="link" size="sm" onPress={onTerms}>
                  Read the terms
                </Button>
              </HStack>
            ) : null}
            <FieldError>{termsError}</FieldError>
          </Field>

          <Button size="lg" width="full" loading={busy} onPress={submit}>
            Create account
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

        {onSignIn ? (
          <HStack justify="center" gap={1}>
            <Text variant="muted">Already have an account?</Text>
            <Button variant="link" size="sm" onPress={onSignIn}>
              Sign in
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
  termsLabel: { flex: 1 },
}))

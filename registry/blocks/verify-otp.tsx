import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { CircleAlert } from 'lucide-react-native'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { InputOTP } from '@/components/ui/input-otp'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

const CODE_LENGTH = 6

export type VerifyOtpProps = {
  /** Where the code went, shown in the intro line. An email address or a phone number. */
  destination?: string
  /** Runs when the last digit lands and when the button is pressed. A rejection shows its message and clears the code. */
  onSubmit?: (code: string) => void | Promise<void>
  /** Renders the resend action. A resolved call restarts the countdown. */
  onResend?: () => void | Promise<void>
  /** Seconds before the resend action unlocks. */
  resendAfter?: number
  /** Renders the "Use a different address" link. */
  onBack?: () => void
  defaultCode?: string
  /** Opens the keyboard on mount. */
  autoFocus?: boolean
  /** Pads the top by the safe area. Pass `insetTop={false}` when the screen sits under a navigation header. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'Something went wrong. Try again.'
}

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function VerifyOtp({
  destination,
  onSubmit,
  onResend,
  resendAfter = 30,
  onBack,
  defaultCode = '',
  autoFocus = true,
  insetTop = true,
  style,
}: VerifyOtpProps) {
  const [code, setCode] = useState(defaultCode)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  const [failure, setFailure] = useState<string>()
  // The countdown reads a deadline instead of counting ticks, so time spent in the
  // background still counts.
  const [deadline, setDeadline] = useState(() => Date.now() + resendAfter * 1000)
  const [remaining, setRemaining] = useState(resendAfter)
  // `pending` blocks a second submit before `busy` renders.
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [deadline])

  const codeError = code.length === CODE_LENGTH ? undefined : `Enter the ${CODE_LENGTH}-digit code.`

  const fail = (error: unknown) => {
    const message = messageOf(error)
    setFailure(message)
    AccessibilityInfo.announceForAccessibility(message)
  }

  const submit = async (value: string) => {
    setSubmitted(true)
    if (value.length !== CODE_LENGTH || pending.current) return
    pending.current = true
    setFailure(undefined)
    try {
      const result = onSubmit?.(value)
      if (result instanceof Promise) {
        setBusy(true)
        await result
      }
    } catch (error) {
      if (mounted.current) {
        fail(error)
        // A rejected code is no use, so the cells empty for the next try.
        setCode('')
        setSubmitted(false)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  const resend = async () => {
    if (remaining > 0 || resending) return
    setFailure(undefined)
    try {
      const result = onResend?.()
      if (result instanceof Promise) {
        setResending(true)
        await result
      }
      if (!mounted.current) return
      setDeadline(Date.now() + resendAfter * 1000)
      setRemaining(resendAfter)
      AccessibilityInfo.announceForAccessibility('We sent a new code.')
    } catch (error) {
      if (mounted.current) fail(error)
    } finally {
      if (mounted.current) setResending(false)
    }
  }

  return (
    <View style={[styles.root, insetTop && styles.rootInsetTop, style]}>
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <VStack gap={1}>
          <Text variant="heading" accessibilityRole="header">
            Enter the code
          </Text>
          <Text variant="muted">
            {destination
              ? `We sent a ${CODE_LENGTH}-digit code to ${destination}.`
              : `We sent you a ${CODE_LENGTH}-digit code.`}
          </Text>
        </VStack>

        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />}>
            <AlertTitle>That did not work</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}

        <VStack gap={5}>
          <Field invalid={submitted && !!codeError} disabled={busy}>
            <FieldLabel>Verification code</FieldLabel>
            <FieldControl>
              <InputOTP
                length={CODE_LENGTH}
                value={code}
                onValueChange={setCode}
                onComplete={submit}
                autoFocus={autoFocus}
                style={styles.code}
              />
            </FieldControl>
            <FieldError>{codeError}</FieldError>
          </Field>

          <Button size="lg" width="full" loading={busy} onPress={() => submit(code)}>
            Verify
          </Button>
        </VStack>

        {onResend || onBack ? (
          <VStack gap={2} align="center">
            {onResend ? (
              <HStack gap={1}>
                <Text variant="muted">No code yet?</Text>
                <Button
                  variant="link"
                  size="sm"
                  disabled={remaining > 0 || resending || busy}
                  accessibilityState={{ busy: resending }}
                  onPress={resend}
                >
                  {remaining > 0 ? `Resend in ${clock(remaining)}` : 'Resend code'}
                </Button>
              </HStack>
            ) : null}
            {onBack ? (
              <Button variant="link" size="sm" onPress={onBack}>
                Use a different address
              </Button>
            ) : null}
          </VStack>
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
  // InputOTP hugs its cells by default. Stretched, the six cells share the row.
  code: { alignSelf: 'stretch' },
}))

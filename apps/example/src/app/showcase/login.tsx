import { useEffect, useRef, useState } from 'react'
import { router } from 'expo-router'
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const headerHeight = useHeaderHeight()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => clearTimeout(timer.current ?? undefined), [])

  const emailError = !EMAIL.test(email) ? 'Enter a valid email address.' : undefined
  const passwordError = password.length < 8 ? 'Use at least 8 characters.' : undefined
  const valid = !emailError && !passwordError

  const submit = () => {
    setSubmitted(true)
    if (!valid) return
    setBusy(true)
    // Cleared on unmount so leaving early cannot pop a second screen.
    timer.current = setTimeout(() => {
      setBusy(false)
      toast({ title: 'Signed in', description: `Welcome back, ${email}` })
      router.back()
    }, 700)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <VStack gap={1}>
          <Text variant="heading">Welcome back</Text>
          <Text variant="muted">Sign in to continue to your account.</Text>
        </VStack>

        <VStack gap={5}>
          <Field invalid={submitted && !!emailError}>
            <FieldLabel>Email</FieldLabel>
            <FieldControl>
              <Input
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                textContentType="emailAddress"
                value={email}
                onChangeText={setEmail}
              />
            </FieldControl>
            <FieldError>{emailError}</FieldError>
          </Field>

          <Field invalid={submitted && !!passwordError}>
            <HStack justify="space-between">
              <FieldLabel>Password</FieldLabel>
              <Button
                variant="link"
                size="sm"
                onPress={() =>
                  toast({ title: 'Reset link sent', description: 'Check your inbox.' })
                }
              >
                Forgot?
              </Button>
            </HStack>
            <FieldControl>
              <Input
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />
            </FieldControl>
            <FieldError>{passwordError}</FieldError>
          </Field>

          <HStack gap={2}>
            <Checkbox
              checked={remember}
              onCheckedChange={setRemember}
              accessibilityLabel="Remember me"
            />
            <Label onPress={() => setRemember((r) => !r)}>Remember me on this device</Label>
          </HStack>

          <Button size="lg" width="full" disabled={busy} onPress={submit}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </VStack>

        <HStack gap={3}>
          <Separator style={styles.flex} />
          <Text variant="caption">or</Text>
          <Separator style={styles.flex} />
        </HStack>

        <VStack gap={2}>
          <Button
            variant="outline"
            width="full"
            onPress={() => toast({ title: 'Not wired in the demo' })}
          >
            Continue with Apple
          </Button>
          <Button
            variant="outline"
            width="full"
            onPress={() => toast({ title: 'Not wired in the demo' })}
          >
            Continue with Google
          </Button>
        </VStack>

        <HStack justify="center" gap={1}>
          <Text variant="muted">No account?</Text>
          <Button variant="link" size="sm" onPress={() => toast({ title: 'Sign up flow' })}>
            Create one
          </Button>
        </HStack>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  content: {
    padding: theme.space[6],
    paddingTop: theme.space[8],
    gap: theme.space[8],
    paddingBottom: theme.space[16],
  },
}))

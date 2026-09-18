import { Stack, router } from 'expo-router'
import { ForgotPassword } from '@/components/blocks/forgot-password'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function ForgotPasswordRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Forgot password' }} />
      <ForgotPassword insetTop={false} onSubmit={() => wait(700)} onBack={() => router.back()} />
    </>
  )
}

import { Stack, router } from 'expo-router'
import { ResetPassword } from '@/components/blocks/reset-password'
import { toast } from '@/components/ui/toast'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function ResetPasswordRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'New password' }} />
      <ResetPassword
        insetTop={false}
        onSubmit={async () => {
          await wait(700)
          toast({ title: 'Password changed', description: 'Sign in with the new one.' })
          router.back()
        }}
        onBack={() => router.back()}
      />
    </>
  )
}

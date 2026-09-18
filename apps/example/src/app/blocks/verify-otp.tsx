import { Stack, router } from 'expo-router'
import { VerifyOtp } from '@/components/blocks/verify-otp'
import { toast } from '@/components/ui/toast'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function VerifyOtpRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Verify' }} />
      <VerifyOtp
        insetTop={false}
        destination="ada@example.com"
        onSubmit={async (code) => {
          await wait(700)
          // Any code passes except this one, so the demo can show the error state.
          if (code === '000000') throw new Error('That code is wrong or has expired.')
          toast({ title: 'Verified', description: 'Your account is ready.' })
          router.back()
        }}
        onResend={async () => {
          await wait(700)
          toast({ title: 'Code sent', description: 'Check ada@example.com.' })
        }}
        onBack={() => router.back()}
      />
    </>
  )
}

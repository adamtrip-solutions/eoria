import { Stack, router, type Href } from 'expo-router'
import { SignUp } from '@/components/blocks/sign-up'
import { toast } from '@/components/ui/toast'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function SignUpRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sign up' }} />
      <SignUp
        insetTop={false}
        onSubmit={async () => {
          await wait(700)
          router.push('/blocks/verify-otp' as Href)
        }}
        onSignIn={() => router.push('/blocks/sign-in' as Href)}
        onTerms={() => toast({ title: 'Terms', description: 'Open your terms page here.' })}
        onApple={() => toast({ title: 'Not wired in the demo' })}
        onGoogle={() => toast({ title: 'Not wired in the demo' })}
      />
    </>
  )
}

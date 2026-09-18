import { Stack, router, type Href } from 'expo-router'
import { SignIn } from '@/components/blocks/sign-in'
import { toast } from '@/components/ui/toast'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function SignInRoute() {
  return (
    <>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <SignIn
        insetTop={false}
        onSubmit={async ({ email }) => {
          await wait(700)
          toast({ title: 'Signed in', description: `Welcome back, ${email}` })
          router.back()
        }}
        onForgotPassword={() => router.push('/blocks/forgot-password' as Href)}
        onSignUp={() => router.push('/blocks/sign-up' as Href)}
        onApple={() => toast({ title: 'Not wired in the demo' })}
        onGoogle={() => toast({ title: 'Not wired in the demo' })}
      />
    </>
  )
}

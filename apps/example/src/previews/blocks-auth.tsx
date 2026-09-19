// Full-screen demos of the auth blocks, one per registry item.
// previews.tsx merges these into the map the docs screenshots read.
// `insetTop` defaults to true, so each block pads its own top and the canvas around it must not.
import type { ReactElement } from 'react'
import { ForgotPassword } from '@/components/blocks/forgot-password'
import { ResetPassword } from '@/components/blocks/reset-password'
import { SignIn } from '@/components/blocks/sign-in'
import { SignUp } from '@/components/blocks/sign-up'
import { VerifyOtp } from '@/components/blocks/verify-otp'

const noop = () => {}

export const authBlockPreviews: Record<string, () => ReactElement> = {
  'sign-in': () => (
    <SignIn
      defaultValues={{ email: 'ada@example.com' }}
      onSubmit={noop}
      onForgotPassword={noop}
      onSignUp={noop}
      onApple={noop}
      onGoogle={noop}
    />
  ),
  'sign-up': () => (
    <SignUp
      defaultValues={{ name: 'Ada Lovelace', email: 'ada@example.com', terms: true }}
      onSubmit={noop}
      onSignIn={noop}
      onTerms={noop}
    />
  ),
  'verify-otp': () => (
    <VerifyOtp
      autoFocus={false}
      destination="ada@example.com"
      defaultCode="482"
      onSubmit={noop}
      onResend={noop}
      onBack={noop}
    />
  ),
  'forgot-password': () => (
    <ForgotPassword defaultEmail="ada@example.com" onSubmit={noop} onBack={noop} />
  ),
  'reset-password': () => <ResetPassword onSubmit={noop} onBack={noop} />,
}

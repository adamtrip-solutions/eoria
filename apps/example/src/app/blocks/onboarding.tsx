import { Stack, router } from 'expo-router'
import { Onboarding } from '@/components/blocks/onboarding'
import { toast } from '@/components/ui/toast'
import { onboardingSlides } from '@/previews/blocks-app'

export default function OnboardingDemo() {
  return (
    <>
      {/* Full screen, so the block pads the status bar itself. */}
      <Stack.Screen options={{ headerShown: false }} />
      <Onboarding
        slides={onboardingSlides}
        onDone={() => {
          toast({ title: 'Onboarding done' })
          router.back()
        }}
        onSkip={() => {
          toast({ title: 'Onboarding skipped' })
          router.back()
        }}
      />
    </>
  )
}

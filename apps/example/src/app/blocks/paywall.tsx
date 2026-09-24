import { useRef } from 'react'
import { Stack, router } from 'expo-router'
import { Paywall } from '@/components/blocks/paywall'
import { toast } from '@/components/ui/toast'
import { paywallFeatures, paywallPlans } from '@/previews/blocks-commerce'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function PaywallDemo() {
  const attempts = useRef(0)
  return (
    <>
      <Stack.Screen options={{ title: 'Paywall' }} />
      <Paywall
        insetTop={false}
        title="Make room for more"
        subtitle="Your favourites, wherever you go."
        features={paywallFeatures}
        plans={paywallPlans}
        onSelectPlan={async (planId) => {
          await wait(1200)
          attempts.current += 1
          if (attempts.current === 1)
            throw new Error('The purchase could not be completed. Try again.')
          toast({
            title: 'Plan selected',
            description: planId === 'annual' ? 'Yearly plan' : 'Monthly plan',
          })
        }}
        onRestore={async () => {
          await wait(900)
          toast({ title: 'Purchases restored' })
        }}
        onTerms={async () => {
          await wait(300)
          toast({ title: 'Terms', description: 'Open your terms page here.' })
        }}
        onPrivacy={async () => {
          await wait(300)
          toast({ title: 'Privacy', description: 'Open your privacy policy here.' })
        }}
        onClose={() => router.back()}
      />
    </>
  )
}

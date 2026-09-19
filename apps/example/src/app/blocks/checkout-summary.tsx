import { useRef, useState } from 'react'
import { Stack, router } from 'expo-router'
import { ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { CheckoutSummary } from '@/components/blocks/checkout-summary'
import { toast } from '@/components/ui/toast'
import { checkoutLines } from '@/previews/blocks-app'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function CheckoutSummaryDemo() {
  const [promo, setPromo] = useState<string>()
  // The first payment fails, so the demo shows the error Alert. The second goes through.
  const attempts = useRef(0)
  return (
    <>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <CheckoutSummary
          lines={checkoutLines}
          delivery={4.5}
          discount={promo ? 7.6 : 0}
          discountLabel={promo}
          currency="EUR"
          locale="en-IE"
          onApplyPromo={async (code) => {
            await wait(600)
            // The only code the demo knows.
            if (code.toUpperCase() !== 'WELCOME10') {
              throw new Error('That code is not valid. Try WELCOME10.')
            }
            setPromo('WELCOME10')
            toast({ title: 'Code applied' })
          }}
          onPay={async () => {
            await wait(1500)
            attempts.current += 1
            if (attempts.current === 1) throw new Error('Your card was declined. Try again.')
            toast({ title: 'Payment received' })
            router.back()
          }}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.space[4] },
}))

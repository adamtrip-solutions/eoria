import { ArrowRight, Check, Plus } from 'lucide-react-native'
import { Alert } from 'react-native'
import { Screen, Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
import { CheckoutButton } from '@/components/ui/checkout-button'

const variants = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const
const sizes = ['sm', 'md', 'lg'] as const

export default function ButtonScreen() {
  const press = (what: string) => () => Alert.alert(what)
  return (
    <Screen>
      <Section title="Variants">
        {variants.map((v) => (
          <Button key={v} variant={v} onPress={press(v)}>
            {v}
          </Button>
        ))}
      </Section>
      <Section title="Sizes">
        {sizes.map((s) => (
          <Button key={s} size={s} onPress={press(s)}>
            {s}
          </Button>
        ))}
        <Button size="icon" icon={<Plus />} accessibilityLabel="Add" onPress={press('icon')} />
      </Section>
      <Section title="With icon">
        <Button icon={<Check />} onPress={press('left')}>
          Confirm
        </Button>
        <Button
          variant="outline"
          icon={<ArrowRight />}
          iconPosition="right"
          onPress={press('right')}
        >
          Continue
        </Button>
      </Section>
      <Section title="Disabled">
        <Button disabled>Disabled</Button>
        <Button variant="outline" disabled icon={<Check />}>
          Disabled
        </Button>
      </Section>
      <Section title="Slot overrides">
        <Button
          styles={{ root: { borderRadius: 999 }, label: { letterSpacing: 1 } }}
          onPress={press('pill')}
        >
          Pill
        </Button>
      </Section>
      <Section title="Extended: CheckoutButton">
        <CheckoutButton onPress={press('checkout')}>Pay now</CheckoutButton>
        <CheckoutButton variant="outline" onPress={press('outline')}>
          Inherited outline
        </CheckoutButton>
        <CheckoutButton size="sm" icon={<ArrowRight />} iconPosition="right" onPress={press('sm')}>
          Small brand
        </CheckoutButton>
      </Section>
    </Screen>
  )
}

import { useState } from 'react'
import { Screen, Section } from '@/components/screen'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { HStack, VStack } from '@/components/ui/stack'
import { Switch } from '@/components/ui/switch'

export default function SelectionScreen() {
  const [checked, setChecked] = useState(true)
  const [on, setOn] = useState(false)
  const [plan, setPlan] = useState<string | undefined>('pro')
  return (
    <Screen>
      <Section title="Checkbox">
        <HStack gap={2}>
          <Checkbox
            checked={checked}
            onCheckedChange={setChecked}
            accessibilityLabel="Accept terms"
            accessibilityLabelledBy="terms"
          />
          <Label nativeID="terms" onPress={() => setChecked((c) => !c)}>
            Accept terms
          </Label>
        </HStack>
        <Checkbox size="sm" checked={checked} onCheckedChange={setChecked} />
        <Checkbox size="lg" checked={checked} onCheckedChange={setChecked} />
        <Checkbox checked disabled />
      </Section>
      <Section title="Switch">
        <HStack gap={2}>
          <Switch checked={on} onCheckedChange={setOn} accessibilityLabel="Notifications" />
          <Label>Notifications {on ? 'on' : 'off'}</Label>
        </HStack>
        <Switch size="sm" checked={on} onCheckedChange={setOn} />
        <Switch checked disabled />
      </Section>
      <Section title="RadioGroup">
        <RadioGroup value={plan} onValueChange={setPlan}>
          <VStack gap={3}>
            {['free', 'pro', 'team'].map((v) => (
              <HStack key={v} gap={2}>
                <RadioGroupItem value={v} accessibilityLabel={v} />
                <Label onPress={() => setPlan(v)}>{v}</Label>
              </HStack>
            ))}
            <HStack gap={2}>
              <RadioGroupItem value="enterprise" disabled />
              <Label disabled>enterprise</Label>
            </HStack>
          </VStack>
        </RadioGroup>
      </Section>
    </Screen>
  )
}

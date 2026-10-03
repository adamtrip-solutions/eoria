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
  const [alerts, setAlerts] = useState([true, false])
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
        <HStack gap={2}>
          <Switch
            checked={alerts.every(Boolean) ? true : alerts.some(Boolean) ? 'mixed' : false}
            onCheckedChange={(next) => setAlerts(alerts.map(() => next))}
            accessibilityLabel="All alerts"
          />
          <Label>All alerts</Label>
        </HStack>
        {alerts.map((alert, i) => (
          <HStack key={i} gap={2}>
            <Switch
              size="sm"
              checked={alert}
              onCheckedChange={(next) => setAlerts(alerts.map((a, j) => (j === i ? next : a)))}
              accessibilityLabel={`Alert ${i + 1}`}
            />
            <Label>Alert {i + 1}</Label>
          </HStack>
        ))}
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

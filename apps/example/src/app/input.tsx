import { useState } from 'react'
import { Screen, Section } from '@/components/screen'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

export default function InputScreen() {
  const [email, setEmail] = useState('')
  const invalid = email.length > 0 && !email.includes('@')
  return (
    <Screen>
      <Section block title="With label">
        <VStack gap={2}>
          <Label nativeID="email-label">Email</Label>
          <Input
            accessibilityLabel="Email"
            accessibilityLabelledBy="email-label"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            invalid={invalid}
          />
          {invalid ? (
            <Text variant="caption" style={{ color: 'tomato' }}>
              Enter a valid email
            </Text>
          ) : null}
        </VStack>
      </Section>
      <Section block title="Sizes">
        <VStack gap={2}>
          <Input size="sm" placeholder="sm" />
          <Input size="md" placeholder="md" />
          <Input size="lg" placeholder="lg" />
        </VStack>
      </Section>
      <Section block title="States">
        <VStack gap={2}>
          <Input invalid placeholder="invalid" />
          <Input disabled placeholder="disabled" />
          <Label disabled>Disabled label</Label>
        </VStack>
      </Section>
    </Screen>
  )
}

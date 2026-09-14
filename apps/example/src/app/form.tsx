import { useState } from 'react'
import { Screen, Section } from '@/components/screen'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP } from '@/components/ui/input-otp'
import { Slider } from '@/components/ui/slider'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { Textarea } from '@/components/ui/textarea'

export default function FormScreen() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [agree, setAgree] = useState(false)
  const [code, setCode] = useState('')
  const [done, setDone] = useState<string | null>(null)
  const [volume, setVolume] = useState(40)
  const [committed, setCommitted] = useState(40)
  const nameInvalid = name.length > 0 && name.length < 3
  const bioInvalid = bio.length > 120
  return (
    <Screen>
      <Section block title="Field with Input">
        <Field invalid={nameInvalid}>
          <FieldLabel>Display name</FieldLabel>
          <FieldControl>
            <Input placeholder="At least 3 characters" value={name} onChangeText={setName} />
          </FieldControl>
          <FieldDescription>Shown on your public profile.</FieldDescription>
          <FieldError>Name is too short.</FieldError>
        </Field>
      </Section>
      <Section block title="Field with Textarea">
        <Field invalid={bioInvalid}>
          <FieldLabel>Bio</FieldLabel>
          <FieldControl>
            <Textarea placeholder="Tell people about yourself" value={bio} onChangeText={setBio} />
          </FieldControl>
          <FieldDescription>{`${bio.length}/120`}</FieldDescription>
          <FieldError>Keep it under 120 characters.</FieldError>
        </Field>
      </Section>
      <Section block title="Field with Checkbox">
        <Field>
          <HStack gap={2}>
            <FieldControl>
              <Checkbox checked={agree} onCheckedChange={setAgree} />
            </FieldControl>
            <FieldLabel onPress={() => setAgree((a) => !a)}>I agree to the terms</FieldLabel>
          </HStack>
        </Field>
      </Section>
      <Section block title="Textarea sizes and states">
        <Textarea size="sm" placeholder="sm" />
        <Textarea size="lg" placeholder="lg" />
        <Textarea invalid placeholder="invalid" />
        <Textarea disabled placeholder="disabled" />
      </Section>
      <Section block title="Disabled field">
        <Field disabled>
          <FieldLabel>Username</FieldLabel>
          <FieldControl>
            <Input value="locked" />
          </FieldControl>
          <FieldDescription>Contact support to change it.</FieldDescription>
        </Field>
      </Section>
      <Section block title="InputOTP">
        <VStack gap={3}>
          <InputOTP
            length={6}
            value={code}
            onValueChange={(v) => {
              setCode(v)
              if (v.length < 6) setDone(null)
            }}
            onComplete={setDone}
          />
          <Text variant="muted">{done ? `Complete: ${done}` : `${code.length} of 6`}</Text>
          <InputOTP length={4} mode="alphanumeric" size="sm" />
          <InputOTP length={6} secure invalid defaultValue="123456" />
          <InputOTP length={4} disabled defaultValue="12" />
        </VStack>
      </Section>
      <Section block title="Slider">
        <VStack gap={4}>
          <Slider
            value={volume}
            onValueChange={setVolume}
            onValueCommit={setCommitted}
            accessibilityLabel="Volume"
          />
          <Text variant="muted">
            {volume} while dragging, {committed} committed
          </Text>
          <Slider size="sm" defaultValue={70} />
          <Slider size="lg" defaultValue={2.5} min={0} max={5} step={0.5} />
          <Slider defaultValue={50} disabled />
        </VStack>
      </Section>
    </Screen>
  )
}

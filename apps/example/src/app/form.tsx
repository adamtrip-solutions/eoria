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
import { HStack } from '@/components/ui/stack'
import { Textarea } from '@/components/ui/textarea'

export default function FormScreen() {
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [agree, setAgree] = useState(false)
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
    </Screen>
  )
}

import { useState } from 'react'
import { Screen, Section } from '@/components/screen'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Text } from '@/components/ui/text'

const faq = [
  ['shipping', 'How long does shipping take?', 'Two to five business days in most regions.'],
  [
    'returns',
    'What is the return policy?',
    'Thirty days, no questions asked. Original packaging preferred.',
  ],
  ['support', 'How do I contact support?', 'Email support@example.com or use the chat in the app.'],
] as const

export default function AccordionScreen() {
  const [open, setOpen] = useState<string[]>(['shipping'])
  return (
    <Screen>
      <Section block title="Single, collapsible">
        <Accordion defaultValue="shipping">
          {faq.map(([value, q, a]) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
          <AccordionItem value="disabled" disabled>
            <AccordionTrigger>Disabled item</AccordionTrigger>
            <AccordionContent>Never shown.</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Section>
      <Section block title="Multiple, controlled, contained">
        <Accordion type="multiple" variant="contained" value={open} onValueChange={setOpen}>
          {faq.map(([value, q, a]) => (
            <AccordionItem key={value} value={value}>
              <AccordionTrigger>{q}</AccordionTrigger>
              <AccordionContent>{a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Text variant="muted">Open: {open.join(', ') || 'none'}</Text>
      </Section>
    </Screen>
  )
}

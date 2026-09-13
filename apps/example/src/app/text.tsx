import { Screen, Section } from '@/components/screen'
import { Text } from '@/components/ui/text'

const variants = ['heading', 'title', 'body', 'label', 'muted', 'caption'] as const
const weights = ['normal', 'medium', 'semibold', 'bold'] as const

export default function TextScreen() {
  return (
    <Screen>
      <Section title="Variants">
        {variants.map((v) => (
          <Text key={v} variant={v}>
            {`${v}: The quick brown fox`}
          </Text>
        ))}
      </Section>
      <Section title="Weights">
        {weights.map((w) => (
          <Text key={w} weight={w}>
            {w}
          </Text>
        ))}
      </Section>
      <Section title="Style override">
        <Text variant="title" style={{ color: 'tomato' }}>
          Plain style prop still works
        </Text>
      </Section>
    </Screen>
  )
}

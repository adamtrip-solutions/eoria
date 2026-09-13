import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Text } from '@/components/ui/text'

export function Screen({ children }: { children: ReactNode }) {
  return <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
}

export function Section({
  title,
  block,
  children,
}: {
  title: string
  /** Stack children full-width instead of wrapping them in a row. */
  block?: boolean
  children: ReactNode
}) {
  return (
    <View style={styles.section}>
      <Text variant="label" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={block ? styles.block : styles.row}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.space[4], gap: theme.space[6], paddingBottom: theme.space[16] },
  section: { gap: theme.space[3] },
  sectionTitle: {
    color: theme.colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3], alignItems: 'center' },
  block: { gap: theme.space[3] },
}))

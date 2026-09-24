import { useEffect, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import { ScrollView } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { FilterSheet } from '@/components/blocks/filter-sheet'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'
import { filterGroups, filterValues } from '@/previews/blocks-commerce'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export default function FilterSheetDemo() {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(filterValues)
  const attempts = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return (
    <>
      <Stack.Screen options={{ title: 'Filter sheet' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Button onPress={() => setOpen(true)}>Filters</Button>
        <Text variant="title" accessibilityRole="header">
          Applied filters
        </Text>
        <Text>{JSON.stringify(value, null, 2)}</Text>
        <Text variant="muted">The first Apply fails. Try again to see the saved values.</Text>
      </ScrollView>
      <FilterSheet
        open={open}
        onOpenChange={setOpen}
        groups={filterGroups}
        value={value}
        resultCount={42}
        onApply={async (next) => {
          await wait(900)
          attempts.current += 1
          if (attempts.current === 1) throw new Error('Results could not be loaded. Try again.')
          if (mounted.current) {
            setValue(next)
            toast({ title: 'Filters applied' })
          }
        }}
        onReset={async () => {
          await wait(400)
          toast({ title: 'Draft reset', description: 'Apply to save the cleared filters.' })
        }}
      />
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    padding: theme.space[4],
    paddingBottom: rt.insets.bottom + theme.space[4],
    gap: theme.space[4],
  },
}))

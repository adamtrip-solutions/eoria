import { useEffect, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'
import { Toggle, ToggleGroup } from '@/components/ui/toggle-group'

export type FilterOption = { value: string; label: string }
export type FilterGroup =
  | { kind: 'chips'; id: string; title: string; options: FilterOption[]; multiple?: boolean }
  | { kind: 'toggle'; id: string; title: string; options: FilterOption[] }
  | {
      kind: 'range'
      id: string
      title: string
      min: number
      max: number
      step?: number
      format?: (value: number) => string
    }
  | { kind: 'radio'; id: string; title: string; options: FilterOption[] }
  | { kind: 'switch'; id: string; title: string }

/** Range values are upper bounds. An empty string means no single selection. */
export type FilterValues = Record<string, string | string[] | number | boolean | undefined>
export type FilterSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: FilterValues
  onApply: (values: FilterValues) => void | Promise<void>
  /** Notifies the caller of a draft reset. Apply still commits the draft. */
  onReset: () => void | Promise<void>
  groups: FilterGroup[]
  resultCount?: number
}

function defaultsFor(groups: FilterGroup[]): FilterValues {
  return Object.fromEntries(
    groups.map((group) => [
      group.id,
      group.kind === 'switch'
        ? false
        : group.kind === 'range'
          ? group.max
          : group.kind === 'chips' && group.multiple
            ? []
            : '',
    ]),
  )
}

export function FilterSheet({ open, onOpenChange, ...props }: FilterSheetProps) {
  // A new opening gets a new draft. Parent value updates during editing do not erase it.
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent scroll>
        {open ? <FilterDraft {...props} onOpenChange={onOpenChange} /> : null}
      </SheetContent>
    </Sheet>
  )
}

function FilterDraft({
  value,
  onApply,
  onReset,
  groups,
  resultCount,
  onOpenChange,
}: Omit<FilterSheetProps, 'open'>) {
  const [draft, setDraft] = useState<FilterValues>(() => ({ ...defaultsFor(groups), ...value }))
  const [busy, setBusy] = useState<'apply' | 'reset'>()
  const [failure, setFailure] = useState<string>()
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const change = (id: string, next: FilterValues[string]) => {
    if (!pending.current) setDraft((current) => ({ ...current, [id]: next }))
  }
  const run = async (action: 'apply' | 'reset') => {
    if (pending.current) return
    pending.current = true
    setBusy(action)
    setFailure(undefined)
    try {
      if (action === 'apply') {
        await onApply(draft)
        if (mounted.current) onOpenChange(false)
      } else {
        await onReset()
        if (mounted.current) setDraft(defaultsFor(groups))
      }
    } catch (error) {
      if (mounted.current)
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : 'Could not update filters. Try again.',
        )
    } finally {
      pending.current = false
      if (mounted.current) setBusy(undefined)
    }
  }

  return (
    <View style={styles.content}>
      <SheetHeader>
        <SheetTitle>Filters</SheetTitle>
      </SheetHeader>
      {groups.map((group) => {
        const current = draft[group.id]
        return (
          <View key={group.id} style={styles.group}>
            <Text weight="semibold" accessibilityRole="header">
              {group.title}
            </Text>
            {group.kind === 'chips' ? (
              <View style={styles.chips}>
                {group.options.map((option) => {
                  const selected = group.multiple
                    ? Array.isArray(current) && current.includes(option.value)
                    : current === option.value
                  return (
                    <Chip
                      key={option.value}
                      selected={selected}
                      disabled={!!busy}
                      onPress={() =>
                        change(
                          group.id,
                          group.multiple
                            ? selected
                              ? (Array.isArray(current) ? current : []).filter(
                                  (item) => item !== option.value,
                                )
                              : [...(Array.isArray(current) ? current : []), option.value]
                            : selected
                              ? ''
                              : option.value,
                        )
                      }
                    >
                      {option.label}
                    </Chip>
                  )
                })}
              </View>
            ) : group.kind === 'toggle' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ToggleGroup
                  type="single"
                  value={typeof current === 'string' ? current : ''}
                  disabled={!!busy}
                  accessibilityLabel={group.title}
                  onValueChange={(next) => change(group.id, next ?? '')}
                >
                  {group.options.map((option) => (
                    <Toggle key={option.value} value={option.value}>
                      {option.label}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </ScrollView>
            ) : group.kind === 'range' ? (
              <View>
                <Text variant="muted">
                  Up to{' '}
                  {(group.format ?? String)(typeof current === 'number' ? current : group.max)}
                </Text>
                <Slider
                  min={group.min}
                  max={group.max}
                  step={group.step}
                  value={typeof current === 'number' ? current : group.max}
                  disabled={!!busy}
                  accessibilityLabel={`${group.title}, maximum`}
                  onValueChange={(next) => change(group.id, next)}
                />
              </View>
            ) : group.kind === 'radio' ? (
              <RadioGroup
                value={typeof current === 'string' ? current : ''}
                disabled={!!busy}
                accessibilityLabel={group.title}
                onValueChange={(next) => change(group.id, next)}
                style={styles.group}
              >
                {group.options.map((option) => (
                  <View key={option.value} style={styles.radioRow}>
                    <RadioGroupItem value={option.value} accessibilityLabel={option.label} />
                    <Text>{option.label}</Text>
                  </View>
                ))}
              </RadioGroup>
            ) : (
              <Switch
                checked={current === true}
                disabled={!!busy}
                accessibilityLabel={group.title}
                onCheckedChange={(next) => change(group.id, next)}
              />
            )}
          </View>
        )
      })}
      {failure ? (
        <Alert variant="destructive" accessibilityLiveRegion="polite">
          <AlertTitle>Could not update filters</AlertTitle>
          <AlertDescription>{failure}</AlertDescription>
        </Alert>
      ) : null}
      <SheetFooter>
        <Button
          width="full"
          loading={busy === 'apply'}
          disabled={busy === 'reset'}
          onPress={() => void run('apply')}
        >
          {resultCount === undefined
            ? 'Apply'
            : `Show ${resultCount} ${resultCount === 1 ? 'result' : 'results'}`}
        </Button>
        <Button
          variant="ghost"
          width="full"
          loading={busy === 'reset'}
          disabled={busy === 'apply'}
          onPress={() => void run('reset')}
        >
          Reset
        </Button>
      </SheetFooter>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: { gap: theme.space[6] },
  group: { gap: theme.space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    minHeight: theme.control.md,
  },
}))

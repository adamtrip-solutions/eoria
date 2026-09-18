import { cloneElement, isValidElement, useCallback, useState, type ReactElement } from 'react'
import { Platform, Pressable, View, type PressableProps } from 'react-native'
import { useUnistyles } from 'react-native-unistyles'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
} from '@eoria/core'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Text } from '@/components/ui/text'

/**
 * A field that opens the platform date picker. iOS shows the system calendar or wheels in
 * a bottom Dialog with a Done button. Android opens the system dialog. No calendar is drawn
 * in JS, so locale, first day of the week and accessibility come from the OS.
 */
export const datePickerRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Trigger. Mirrors the Input frame. */
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
      minHeight: theme.control.md,
      paddingHorizontal: theme.space[4],
      borderWidth: 1.5,
      borderColor: theme.stroke ? theme.colors.input : 'transparent',
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.muted,
    },
    rootPressed: { opacity: 0.85 },
    value: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    placeholder: { color: theme.colors.mutedForeground },
    /** Slot for a trailing icon. `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 18, height: 18, color: theme.colors.mutedForeground },
    /** Wraps the iOS picker inside the dialog. */
    picker: { alignItems: 'center' },
  },
  variants: {
    size: {
      sm: {
        root: { minHeight: theme.control.sm, paddingHorizontal: theme.space[3] },
        value: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
      },
      md: {},
      lg: {
        root: { minHeight: theme.control.lg, paddingHorizontal: theme.space[5] },
        value: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
      },
    },
    open: {
      true: { root: { borderColor: theme.colors.ring } },
      false: {},
    },
    invalid: {
      true: { root: { borderColor: theme.colors.destructive } },
      false: {},
    },
    disabled: {
      true: { root: { opacity: 0.5 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', open: false, invalid: false, disabled: false },
}))

type DatePickerSlots = 'rootPressed' | 'value' | 'placeholder' | 'icon' | 'picker'
type Mode = 'date' | 'time' | 'datetime'

const defaultFormat = (date: Date, mode: Mode) =>
  mode === 'date'
    ? date.toLocaleDateString(undefined, { dateStyle: 'medium' })
    : mode === 'time'
      ? date.toLocaleTimeString(undefined, { timeStyle: 'short' })
      : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export type DatePickerProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> &
  Pick<RecipeVariants<typeof datePickerRecipe>, 'size'> & {
    value?: Date
    defaultValue?: Date
    onValueChange?: (date: Date) => void
    /** `date`, `time`, or both. Android asks for the date and then the time. Default `date`. */
    mode?: Mode
    minimumDate?: Date
    maximumDate?: Date
    placeholder?: string
    /** Turns the value into the text on the field. Defaults to the device locale. */
    formatValue?: (date: Date) => string
    /** Title of the iOS dialog, also read by screen readers. */
    title?: string
    doneLabel?: string
    /** Any element accepting `size` and `color` props, e.g. a lucide calendar icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<DatePickerSlots>
  }

export function DatePicker({
  value: controlled,
  defaultValue,
  onValueChange,
  mode = 'date',
  minimumDate,
  maximumDate,
  placeholder = mode === 'time' ? 'Select a time' : 'Select a date',
  formatValue,
  title = mode === 'time' ? 'Select a time' : 'Select a date',
  doneLabel = 'Done',
  icon,
  size,
  invalid = false,
  disabled = false,
  styles,
  accessibilityLabel,
  ...rest
}: DatePickerProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ?? uncontrolled
  const [open, setOpen] = useState(false)
  // iOS edits a draft and commits it on Done, so scrolling the wheels does not fire changes.
  const [draft, setDraft] = useState(() => value ?? new Date())
  const { theme, rt } = useUnistyles()
  const s = useRecipe(datePickerRecipe, { size, open, invalid, disabled }, styles)

  const commit = useCallback(
    (next: Date) => {
      if (controlled === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [controlled, onValueChange],
  )

  const show = () => {
    const start = value ?? new Date()
    if (Platform.OS !== 'android') {
      setDraft(start)
      setOpen(true)
      return
    }
    const ask = (step: 'date' | 'time', from: Date) =>
      DateTimePickerAndroid.open({
        value: from,
        mode: step,
        minimumDate,
        maximumDate,
        onValueChange: (_event, picked) => {
          if (mode === 'datetime' && step === 'date') ask('time', picked)
          else commit(picked)
        },
      })
    ask(mode === 'time' ? 'time' : 'date', start)
  }

  const text = value ? (formatValue ?? ((d: Date) => defaultFormat(d, mode)))(value) : undefined
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityValue={{ text: text ?? placeholder }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={show}
        style={({ pressed }) => [s.root, pressed && s.rootPressed]}
        {...rest}
      >
        <Text numberOfLines={1} style={[s.value, text === undefined && s.placeholder]}>
          {text ?? placeholder}
        </Text>
        {isValidElement(icon) &&
          cloneElement(icon, {
            size: getStyleValue(s.icon, 'width') as number | undefined,
            color: getStyleValue(s.icon, 'color') as string | undefined,
          })}
      </Pressable>
      {Platform.OS !== 'android' && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <View style={s.picker}>
              <DateTimePicker
                value={draft}
                mode={mode}
                display={mode === 'date' ? 'inline' : 'spinner'}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant={rt.themeName === 'dark' ? 'dark' : 'light'}
                accentColor={theme.colors.primary}
                textColor={theme.colors.foreground}
                onValueChange={(_event, picked) => setDraft(picked)}
              />
            </View>
            <DialogFooter>
              <Button
                width="full"
                onPress={() => {
                  commit(draft)
                  setOpen(false)
                }}
              >
                {doneLabel}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

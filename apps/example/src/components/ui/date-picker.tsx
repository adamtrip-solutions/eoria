import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from 'react'
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
// The iOS calendar sets its month and weekday labels this far in from its own edge, and pads
// its top and bottom by about as much. Measured on iOS 26.
const CALENDAR_INSET = 12
// The calendar measures itself about 330pt wide, whatever the room. A minimum width is the
// one size it does not override, so this makes it fill the dialog.
const FILL = { minWidth: '100%' } as const

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
    /**
     * Wraps the iOS picker inside the dialog. The wrapper pulls the picker out by the margin
     * it keeps, so its labels line up with the title and the button.
     */
    picker: {
      alignItems: 'center',
      marginHorizontal: -CALENDAR_INSET,
      marginVertical: -theme.space[2],
    },
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
      true: { root: { borderColor: theme.colors.destructiveText } },
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
    /** Whether the picker is showing. Leave it out and the field opens itself on press. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
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
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  // iOS edits a draft and commits it on Done, so scrolling the wheels does not fire changes.
  const [draft, setDraft] = useState(() => value ?? new Date())
  // Every opening starts from the value, whatever the last draft was.
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (open) setDraft(value ?? new Date())
  }
  const { theme, rt } = useUnistyles()
  const s = useRecipe(datePickerRecipe, { size, open, invalid, disabled }, styles)

  const commit = useCallback(
    (next: Date) => {
      if (controlled === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [controlled, onValueChange],
  )

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )

  // Android has no view to render. Opening shows the system dialog, closing takes it down.
  useEffect(() => {
    if (Platform.OS !== 'android' || !open) return
    let showing: 'date' | 'time' = mode === 'time' ? 'time' : 'date'
    const ask = (step: 'date' | 'time', from: Date) => {
      showing = step
      DateTimePickerAndroid.open({
        value: from,
        mode: step,
        minimumDate,
        maximumDate,
        onValueChange: (_event, picked) => {
          if (mode === 'datetime' && step === 'date') return ask('time', picked)
          commit(picked)
          setOpen(false)
        },
        onDismiss: () => setOpen(false),
      })
    }
    ask(showing, value ?? new Date())
    return () => void DateTimePickerAndroid.dismiss(showing)
    // Runs when `open` flips. The dialog keeps the props it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const text = value ? (formatValue ?? ((d: Date) => defaultFormat(d, mode)))(value) : undefined
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityValue={{ text: text ?? placeholder }}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
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
                style={mode === 'date' ? FILL : undefined}
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

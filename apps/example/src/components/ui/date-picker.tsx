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
import DateTimePicker, {
  DateTimePickerAndroid,
  type IOSNativeProps,
} from '@react-native-community/datetimepicker'
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
export type DatePickerMode = 'date' | 'time' | 'datetime'

export type DatePickerNativeOptions = {
  /** BCP 47 tag for the default text and the iOS picker. Android pickers follow the system language. */
  locale?: string
  /** IANA name such as `Europe/Lisbon`. The picker and the default text show the time there. Defaults to the device's zone. */
  timeZoneName?: string
  /**
   * 24-hour time in the Android time dialog and in the default text. iOS has no such switch:
   * its wheels take the clock from `locale`, or from the device without one.
   */
  is24Hour?: boolean
  /** Step of the minute wheel or clock. On iOS it applies to the spinner only. */
  minuteInterval?: 1 | 2 | 3 | 4 | 5 | 6 | 10 | 12 | 15 | 20 | 30
  /** Picker style per platform. Unset keeps the component's choice. */
  display?: {
    ios?: IOSNativeProps['display']
    android?: 'default' | 'spinner'
  }
}

/**
 * The default text for a value: medium date, short time, or both. Honours `locale`,
 * `timeZoneName` and `is24Hour` through `Intl.DateTimeFormat`.
 */
export function formatDateValue(
  date: Date,
  mode: DatePickerMode,
  {
    locale,
    timeZoneName,
    is24Hour,
  }: Pick<DatePickerNativeOptions, 'locale' | 'timeZoneName' | 'is24Hour'> = {},
): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: timeZoneName }
  if (mode !== 'time') options.dateStyle = 'medium'
  if (mode !== 'date') {
    options.timeStyle = 'short'
    if (is24Hour !== undefined) options.hourCycle = is24Hour ? 'h23' : 'h12'
  }
  return new Intl.DateTimeFormat(locale, options).format(date)
}

/**
 * Keeps an instant inside the bounds. Android needs it after the pick: its time dialog takes
 * no bounds and its date dialog limits calendar days, not instants.
 */
export function clampDate(date: Date, minimumDate?: Date, maximumDate?: Date): Date {
  if (minimumDate && date.getTime() < minimumDate.getTime()) return new Date(minimumDate.getTime())
  if (maximumDate && date.getTime() > maximumDate.getTime()) return new Date(maximumDate.getTime())
  return date
}

/**
 * Opens the Android system dialog and returns a function that takes it down. Android has no
 * picker to render inline, so date-time-chips opens it through here too. Only the named
 * options reach the dialog, so it is always the default design with a time zone name, no
 * offset and no neutral button. The picked instant reaches `onPick` clamped to the bounds.
 * A dialog that fails to open, for example with no Activity during a transition, calls
 * `onDismiss`, since nothing is on screen, and then `onError` with the reason. The library
 * also reports an error thrown by `onPick` or `onDismiss` through `onError`. That one reaches
 * `onError` alone, since the dialog has already closed; without `onError` it is swallowed.
 */
export function openAndroidPicker(
  step: 'date' | 'time',
  value: Date,
  {
    minimumDate,
    maximumDate,
    timeZoneName,
    is24Hour,
    minuteInterval,
    display,
    onPick,
    onDismiss,
    onError,
  }: Omit<DatePickerNativeOptions, 'locale'> & {
    minimumDate?: Date
    maximumDate?: Date
    onPick: (date: Date) => void
    onDismiss: () => void
    /** The native open failed, after `onDismiss`, or `onPick` or `onDismiss` threw. */
    onError?: (error: unknown) => void
  },
): () => void {
  // Whether a pick or a dismissal reached the caller. The library sends a failed open and an
  // error thrown by those callbacks to the same `onError`, and only a failed open needs closing.
  let settled = false
  const dismiss = () => {
    settled = true
    onDismiss()
  }
  DateTimePickerAndroid.open({
    value,
    mode: step,
    display: display?.android === 'spinner' ? 'spinner' : 'default',
    minimumDate,
    maximumDate,
    timeZoneName,
    is24Hour,
    minuteInterval,
    onValueChange: (_event, picked) => {
      settled = true
      onPick(clampDate(picked, minimumDate, maximumDate))
    },
    onDismiss: dismiss,
    // No neutral button is set. Should one appear anyway, it closes like a cancel.
    onNeutralButtonPress: dismiss,
    // The library catches a failed open and reports it here only, so without the dismissal
    // the caller would wait for a pick or a dismissal that never comes.
    onError: (error) => {
      if (!settled) dismiss()
      onError?.(error)
    },
  })
  // Rejects with no Activity, when there is no dialog to take down anyway.
  return () => void DateTimePickerAndroid.dismiss(step).catch(() => {})
}

export type DatePickerProps = Omit<PressableProps, 'style' | 'children' | 'disabled'> &
  Pick<RecipeVariants<typeof datePickerRecipe>, 'size'> &
  DatePickerNativeOptions & {
    /** Controlled when the key is present. `undefined` or `null` shows the placeholder. */
    value?: Date | null
    defaultValue?: Date
    onValueChange?: (date: Date) => void
    /** Whether the picker is showing. Leave it out and the field opens itself on press. */
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean) => void
    /** `date`, `time`, or both. Android asks for the date and then the time. Default `date`. */
    mode?: DatePickerMode
    minimumDate?: Date
    maximumDate?: Date
    placeholder?: string
    /** Turns the value into the text on the field. Defaults to `formatDateValue`. */
    formatValue?: (date: Date) => string
    /** Title of the iOS dialog, also read by screen readers. */
    title?: string
    doneLabel?: string
    /** Read out for the iOS dialog's backdrop, which closes it without a change. Default `"Close dialog"`. */
    closeLabel?: string
    /** Any element accepting `size` and `color` props, e.g. a lucide calendar icon. */
    icon?: ReactElement<{ size?: number; color?: string }>
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<DatePickerSlots>
  }

export function DatePicker(props: DatePickerProps) {
  const {
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
    closeLabel,
    icon,
    size,
    invalid = false,
    disabled = false,
    styles,
    accessibilityLabel,
    locale,
    timeZoneName,
    is24Hour,
    minuteInterval,
    display,
    ...rest
  } = props
  // Controlled when the `value` key is present, even if undefined (cleared).
  const isControlled = 'value' in props
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = (isControlled ? controlled : uncontrolled) ?? undefined
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const open = controlledOpen ?? uncontrolledOpen
  // iOS edits a draft and commits it on Done, so scrolling the wheels does not fire changes.
  const [draft, setDraft] = useState(() => value ?? new Date())
  // Every opening starts from the value, whatever the last draft was, and so does every
  // change of the value while open, so Done never commits a value the parent has replaced.
  const [wasOpen, setWasOpen] = useState(open)
  const valueTime = value?.getTime()
  const [seenTime, setSeenTime] = useState(valueTime)
  const valueChanged = !Object.is(seenTime, valueTime)
  if (valueChanged) setSeenTime(valueTime)
  if (wasOpen !== open) setWasOpen(open)
  if (open && (wasOpen !== open || valueChanged)) setDraft(value ?? new Date())
  const { theme, rt } = useUnistyles()
  const s = useRecipe(datePickerRecipe, { size, open, invalid, disabled }, styles)

  const commit = useCallback(
    (picked: Date) => {
      const next = clampDate(picked, minimumDate, maximumDate)
      if (!isControlled) setUncontrolled(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange, minimumDate, maximumDate],
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
    const options = {
      minimumDate,
      maximumDate,
      timeZoneName,
      is24Hour,
      minuteInterval,
      display,
      onDismiss: () => setOpen(false),
    }
    let close = () => {}
    const ask = (step: 'date' | 'time', from: Date) => {
      close = openAndroidPicker(step, from, {
        ...options,
        onPick: (picked) => {
          if (mode === 'datetime' && step === 'date') return ask('time', picked)
          commit(picked)
          setOpen(false)
        },
      })
    }
    ask(mode === 'time' ? 'time' : 'date', value ?? new Date())
    return () => close()
    // Runs when `open` flips. The dialog keeps the props it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const text = value
    ? formatValue
      ? formatValue(value)
      : formatDateValue(value, mode, { locale, timeZoneName, is24Hour })
    : undefined
  const iosDisplay = display?.ios ?? (mode === 'date' ? 'inline' : 'spinner')
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
          <DialogContent closeLabel={closeLabel}>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>
            <View style={s.picker}>
              <DateTimePicker
                themeVariant={rt.themeName === 'dark' ? 'dark' : 'light'}
                accentColor={theme.colors.primary}
                textColor={theme.colors.foreground}
                style={iosDisplay === 'inline' ? FILL : undefined}
                value={draft}
                mode={mode}
                display={iosDisplay}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale={locale}
                timeZoneName={timeZoneName}
                minuteInterval={minuteInterval}
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

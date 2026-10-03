import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Platform, View, type ViewProps } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useUnistyles } from 'react-native-unistyles'
import DateTimePicker from '@react-native-community/datetimepicker'
import { defineSlotRecipe, useRecipe, type SlotOverrides, type SlotStyles } from '@eoria/core'
import { Chip, type ChipProps } from '@/components/ui/chip'
import {
  clampDate,
  formatDateValue,
  openAndroidPicker,
  type DatePickerNativeOptions,
} from '@/components/ui/date-picker'

/**
 * A date and a time as two chips. Pressing one opens its picker beneath them and closes the
 * other: the system calendar for the date and the wheels for the time on iOS, the system
 * dialog on Android, which has no picker to show inline. Changes apply as the user picks;
 * there is no Done step. Content passed as children sits between the chips and the picker.
 *
 * `DateTimeChips` lays the parts out for you. For your own layout, put a
 * `DateTimeChipsTrigger` per section and a `DateTimeChipsPicker` anywhere inside a
 * `DateTimeChipsRoot`.
 */
export const dateTimeChipsRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[3] },
    /** The row holding both chips in `DateTimeChips`. The parts leave the row to you. */
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
    /** Passed to each Chip's `root`. */
    chip: {},
    /** Passed to each Chip's `label`. Tabular digits keep the width steady while the time changes. */
    chipLabel: { fontVariant: ['tabular-nums'] },
    /** Passed to each Chip's `icon`, which reads `width` as the size and `color` as the colour. */
    chipIcon: {},
    /** The date chip's `root`, after `chip`. */
    dateChip: {},
    /** The time chip's `root`, after `chip`. */
    timeChip: {},
    /** The open chip's `root`, `label` and `icon`. Merged last, so it wins over the slots above. */
    chipSelected: {},
    chipLabelSelected: {},
    chipIconSelected: {},
    /** Wraps the iOS picker. */
    picker: { alignItems: 'center' },
  },
  variants: {},
  defaultVariants: {},
}))

type DateTimeChipsSlots =
  | 'chips'
  | 'chip'
  | 'chipLabel'
  | 'chipIcon'
  | 'dateChip'
  | 'timeChip'
  | 'chipSelected'
  | 'chipLabelSelected'
  | 'chipIconSelected'
  | 'picker'
export type DateTimeChipsSection = 'date' | 'time'

// Same motion as collapsible.tsx.
const DURATION = 150
const EASING = Easing.out(Easing.cubic)
// The iOS calendar measures itself about 330pt wide. A minimum width is the one size it does
// not override, so this makes it fill the row, as in date-picker.tsx.
const FILL = { minWidth: '100%' } as const

type Ctx = Pick<ChipProps, 'variant' | 'size'> &
  DatePickerNativeOptions & {
    styles: SlotStyles<DateTimeChipsSlots>
    value: Date
    onValueChange?: (date: Date) => void
    expanded: DateTimeChipsSection | null
    setExpanded: (section: DateTimeChipsSection | null) => void
    minimumDate?: Date
    maximumDate?: Date
    labels: Record<DateTimeChipsSection, string>
    texts: Record<DateTimeChipsSection, string>
    disabled: boolean
  }
const DateTimeChipsContext = createContext<Ctx | null>(null)

function useDateTimeChips(part: string) {
  const ctx = useContext(DateTimeChipsContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <DateTimeChipsRoot>`)
  return ctx
}

export type DateTimeChipsRootProps = Omit<ViewProps, 'children'> &
  Pick<ChipProps, 'variant' | 'size'> &
  DatePickerNativeOptions & {
    value: Date
    onValueChange?: (date: Date) => void
    /** The open picker, or `null` for none. Leave it out and the chips open and close themselves. */
    expanded?: DateTimeChipsSection | null
    defaultExpanded?: DateTimeChipsSection | null
    onExpandedChange?: (section: DateTimeChipsSection | null) => void
    minimumDate?: Date
    maximumDate?: Date
    /** Read out before the date, and the label of its picker. Default `"Date"`. */
    dateLabel?: string
    /** Read out before the time, and the label of its picker. Default `"Time"`. */
    timeLabel?: string
    /** Text of the date chip. Defaults to `formatDateValue` with the same locale, zone and clock. */
    formatDate?: (date: Date) => string
    /** Text of the time chip. Defaults to `formatDateValue` with the same locale, zone and clock. */
    formatTime?: (date: Date) => string
    disabled?: boolean
    /** The triggers, the picker and anything you lay out around them. */
    children?: ReactNode
    styles?: SlotOverrides<DateTimeChipsSlots>
  }

/**
 * Holds the value and the open section, and opens the Android dialog. Renders a View that
 * resizes with a layout transition when the picker opens or closes.
 */
export function DateTimeChipsRoot({
  value,
  onValueChange,
  expanded: controlled,
  defaultExpanded = null,
  onExpandedChange,
  minimumDate,
  maximumDate,
  dateLabel = 'Date',
  timeLabel = 'Time',
  formatDate,
  formatTime,
  variant,
  size,
  disabled = false,
  locale,
  timeZoneName,
  is24Hour,
  minuteInterval,
  display,
  styles,
  style,
  children,
  ...rest
}: DateTimeChipsRootProps) {
  const s = useRecipe(dateTimeChipsRecipe, {}, styles)
  const [uncontrolled, setUncontrolled] = useState(defaultExpanded)
  // `null` is a controlled value too: nothing open.
  const expanded = disabled ? null : controlled !== undefined ? controlled : uncontrolled
  const setExpanded = (next: DateTimeChipsSection | null) => {
    if (controlled === undefined) setUncontrolled(next)
    onExpandedChange?.(next)
  }

  // Android shows the system dialog for the open section and collapses when it closes.
  useEffect(() => {
    if (Platform.OS !== 'android' || !expanded) return
    return openAndroidPicker(expanded, value, {
      minimumDate,
      maximumDate,
      timeZoneName,
      is24Hour,
      minuteInterval,
      display,
      onPick: (picked) => {
        onValueChange?.(picked)
        setExpanded(null)
      },
      onDismiss: () => setExpanded(null),
    })
    // Runs when the open section changes. The dialog keeps the props it was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const options = { locale, timeZoneName, is24Hour }
  const texts = {
    date: formatDate ? formatDate(value) : formatDateValue(value, 'date', options),
    time: formatTime ? formatTime(value) : formatDateValue(value, 'time', options),
  }
  return (
    <DateTimeChipsContext.Provider
      value={{
        styles: s,
        value,
        onValueChange,
        expanded,
        setExpanded,
        minimumDate,
        maximumDate,
        labels: { date: dateLabel, time: timeLabel },
        texts,
        variant,
        size,
        disabled,
        locale,
        timeZoneName,
        is24Hour,
        minuteInterval,
        display,
      }}
    >
      <Animated.View
        layout={LinearTransition.duration(DURATION).easing(EASING)}
        style={[s.root, style]}
        {...rest}
      >
        {children}
      </Animated.View>
    </DateTimeChipsContext.Provider>
  )
}

export type DateTimeChipsTriggerProps = Omit<
  ChipProps,
  'children' | 'value' | 'selected' | 'onDismiss' | 'dismissLabel'
> & {
  /** Which value the chip shows and which picker it opens. */
  section: DateTimeChipsSection
}

/**
 * The chip for one section, a Chip that shows the formatted value and opens or closes its
 * picker. `variant` and `size` default to the root's. `styles` are Chip's own slots, merged
 * after the root's `chip`, `dateChip` and `timeChip` and before its selected slots.
 */
export function DateTimeChipsTrigger({
  section,
  variant,
  size,
  disabled: own,
  styles,
  accessibilityState,
  onPress,
  ...rest
}: DateTimeChipsTriggerProps) {
  const ctx = useDateTimeChips('DateTimeChipsTrigger')
  const { styles: s, expanded, setExpanded } = ctx
  const open = expanded === section
  const text = ctx.texts[section]
  return (
    <Chip
      variant={variant ?? ctx.variant}
      size={size ?? ctx.size}
      selected={open}
      disabled={ctx.disabled || own === true}
      accessibilityLabel={`${ctx.labels[section]}, ${text}`}
      {...rest}
      accessibilityState={{ ...accessibilityState, expanded: open }}
      onPress={(e) => {
        setExpanded(open ? null : section)
        onPress?.(e)
      }}
      styles={{
        ...styles,
        root: [
          s.chip,
          section === 'date' ? s.dateChip : s.timeChip,
          styles?.root,
          open && s.chipSelected,
        ],
        label: [s.chipLabel, styles?.label, open && s.chipLabelSelected],
        icon: [s.chipIcon, styles?.icon, open && s.chipIconSelected],
      }}
    >
      {text}
    </Chip>
  )
}

export type DateTimeChipsPickerProps = Omit<ViewProps, 'children'>

/**
 * The open section's picker on iOS: the calendar for the date, the wheels for the time.
 * Renders nothing while closed, and nothing on Android, where the root opens the dialog.
 */
export function DateTimeChipsPicker({ style, ...rest }: DateTimeChipsPickerProps) {
  const ctx = useDateTimeChips('DateTimeChipsPicker')
  const { theme, rt } = useUnistyles()
  const { expanded, display, minimumDate, maximumDate, onValueChange } = ctx
  if (Platform.OS === 'android' || !expanded) return null
  const iosDisplay = display?.ios ?? (expanded === 'date' ? 'inline' : 'spinner')
  return (
    <Animated.View
      // The calendar and the wheels are different native views.
      key={expanded}
      entering={FadeIn.duration(DURATION)}
      exiting={FadeOut.duration(DURATION / 2)}
      style={[ctx.styles.picker, style]}
      {...rest}
    >
      <DateTimePicker
        themeVariant={rt.themeName === 'dark' ? 'dark' : 'light'}
        accentColor={theme.colors.primary}
        textColor={theme.colors.foreground}
        style={iosDisplay === 'inline' ? FILL : undefined}
        accessibilityLabel={ctx.labels[expanded]}
        value={ctx.value}
        mode={expanded}
        display={iosDisplay}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
        locale={ctx.locale}
        timeZoneName={ctx.timeZoneName}
        minuteInterval={ctx.minuteInterval}
        onValueChange={(_event, picked) =>
          onValueChange?.(clampDate(picked, minimumDate, maximumDate))
        }
      />
    </Animated.View>
  )
}

function DateTimeChipsRow({ children }: { children: ReactNode }) {
  const { styles } = useDateTimeChips('DateTimeChips')
  return <View style={styles.chips}>{children}</View>
}

export type DateTimeChipsProps = Omit<DateTimeChipsRootProps, 'children'> & {
  /** Any element accepting `size` and `color` props, e.g. a lucide calendar icon. */
  dateIcon?: ReactElement<{ size?: number; color?: string }>
  timeIcon?: ReactElement<{ size?: number; color?: string }>
  /** Chip's own slots for both chips, such as `body`. Merged as on `DateTimeChipsTrigger`. */
  chipStyles?: ChipProps['styles']
  /** Shown under the chips, above the open picker. */
  children?: ReactNode
}

/** The chips in a row, then the children, then the picker. */
export function DateTimeChips({
  dateIcon,
  timeIcon,
  chipStyles,
  children,
  ...rest
}: DateTimeChipsProps) {
  return (
    <DateTimeChipsRoot {...rest}>
      <DateTimeChipsRow>
        <DateTimeChipsTrigger section="date" icon={dateIcon} styles={chipStyles} />
        <DateTimeChipsTrigger section="time" icon={timeIcon} styles={chipStyles} />
      </DateTimeChipsRow>
      {children}
      <DateTimeChipsPicker />
    </DateTimeChipsRoot>
  )
}

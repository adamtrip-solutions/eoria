import { useEffect, useState, type ReactElement, type ReactNode } from 'react'
import { Platform, View, type ViewProps } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useUnistyles } from 'react-native-unistyles'
import DateTimePicker from '@react-native-community/datetimepicker'
import { defineSlotRecipe, useRecipe, type SlotOverrides } from '@eoria/core'
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
 */
export const dateTimeChipsRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { gap: theme.space[3] },
    /** The row holding both chips. */
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[2] },
    /** Passed to each Chip's `root`. */
    chip: {},
    /** Passed to each Chip's `label`. Tabular digits keep the width steady while the time changes. */
    chipLabel: { fontVariant: ['tabular-nums'] },
    /** Wraps the iOS picker. */
    picker: { alignItems: 'center' },
  },
  variants: {},
  defaultVariants: {},
}))

type DateTimeChipsSlots = 'chips' | 'chip' | 'chipLabel' | 'picker'
export type DateTimeChipsSection = 'date' | 'time'

// Same motion as collapsible.tsx.
const DURATION = 150
const EASING = Easing.out(Easing.cubic)
// The iOS calendar measures itself about 330pt wide. A minimum width is the one size it does
// not override, so this makes it fill the row, as in date-picker.tsx.
const FILL = { minWidth: '100%' } as const

export type DateTimeChipsProps = Omit<ViewProps, 'children'> &
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
    /** Any element accepting `size` and `color` props, e.g. a lucide calendar icon. */
    dateIcon?: ReactElement<{ size?: number; color?: string }>
    timeIcon?: ReactElement<{ size?: number; color?: string }>
    disabled?: boolean
    /** Shown under the chips, above the open picker. */
    children?: ReactNode
    styles?: SlotOverrides<DateTimeChipsSlots>
  }

export function DateTimeChips({
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
  dateIcon,
  timeIcon,
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
}: DateTimeChipsProps) {
  const s = useRecipe(dateTimeChipsRecipe, {}, styles)
  const { theme, rt } = useUnistyles()
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
  const dateText = formatDate ? formatDate(value) : formatDateValue(value, 'date', options)
  const timeText = formatTime ? formatTime(value) : formatDateValue(value, 'time', options)
  const chip = (
    section: DateTimeChipsSection,
    label: string,
    text: string,
    icon: ChipProps['icon'],
  ) => (
    <Chip
      variant={variant}
      size={size}
      icon={icon}
      selected={expanded === section}
      disabled={disabled}
      accessibilityLabel={`${label}, ${text}`}
      accessibilityState={{ expanded: expanded === section }}
      onPress={() => setExpanded(expanded === section ? null : section)}
      styles={{ root: s.chip, label: s.chipLabel }}
    >
      {text}
    </Chip>
  )

  const iosDisplay = display?.ios ?? (expanded === 'date' ? 'inline' : 'spinner')
  return (
    <Animated.View
      layout={LinearTransition.duration(DURATION).easing(EASING)}
      style={[s.root, style]}
      {...rest}
    >
      <View style={s.chips}>
        {chip('date', dateLabel, dateText, dateIcon)}
        {chip('time', timeLabel, timeText, timeIcon)}
      </View>
      {children}
      {Platform.OS !== 'android' && expanded ? (
        <Animated.View
          // The calendar and the wheels are different native views.
          key={expanded}
          entering={FadeIn.duration(DURATION)}
          exiting={FadeOut.duration(DURATION / 2)}
          style={s.picker}
        >
          <DateTimePicker
            themeVariant={rt.themeName === 'dark' ? 'dark' : 'light'}
            accentColor={theme.colors.primary}
            textColor={theme.colors.foreground}
            style={iosDisplay === 'inline' ? FILL : undefined}
            accessibilityLabel={expanded === 'date' ? dateLabel : timeLabel}
            value={value}
            mode={expanded}
            display={iosDisplay}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            locale={locale}
            timeZoneName={timeZoneName}
            minuteInterval={minuteInterval}
            onValueChange={(_event, picked) =>
              onValueChange?.(clampDate(picked, minimumDate, maximumDate))
            }
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  )
}

import { forwardRef, useImperativeHandle, useRef, useState, type ReactElement } from 'react'
import { View, type TextInput, type ViewProps } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { useUnistyles } from 'react-native-unistyles'
import { Search, X } from 'lucide-react-native'
import { defineSlotRecipe, useRecipe, type SlotOverrides } from '@eoria/core'
import { Button } from '@/components/ui/button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  type InputGroupInputProps,
  type InputGroupProps,
} from '@/components/ui/input-group'

/** The row around the field. The field itself is an InputGroup and keeps that recipe. */
export const searchBarRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { flexDirection: 'row', alignItems: 'center', gap: theme.space[1] },
    /** Wrapper that takes the width Cancel leaves. */
    field: { flex: 1 },
    /** Root of the Cancel button, a small ghost Button with tighter sides. */
    cancel: { paddingHorizontal: theme.space[3] },
    cancelLabel: { color: theme.colors.primary },
  },
  variants: {},
  defaultVariants: {},
}))

type SearchBarSlots = 'field' | 'cancel' | 'cancelLabel'

export type SearchBarProps = Omit<InputGroupInputProps, 'value' | 'defaultValue' | 'style'> &
  Pick<InputGroupProps, 'size' | 'disabled'> & {
    value?: string
    defaultValue?: string
    /** Called with the text when the keyboard's search key is pressed. */
    onSubmit?: (text: string) => void
    /** Called after the clear button empties the field. */
    onClear?: () => void
    /** Show a Cancel text button beside the field while it has focus or text. */
    showCancel?: boolean
    cancelText?: string
    /** Called after Cancel empties the field and drops focus. */
    onCancel?: () => void
    /** Read out for the clear button. */
    clearLabel?: string
    /** Replaces the magnifier. Any element accepting `size` and `color` props. */
    icon?: ReactElement<{ size?: number; color?: string }>
    style?: ViewProps['style']
    styles?: SlotOverrides<SearchBarSlots>
    /** Overrides for the field, which is an InputGroup. */
    fieldStyles?: InputGroupProps['styles']
  }

const DURATION = 150
const EASING = Easing.out(Easing.cubic)
/** Apple's minimum touch target, in points. */
const MIN_TARGET = 44

export const SearchBar = forwardRef<TextInput, SearchBarProps>(function SearchBar(
  {
    value: controlled,
    defaultValue = '',
    onChangeText,
    onSubmit,
    onSubmitEditing,
    onClear,
    showCancel = false,
    cancelText = 'Cancel',
    onCancel,
    clearLabel = 'Clear search',
    icon = <Search />,
    placeholder = 'Search',
    size,
    disabled = false,
    style,
    styles,
    fieldStyles,
    onFocus,
    onBlur,
    ...rest
  },
  ref,
) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const text = controlled ?? uncontrolled
  const setText = (next: string) => {
    if (controlled === undefined) setUncontrolled(next)
    onChangeText?.(next)
  }
  const [focused, setFocused] = useState(false)
  const input = useRef<TextInput>(null)
  useImperativeHandle(ref, () => input.current as TextInput, [])
  const { theme } = useUnistyles()
  const s = useRecipe(searchBarRecipe, {}, styles)
  // Cancel stays while there is text, so a tap that also dismisses the
  // keyboard does not remove the button from under the finger.
  const cancelShown = showCancel && !disabled && (focused || text.length > 0)
  const slop = Math.max(0, Math.ceil((MIN_TARGET - theme.control.sm) / 2))
  return (
    <View style={[s.root, style]}>
      <Animated.View layout={LinearTransition.duration(DURATION).easing(EASING)} style={s.field}>
        <InputGroup size={size} disabled={disabled} styles={fieldStyles}>
          <InputGroupAddon icon={icon} />
          <InputGroupInput
            ref={input}
            accessibilityRole="search"
            accessibilityLabel={placeholder}
            placeholder={placeholder}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            // The clear button below replaces the iOS one.
            clearButtonMode="never"
            {...rest}
            value={text}
            onChangeText={setText}
            onSubmitEditing={(e) => {
              onSubmit?.(text)
              onSubmitEditing?.(e)
            }}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              onBlur?.(e)
            }}
          />
          {text.length > 0 ? (
            <InputGroupAddon align="end">
              <InputGroupButton
                icon={<X />}
                accessibilityLabel={clearLabel}
                onPress={() => {
                  setText('')
                  onClear?.()
                  input.current?.focus()
                }}
              />
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      </Animated.View>
      {cancelShown ? (
        <Animated.View entering={FadeIn.duration(DURATION)} exiting={FadeOut.duration(DURATION)}>
          <Button
            variant="ghost"
            size="sm"
            hitSlop={slop}
            styles={{ root: s.cancel, label: s.cancelLabel }}
            onPress={() => {
              setText('')
              input.current?.blur()
              onCancel?.()
            }}
          >
            {cancelText}
          </Button>
        </Animated.View>
      ) : null}
    </View>
  )
})

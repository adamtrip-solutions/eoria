import { createContext, useContext, useState, type ReactNode } from 'react'
import { Pressable, View, type PressableProps, type ViewProps } from 'react-native'
import { defineSlotRecipe, useRecipe, type RecipeVariants, type SlotOverrides } from '@eoria/core'

export const radioRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.full,
      borderWidth: 1.5,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
    rootPressed: { opacity: 0.8 },
    rootDisabled: { opacity: 0.5 },
  },
  variants: {
    checked: {
      true: {},
      false: { dot: { opacity: 0 } },
    },
    size: {
      sm: { root: { width: 16, height: 16 }, dot: { width: 8, height: 8 } },
      md: {},
    },
  },
  defaultVariants: { checked: false, size: 'md' },
}))

type Ctx = { value: string | undefined; setValue: (value: string) => void; disabled: boolean }
const RadioContext = createContext<Ctx | null>(null)

export type RadioGroupProps = ViewProps & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: ReactNode
}

export function RadioGroup({
  value: controlled,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
  ...rest
}: RadioGroupProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const value = controlled ?? uncontrolled
  const setValue = (next: string) => {
    if (controlled === undefined) setUncontrolled(next)
    onValueChange?.(next)
  }
  return (
    <RadioContext.Provider value={{ value, setValue, disabled }}>
      <View accessibilityRole="radiogroup" accessibilityState={{ disabled }} {...rest}>
        {children}
      </View>
    </RadioContext.Provider>
  )
}

export type RadioGroupItemProps = Omit<PressableProps, 'style' | 'onPress' | 'children'> &
  Pick<RecipeVariants<typeof radioRecipe>, 'size'> & {
    value: string
    disabled?: boolean
    styles?: SlotOverrides<'dot' | 'rootPressed' | 'rootDisabled'>
  }

export function RadioGroupItem({
  value,
  disabled: itemDisabled,
  size,
  styles,
  hitSlop = 8,
  ...rest
}: RadioGroupItemProps) {
  const ctx = useContext(RadioContext)
  if (!ctx) throw new Error('RadioGroupItem must be rendered inside <RadioGroup>')
  const checked = ctx.value === value
  const disabled = itemDisabled || ctx.disabled
  const s = useRecipe(radioRecipe, { checked, size }, styles)
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled: disabled === true }}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={() => ctx.setValue(value)}
      style={({ pressed }) => [s.root, pressed && s.rootPressed, disabled && s.rootDisabled]}
      {...rest}
    >
      <View style={s.dot} />
    </Pressable>
  )
}

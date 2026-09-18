import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotRecipe,
  type SlotStyles,
  type VariantSelection,
} from '@eoria/core'
import { Text } from '@/components/ui/text'

/**
 * Mobile-first button: tall, generous radius, 16pt semibold label, and a
 * press that scales down slightly with a darker fill rather than fading.
 */
export const buttonRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.space[2],
      borderRadius: theme.radius.control,
      overflow: 'hidden',
    },
    label: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    icon: { width: 20, height: 20, color: theme.colors.foreground },
    /** Own View layered over the fill while pressed; `opacity` keeps it visible on any theme. */
    rootPressed: { backgroundColor: theme.colors.foreground, opacity: 0.08 },
    rootDisabled: { opacity: 0.4 },
  },
  variants: {
    variant: {
      default: {
        root: { backgroundColor: theme.colors.primary },
        label: { color: theme.colors.primaryForeground },
        icon: { color: theme.colors.primaryForeground },
        rootPressed: { backgroundColor: theme.colors.primaryForeground, opacity: 0.16 },
      },
      secondary: {
        root: { backgroundColor: theme.colors.muted },
        label: { color: theme.colors.foreground },
        icon: { color: theme.colors.foreground },
      },
      outline: {
        root: { borderWidth: 1.5, borderColor: theme.colors.foreground },
      },
      ghost: {},
      destructive: {
        root: { backgroundColor: theme.colors.destructive },
        label: { color: theme.colors.destructiveForeground },
        icon: { color: theme.colors.destructiveForeground },
        rootPressed: { backgroundColor: theme.colors.destructiveForeground, opacity: 0.16 },
      },
      link: {
        label: { color: theme.colors.primary, textDecorationLine: 'underline' },
        icon: { color: theme.colors.primary },
        rootPressed: { opacity: 0 },
      },
    },
    size: {
      sm: {
        root: { minHeight: theme.control.sm, paddingHorizontal: theme.space[4] },
        label: { fontSize: theme.fontSize.sm, lineHeight: theme.lineHeight.sm },
        icon: { width: 16, height: 16 },
      },
      md: { root: { minHeight: theme.control.md, paddingHorizontal: theme.space[5] } },
      lg: {
        root: { minHeight: theme.control.lg, paddingHorizontal: theme.space[6] },
        label: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
        icon: { width: 22, height: 22 },
      },
      icon: {
        root: {
          minHeight: theme.control.md - 4,
          minWidth: theme.control.md - 4,
          paddingHorizontal: 0,
          borderRadius: theme.radius.full,
        },
      },
    },
    /** `full` stretches to the container, the usual mobile form layout. */
    width: {
      auto: {},
      full: { root: { alignSelf: 'stretch' } },
    },
  },
  // Variant groups merge in declaration order, so `size` would win over
  // `link`'s reset. Compound variants apply last.
  compoundVariants: (['sm', 'md', 'lg', 'icon'] as const).map((size) => ({
    when: { variant: 'link' as const, size },
    styles: { root: { minHeight: 0, minWidth: 0, paddingHorizontal: 0 } },
  })),
  defaultVariants: { variant: 'default', size: 'md', width: 'auto' },
}))

export type ButtonVariants = RecipeVariants<typeof buttonRecipe>

/** Slots every button recipe must provide, besides `root`. */
export type ButtonSlots = 'label' | 'icon' | 'rootPressed' | 'rootDisabled'

export type ButtonBaseProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  iconPosition?: 'left' | 'right'
  /**
   * Work is under way. A spinner takes the icon's place, presses are ignored and screen
   * readers hear "busy". The button keeps its colours, unlike `disabled`.
   */
  loading?: boolean
  /** Per-slot style overrides, merged last. */
  styles?: SlotOverrides<ButtonSlots>
}

export type ButtonProps = ButtonBaseProps & ButtonVariants

const REQUIRED_SLOTS: ReadonlyArray<ButtonSlots> = ['label', 'icon', 'rootPressed', 'rootDisabled']
/** Props the button consumes itself; a recipe cannot use these as variant names. */
const RESERVED_PROPS = [
  'icon',
  'iconPosition',
  'loading',
  'styles',
  'children',
  'disabled',
] as const

const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const PRESS = { duration: 90, easing: Easing.out(Easing.quad) }

/**
 * Builds a button component from any recipe that keeps the button slots.
 * `eoria extend button` uses this so derived buttons share one render body.
 */
export function createButton<S extends string, V>(recipe: SlotRecipe<S, V>) {
  if (isDev) {
    for (const slot of REQUIRED_SLOTS) {
      if (!recipe.slots.includes(slot as never))
        throw new Error(`createButton: recipe is missing slot "${slot}"`)
    }
    for (const name of recipe.variantNames) {
      if ((RESERVED_PROPS as ReadonlyArray<string>).includes(name)) {
        throw new Error(`createButton: "${name}" is a button prop and cannot be a variant name`)
      }
    }
  }

  function RecipeButton(props: ButtonBaseProps & VariantSelection<V>) {
    // Split variant props from everything else before any destructuring so a
    // variant can use any name that is not in RESERVED_PROPS.
    const selection: Record<string, unknown> = {}
    const others: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(props)) {
      if ((recipe.variantNames as ReadonlyArray<string>).includes(key)) selection[key] = value
      else others[key] = value
    }
    const {
      icon,
      iconPosition = 'left',
      loading = false,
      styles,
      children,
      disabled,
      accessibilityState,
      onPressIn,
      onPressOut,
      ...pressableProps
    } = others as ButtonBaseProps

    const s = useRecipe(
      recipe,
      selection as VariantSelection<V>,
      styles as SlotOverrides<S>,
    ) as SlotStyles<ButtonSlots>

    const scale = useSharedValue(1)
    const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

    const iconColor = getStyleValue(s.icon, 'color') as string | undefined
    // The platform spinner, so the most used component pulls in nothing extra.
    const iconNode = loading ? (
      <ActivityIndicator size="small" color={iconColor} />
    ) : isValidElement(icon) ? (
      cloneElement(icon, {
        size: getStyleValue(s.icon, 'width') as number | undefined,
        color: iconColor,
      })
    ) : null

    const label =
      typeof children === 'string' || typeof children === 'number' ? (
        <Text style={s.label}>{children}</Text>
      ) : (
        children
      )

    return (
      <AnimatedPressable
        accessibilityRole="button"
        {...pressableProps}
        accessibilityState={{
          ...accessibilityState,
          busy: loading,
          disabled: disabled === true || loading,
        }}
        disabled={disabled === true || loading}
        onPressIn={(e) => {
          scale.value = withTiming(0.97, PRESS)
          onPressIn?.(e)
        }}
        onPressOut={(e) => {
          scale.value = withTiming(1, PRESS)
          onPressOut?.(e)
        }}
        style={[s.root, press, disabled && s.rootDisabled]}
      >
        {({ pressed }) => (
          <>
            {iconPosition === 'left' ? iconNode : null}
            {label}
            {iconPosition === 'right' ? iconNode : null}
            {pressed ? (
              // Tint layered over the fill, so any variant darkens or lightens consistently.
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.rootPressed]} />
            ) : null}
          </>
        )}
      </AnimatedPressable>
    )
  }

  return RecipeButton
}

export const Button = createButton(buttonRecipe)

import { useMemo } from 'react'
import type { ImageStyle, StyleProp, TextStyle, ViewStyle } from 'react-native'
import { StyleSheet, UnistylesRuntime, useUnistyles } from 'react-native-unistyles'
import type { UnistylesValues } from 'react-native-unistyles'
import type { EoriaTheme } from './theme'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** One slot's style. Any Unistyles value except nested variants. */
export type SlotStyle = Omit<UnistylesValues, 'variants' | 'compoundVariants'>

export type VariantValue = string | boolean

/** `{ variantName: { value: { slot: style } } }` */
export type VariantsSchema<S extends string> = Record<
  string,
  Record<string, Partial<Record<S, SlotStyle>>>
>

export type CompoundVariant<S extends string, V> = {
  when: Partial<{ [K in keyof V]: Extract<keyof V[K], string> | boolean }>
  styles: Partial<Record<S, SlotStyle>>
}

type ValueOf<T> =
  Extract<keyof T, string> extends 'true' | 'false' ? boolean : Extract<keyof T, string>

export type VariantSelection<V> = {
  [K in keyof V]?: ValueOf<V[K]> | undefined
}

export type SlotRecipeConfig<S extends string, V> = {
  slots: { root: SlotStyle } & Record<S, SlotStyle>
  variants?: V
  compoundVariants?: Array<CompoundVariant<S, V>>
  defaultVariants?: VariantSelection<V>
}

export type SlotRecipeExtension<
  BS extends string,
  BV extends VariantsSchema<BS>,
  S extends string,
  V extends VariantsSchema<BS | S>,
> = {
  slots?: Partial<Record<BS | S, SlotStyle>> & Record<S, SlotStyle>
  variants?: V & { [K in keyof BV]?: Record<string, Partial<Record<BS | S, SlotStyle>>> }
  compoundVariants?: Array<CompoundVariant<BS | S, MergeVariants<BV, V>>>
  defaultVariants?: VariantSelection<MergeVariants<BV, V>>
}

export type MergeVariants<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A
    ? K extends keyof B
      ? A[K] & B[K]
      : A[K]
    : K extends keyof B
      ? B[K]
      : never
}

export type RecipeFactory<S extends string, V> = (theme: EoriaTheme) => SlotRecipeConfig<S, V>

/** A plain React Native style, as Unistyles hands it back after resolving theme, breakpoints and variants. */
export type ResolvedStyle = ViewStyle & TextStyle & ImageStyle

/** Resolved styles handed back by `useRecipe`. Arrays appear when call-site overrides are merged in. */
export type SlotStyles<S extends string> = Record<'root' | S, StyleProp<ResolvedStyle>>

/** Call-site overrides. Plain RN styles, merged after the recipe. */
export type SlotOverrides<S extends string> = Partial<
  Record<'root' | S, StyleProp<ResolvedStyle> | undefined>
>

type UnistylesSheet = {
  useVariants: (variants: Record<string, VariantValue | undefined>) => Record<string, ResolvedStyle>
} & Record<string, unknown>

export interface SlotRecipe<S extends string, V> {
  /** Slot names including `root`. */
  readonly slots: ReadonlyArray<'root' | S>
  /** Variant names known to this recipe. */
  readonly variantNames: ReadonlyArray<keyof V & string>
  readonly defaultVariants: VariantSelection<V>
  /**
   * The Unistyles stylesheet, one per recipe. Created on first use, not at
   * import time, so components can be imported before `configureUnistyles`.
   */
  readonly sheet: UnistylesSheet
  /** Raw factory; kept so `extendSlotRecipe` can build on it. */
  readonly factory: RecipeFactory<S, V>
  /** Phantom type carriers. Never set at runtime. */
  readonly __types?: { slots: S; variants: V }
}

export type RecipeVariants<R> = R extends SlotRecipe<string, infer V> ? VariantSelection<V> : never
export type RecipeSlots<R> = R extends SlotRecipe<infer S, unknown> ? 'root' | S : never

// ---------------------------------------------------------------------------
// Unistyles dependency tags (mirrors the enum the babel plugin would inject)
// ---------------------------------------------------------------------------

const DEP_THEME = 0
const DEP_VARIANTS = 4

// ---------------------------------------------------------------------------
// Transform: recipe shape -> Unistyles shape
// ---------------------------------------------------------------------------

type AnyConfig = SlotRecipeConfig<string, VariantsSchema<string>>

/**
 * Turn `{ slots, variants: { name: { value: { slot } } } }` into one Unistyles
 * style per slot, each carrying its own `variants` and `compoundVariants`.
 * Exported for tests; not part of the public API.
 */
export function toUnistylesSheet(config: AnyConfig): Record<string, Record<string, unknown>> {
  const slotNames = Object.keys(config.slots)
  const out: Record<string, Record<string, unknown>> = {}

  for (const slot of slotNames) {
    const variants: Record<string, Record<string, SlotStyle>> = {}
    for (const [variantName, values] of Object.entries(config.variants ?? {})) {
      const perValue: Record<string, SlotStyle> = {}
      for (const [value, slotStyles] of Object.entries(values)) {
        perValue[value] = slotStyles[slot] ?? {}
      }
      variants[variantName] = perValue
    }

    const compoundVariants = (config.compoundVariants ?? [])
      .filter((cv) => cv.styles[slot] !== undefined)
      .map((cv) => ({ ...cv.when, styles: cv.styles[slot] as SlotStyle }))

    out[slot] = {
      ...config.slots[slot],
      variants,
      ...(compoundVariants.length > 0 ? { compoundVariants } : {}),
      uni__dependencies: [DEP_THEME, DEP_VARIANTS],
    }
  }

  return out
}

// ---------------------------------------------------------------------------
// Merge: base config + extension config
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeStyle(a: SlotStyle | undefined, b: SlotStyle | undefined): SlotStyle {
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) }
  for (const [key, value] of Object.entries(b ?? {})) {
    const prev = out[key]
    out[key] = isPlainObject(prev) && isPlainObject(value) ? { ...prev, ...value } : value
  }
  return out as SlotStyle
}

function mergeSlotMap(
  a: Partial<Record<string, SlotStyle>> | undefined,
  b: Partial<Record<string, SlotStyle>> | undefined,
): Partial<Record<string, SlotStyle>> {
  const out: Partial<Record<string, SlotStyle>> = { ...a }
  for (const [slot, style] of Object.entries(b ?? {})) {
    out[slot] = mergeStyle(out[slot], style)
  }
  return out
}

/**
 * Merge rules (fixed by design):
 * - slots: deep-merge per slot; new slots allowed; nothing removed.
 * - variants: deep-merge per variant name, then per value, then per slot.
 * - compoundVariants: base first, then extension (appended).
 * - defaultVariants: extension overrides base per key.
 * Exported for tests; not part of the public API.
 */
export function mergeConfigs(base: AnyConfig, ext: Partial<AnyConfig>): AnyConfig {
  const slots = mergeSlotMap(base.slots, ext.slots) as AnyConfig['slots']

  const variants: VariantsSchema<string> = {}
  const variantNames = new Set([
    ...Object.keys(base.variants ?? {}),
    ...Object.keys(ext.variants ?? {}),
  ])
  for (const name of variantNames) {
    const baseValues = base.variants?.[name] ?? {}
    const extValues = ext.variants?.[name] ?? {}
    const merged: Record<string, Partial<Record<string, SlotStyle>>> = { ...baseValues }
    for (const [value, slotStyles] of Object.entries(extValues)) {
      merged[value] = mergeSlotMap(merged[value], slotStyles)
    }
    variants[name] = merged
  }

  return {
    slots,
    variants,
    compoundVariants: [...(base.compoundVariants ?? []), ...(ext.compoundVariants ?? [])],
    defaultVariants: { ...base.defaultVariants, ...ext.defaultVariants },
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type Meta<S extends string, V> = {
  slots: Array<'root' | S>
  variantNames: Array<keyof V & string>
  defaultVariants: VariantSelection<V>
}

function build<S extends string, V>(factory: RecipeFactory<S, V>): SlotRecipe<S, V> {
  let sheet: UnistylesSheet | undefined
  let meta: Meta<S, V> | undefined

  const readMeta = (config: SlotRecipeConfig<S, V>) => {
    meta = {
      slots: Object.keys(config.slots) as Array<'root' | S>,
      variantNames: Object.keys(config.variants ?? {}) as Array<keyof V & string>,
      defaultVariants: (config.defaultVariants ?? {}) as VariantSelection<V>,
    }
  }

  const init = () => {
    if (sheet) return
    // Native parses eagerly and calls the factory here; web and the Jest mock
    // are lazy, so fall through to a direct call against the active theme.
    sheet = StyleSheet.create((theme) => {
      const config = factory(theme as unknown as EoriaTheme)
      readMeta(config)
      return toUnistylesSheet(config as AnyConfig)
    }) as unknown as UnistylesSheet
    if (!meta) readMeta(factory(UnistylesRuntime.getTheme() as unknown as EoriaTheme))
  }

  const recipe = {
    factory,
    get sheet() {
      init()
      return sheet as UnistylesSheet
    },
    get slots() {
      init()
      return (meta as Meta<S, V>).slots
    },
    get variantNames() {
      init()
      return (meta as Meta<S, V>).variantNames
    },
    get defaultVariants() {
      init()
      return (meta as Meta<S, V>).defaultVariants
    },
  }
  return recipe as SlotRecipe<S, V>
}

export function defineSlotRecipe<S extends string, V extends VariantsSchema<S>>(
  factory: RecipeFactory<S, V>,
): SlotRecipe<S, V> {
  return build(factory)
}

export function extendSlotRecipe<
  BS extends string,
  BV extends VariantsSchema<BS>,
  S extends string = never,
  V extends VariantsSchema<BS | S> = Record<never, never>,
>(
  base: SlotRecipe<BS, BV>,
  extension: (theme: EoriaTheme) => SlotRecipeExtension<BS, BV, S, V>,
): SlotRecipe<BS | S, MergeVariants<BV, V>> {
  const factory = (theme: EoriaTheme) =>
    mergeConfigs(
      base.factory(theme) as unknown as AnyConfig,
      extension(theme) as unknown as Partial<AnyConfig>,
    )
  return build(factory as unknown as RecipeFactory<BS | S, MergeVariants<BV, V>>)
}

/**
 * Pure resolution: apply defaults and ask Unistyles for the variant-bound copy.
 * Exported for tests; `useRecipe` memoises this per theme and selection.
 */
export function bindRecipe<S extends string, V>(
  recipe: SlotRecipe<S, V>,
  selection: VariantSelection<V> = {},
): Record<'root' | S, ResolvedStyle> {
  const merged: Record<string, VariantValue | undefined> = {
    ...(recipe.defaultVariants as Record<string, VariantValue | undefined>),
  }
  for (const [key, value] of Object.entries(
    selection as Record<string, VariantValue | undefined>,
  )) {
    if (value !== undefined) merged[key] = value
  }
  return recipe.sheet.useVariants(merged) as Record<'root' | S, ResolvedStyle>
}

function withOverrides<S extends string>(
  recipe: SlotRecipe<S, unknown>,
  bound: Record<'root' | S, ResolvedStyle>,
  overrides?: SlotOverrides<S>,
): SlotStyles<S> {
  const out = {} as SlotStyles<S>
  for (const slot of recipe.slots) {
    const override = overrides?.[slot]
    out[slot] = override ? [bound[slot], override] : bound[slot]
  }
  return out
}

/** Bind then layer call-site overrides last. Pure; no memoisation. */
export function resolveRecipe<S extends string, V>(
  recipe: SlotRecipe<S, V>,
  selection: VariantSelection<NoInfer<V>> = {},
  overrides?: SlotOverrides<NoInfer<S>>,
): SlotStyles<S> {
  return withOverrides(recipe as SlotRecipe<S, unknown>, bindRecipe(recipe, selection), overrides)
}

export function useRecipe<S extends string, V>(
  recipe: SlotRecipe<S, V>,
  selection: VariantSelection<NoInfer<V>> = {},
  overrides?: SlotOverrides<NoInfer<S>>,
): SlotStyles<S> {
  // Subscribe so values read back in JS (e.g. an icon colour) follow theme
  // and breakpoint changes. Native views update through the shadow tree anyway.
  const { rt } = useUnistyles()
  const sel = selection as Record<string, VariantValue | undefined>
  const key = [
    String(rt.themeName),
    String(rt.breakpoint),
    ...recipe.variantNames.map((name) => `${name}=${String(sel[name])}`),
  ].join('|')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bound = useMemo(() => bindRecipe(recipe, selection), [recipe, key])
  // Overrides are cheap to layer, so they stay outside the memo and never
  // force a native stylesheet rebuild.
  return withOverrides(recipe as SlotRecipe<S, unknown>, bound, overrides)
}

/**
 * Read one value out of a resolved slot style. Works with arrays (last
 * defined wins) and with web, where Unistyles marks values non-enumerable and
 * `StyleSheet.flatten` would return an empty object.
 */
export function getStyleValue<K extends keyof ResolvedStyle>(
  style: StyleProp<ResolvedStyle>,
  key: K,
): ResolvedStyle[K] | undefined {
  if (!style) return undefined
  if (Array.isArray(style)) {
    for (let i = style.length - 1; i >= 0; i -= 1) {
      const value = getStyleValue(style[i] as StyleProp<ResolvedStyle>, key)
      if (value !== undefined) return value
    }
    return undefined
  }
  return (style as ResolvedStyle)[key]
}

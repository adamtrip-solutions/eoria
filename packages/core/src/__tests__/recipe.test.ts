import { UnistylesRuntime } from 'react-native-unistyles'
import {
  configureUnistyles,
  defineSlotRecipe,
  extendSlotRecipe,
  resolveRecipe,
  lightTheme,
  darkTheme,
} from '../index'
import { toUnistylesSheet, mergeConfigs, getStyleValue } from '../recipe'

beforeAll(() => {
  configureUnistyles({ themes: { light: lightTheme, dark: darkTheme } as never })
})

const button = defineSlotRecipe((theme) => ({
  slots: {
    root: { alignItems: 'center', borderRadius: theme.radius.md },
    label: { fontSize: theme.fontSize.md, color: theme.colors.foreground },
  },
  variants: {
    variant: {
      default: {
        root: { backgroundColor: theme.colors.primary },
        label: { color: theme.colors.primaryForeground },
      },
      outline: { root: { borderWidth: 1, borderColor: theme.colors.border } },
    },
    size: {
      sm: { root: { height: 36 } },
      md: { root: { height: 44 } },
    },
  },
  compoundVariants: [
    { when: { variant: 'outline', size: 'sm' }, styles: { root: { borderWidth: 2 } } },
  ],
  defaultVariants: { variant: 'default', size: 'md' },
}))

describe('toUnistylesSheet', () => {
  it('produces one style per slot with variants keyed per slot and dependency tags', () => {
    const sheet = toUnistylesSheet(button.factory(lightTheme) as never)
    expect(Object.keys(sheet)).toEqual(['root', 'label'])
    expect(sheet.root).toMatchObject({
      alignItems: 'center',
      variants: {
        variant: {
          default: { backgroundColor: '#171717' },
          outline: { borderWidth: 1, borderColor: '#e5e5e5' },
        },
        size: { sm: { height: 36 }, md: { height: 44 } },
      },
      compoundVariants: [{ variant: 'outline', size: 'sm', styles: { borderWidth: 2 } }],
      uni__dependencies: [0, 4],
    })
    // label has no size styles, so every size value maps to an empty object
    expect(sheet.label).toMatchObject({ variants: { size: { sm: {}, md: {} } } })
    expect(sheet.label).not.toHaveProperty('compoundVariants')
  })
})

describe('resolveRecipe', () => {
  it('applies defaultVariants when nothing is selected', () => {
    const s = resolveRecipe(button)
    expect(s.root).toMatchObject({ backgroundColor: '#171717', height: 44 })
    expect(s.label).toMatchObject({ color: '#fafafa' })
  })

  it('selection overrides defaults and undefined values are ignored', () => {
    const s = resolveRecipe(button, { variant: 'outline', size: undefined })
    expect(s.root).toMatchObject({ borderWidth: 1, height: 44 })
    expect(s.root).not.toHaveProperty('backgroundColor')
  })

  it('applies compound variants after regular variants', () => {
    const s = resolveRecipe(button, { variant: 'outline', size: 'sm' })
    expect(s.root).toMatchObject({ borderWidth: 2, height: 36 })
  })

  it('merges call-site overrides last as a style array', () => {
    const s = resolveRecipe(button, {}, { root: { height: 99 } })
    expect(Array.isArray(s.root)).toBe(true)
    const [base, override] = s.root as [object, object]
    expect(base).toMatchObject({ height: 44 })
    expect(override).toEqual({ height: 99 })
    expect(s.label).not.toBeInstanceOf(Array)
  })

  it('reads the active theme', () => {
    UnistylesRuntime.setTheme('dark' as never)
    const dark = defineSlotRecipe((theme) => ({
      slots: { root: { backgroundColor: theme.colors.background } },
    }))
    expect(resolveRecipe(dark).root).toMatchObject({ backgroundColor: '#0a0a0a' })
    UnistylesRuntime.setTheme('light' as never)
  })
})

describe('extendSlotRecipe', () => {
  const checkout = extendSlotRecipe(button, (theme) => ({
    slots: { root: { borderRadius: theme.radius.full }, badge: { position: 'absolute' } },
    variants: {
      variant: { brand: { root: { backgroundColor: '#ff00ff' }, label: { color: '#ffffff' } } },
      size: { md: { root: { height: 48 } } },
    },
    compoundVariants: [{ when: { variant: 'brand', size: 'sm' }, styles: { badge: { top: 1 } } }],
    defaultVariants: { variant: 'brand' },
  }))

  it('keeps base slots and variants, adds new ones, and does not touch the base', () => {
    expect(checkout.slots).toEqual(['root', 'label', 'badge'])
    expect(checkout.variantNames).toEqual(['variant', 'size'])
    expect(button.slots).toEqual(['root', 'label'])
    expect(resolveRecipe(button).root).toMatchObject({
      backgroundColor: '#171717',
      borderRadius: 12,
    })
  })

  it('new defaultVariants override base per key, others inherit', () => {
    expect(checkout.defaultVariants).toEqual({ variant: 'brand', size: 'md' })
    const s = resolveRecipe(checkout)
    expect(s.root).toMatchObject({ backgroundColor: '#ff00ff', borderRadius: 9999, height: 48 })
    expect(s.label).toMatchObject({ color: '#ffffff' })
  })

  it('inherited variant values still work and deep-merge with overrides', () => {
    const s = resolveRecipe(checkout, { variant: 'outline', size: 'sm' })
    expect(s.root).toMatchObject({ borderWidth: 2, height: 36, borderRadius: 9999 })
  })

  it('appends compound variants after base ones', () => {
    const s = resolveRecipe(checkout, { variant: 'brand', size: 'sm' })
    expect(s.badge).toMatchObject({ position: 'absolute', top: 1 })
  })

  it('cannot remove inherited slots or variants', () => {
    const merged = mergeConfigs(
      button.factory(lightTheme) as never,
      { slots: {}, variants: {} } as never,
    )
    expect(Object.keys(merged.slots)).toEqual(['root', 'label'])
    expect(Object.keys(merged.variants ?? {})).toEqual(['variant', 'size'])
  })

  it('deep merges nested style objects such as shadowOffset', () => {
    const merged = mergeConfigs({ slots: { root: { shadowOffset: { width: 1, height: 1 } } } }, {
      slots: { root: { shadowOffset: { height: 4 } } },
    } as never)
    expect(merged.slots.root).toEqual({ shadowOffset: { width: 1, height: 4 } })
  })

  it('extends an already extended recipe', () => {
    const deep = extendSlotRecipe(checkout, () => ({
      variants: { variant: { brand: { root: { opacity: 0.5 } } } },
    }))
    const s = resolveRecipe(deep)
    expect(s.root).toMatchObject({ backgroundColor: '#ff00ff', opacity: 0.5, height: 48 })
    expect(deep.slots).toEqual(['root', 'label', 'badge'])
  })
})

describe('runtime edge cases', () => {
  const toggle = defineSlotRecipe(() => ({
    slots: { root: { opacity: 1 } },
    variants: {
      active: { true: { root: { opacity: 0.5 } }, false: { root: { opacity: 0.9 } } },
      tone: { a: { root: { padding: 1 } } },
    },
    compoundVariants: [{ when: { active: true, tone: 'a' }, styles: { root: { margin: 7 } } }],
    defaultVariants: { active: false },
  }))

  it('supports boolean variants, including false as a default', () => {
    expect(resolveRecipe(toggle).root).toMatchObject({ opacity: 0.9 })
    expect(resolveRecipe(toggle, { active: true }).root).toMatchObject({ opacity: 0.5 })
  })

  it('matches compound variants with boolean conditions', () => {
    expect(resolveRecipe(toggle, { active: true, tone: 'a' }).root).toMatchObject({ margin: 7 })
    expect(resolveRecipe(toggle, { active: false, tone: 'a' }).root).not.toHaveProperty('margin')
  })

  it('applies nothing for an unknown variant value, like the native runtime', () => {
    const s = resolveRecipe(button, { variant: 'nope' as never })
    expect(s.root).not.toHaveProperty('backgroundColor')
    expect(s.root).toMatchObject({ height: 44 })
  })

  it('extension can introduce a brand-new variant name', () => {
    const wide = extendSlotRecipe(button, () => ({
      variants: { fullWidth: { true: { root: { alignSelf: 'stretch' } } } },
    }))
    expect(wide.variantNames).toEqual(['variant', 'size', 'fullWidth'])
    expect(resolveRecipe(wide, { fullWidth: true }).root).toMatchObject({
      alignSelf: 'stretch',
      height: 44,
    })
  })

  it('creates the stylesheet lazily and only once', () => {
    const create = jest.spyOn(require('react-native-unistyles').StyleSheet, 'create')
    const lazy = defineSlotRecipe(() => ({ slots: { root: {} } }))
    expect(create).not.toHaveBeenCalled()
    resolveRecipe(lazy)
    resolveRecipe(lazy)
    expect(create).toHaveBeenCalledTimes(1)
    create.mockRestore()
  })

  it('reads values from plain and array styles, last defined wins', () => {
    expect(getStyleValue({ color: 'red' }, 'color')).toBe('red')
    expect(getStyleValue([{ color: 'red' }, { color: 'blue' }], 'color')).toBe('blue')
    expect(getStyleValue([{ color: 'red' }, { padding: 1 }], 'color')).toBe('red')
    expect(getStyleValue([{ color: 'red' }, undefined, false], 'width')).toBeUndefined()
  })
})

/**
 * Type-level assertions. Compiled by `tsc --noEmit`; never executed.
 */
import { defineSlotRecipe, extendSlotRecipe, resolveRecipe, type RecipeVariants } from '../index'

const button = defineSlotRecipe((theme) => ({
  slots: { root: { padding: theme.space[2] }, label: { color: theme.colors.foreground } },
  variants: {
    variant: { default: { root: {} }, outline: { root: {} } },
    size: { sm: { root: {} }, md: { root: {} } },
  },
  defaultVariants: { variant: 'default' },
}))

// valid selection
resolveRecipe(button, { variant: 'outline', size: 'sm' })

// @ts-expect-error unknown variant value
resolveRecipe(button, { variant: 'nope' })

// @ts-expect-error unknown variant name
resolveRecipe(button, { colour: 'outline' })

// @ts-expect-error missing root slot
defineSlotRecipe(() => ({ slots: { label: {} } }))

// @ts-expect-error variant styles can only target declared slots
defineSlotRecipe(() => ({ slots: { root: {} }, variants: { v: { a: { ghost: {} } } } }))

defineSlotRecipe(() => ({
  slots: { root: {} },
  variants: { v: { a: { root: {} } } },
  // @ts-expect-error defaultVariants must reference a declared value
  defaultVariants: { v: 'b' },
}))

const checkout = extendSlotRecipe(button, () => ({
  slots: { badge: { top: 0 } },
  variants: { variant: { brand: { root: {}, badge: {} } } },
  defaultVariants: { variant: 'brand', size: 'md' },
}))

// merged union: inherited and new values both accepted
resolveRecipe(checkout, { variant: 'outline' })
resolveRecipe(checkout, { variant: 'brand', size: 'sm' })

// @ts-expect-error value that exists on neither
resolveRecipe(checkout, { variant: 'nope' })

// new slot appears in the result, base slots remain
const styles = resolveRecipe(checkout)
void styles.root
void styles.label
void styles.badge
// @ts-expect-error unknown slot
void styles.icon

// overrides are typed by slot
resolveRecipe(checkout, {}, { badge: { top: 2 }, root: { padding: 1 } })
// @ts-expect-error unknown slot override
resolveRecipe(checkout, {}, { nope: {} })

// RecipeVariants helper gives props type
type CheckoutVariants = RecipeVariants<typeof checkout>
const ok: CheckoutVariants = { variant: 'brand', size: 'sm' }
// @ts-expect-error unknown value through helper
const bad: CheckoutVariants = { variant: 'x' }
void ok
void bad

export {}

// boolean variants select as booleans
const toggle = defineSlotRecipe(() => ({
  slots: { root: {} },
  variants: { active: { true: { root: {} }, false: { root: {} } } },
}))
resolveRecipe(toggle, { active: true })
// @ts-expect-error string not accepted for a boolean variant
resolveRecipe(toggle, { active: 'true' })

// extension variant styles cannot target an undeclared slot
extendSlotRecipe(button, () => ({
  // @ts-expect-error `ghost` is not a slot of button
  variants: { variant: { brand: { ghost: {} } } },
}))

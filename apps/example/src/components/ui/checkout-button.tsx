// Stand-in for the output of `eoria extend button --name CheckoutButton`.
// Extends the local Button recipe, so edits to button.tsx flow through automatically.
import type { ComponentProps } from 'react'
import { extendSlotRecipe } from '@eoria/core'
import { buttonRecipe, createButton } from '@/components/ui/button'

export const checkoutButtonRecipe = extendSlotRecipe(buttonRecipe, (theme) => ({
  slots: {
    root: { borderRadius: theme.radius.full },
  },
  variants: {
    variant: {
      brand: {
        root: { backgroundColor: '#7c3aed' },
        label: { color: '#ffffff', fontWeight: theme.fontWeight.semibold },
        icon: { color: '#ffffff' },
      },
    },
    size: {
      lg: { root: { height: 56, paddingHorizontal: theme.space[8] } },
    },
  },
  defaultVariants: { variant: 'brand', size: 'lg' },
}))

export const CheckoutButton = createButton(checkoutButtonRecipe)
export type CheckoutButtonProps = ComponentProps<typeof CheckoutButton>

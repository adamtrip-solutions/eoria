import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Pressable, type PressableProps } from 'react-native'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import {
  Popper,
  PopperAnchor,
  PopperContent,
  withPressHandlers,
  type PopperContentProps,
  type PressChildProps,
} from '@/components/ui/popper'
import { Text } from '@/components/ui/text'

export const tooltipRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: {
      maxWidth: 240,
      paddingHorizontal: theme.space[3],
      paddingVertical: theme.space[2],
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.foreground,
    },
    label: {
      fontSize: theme.fontSize.xs,
      lineHeight: theme.lineHeight.xs,
      color: theme.colors.background,
    },
  },
  variants: {},
  defaultVariants: {},
}))

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  styles: SlotStyles<'label'>
  content: string | undefined
  setContent: (c: string | undefined) => void
}
const TooltipContext = createContext<Ctx | null>(null)

function useTooltip(part: string) {
  const ctx = useContext(TooltipContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Tooltip>`)
  return ctx
}

export type TooltipProps = RecipeVariants<typeof tooltipRecipe> & {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  styles?: SlotOverrides<'label'>
  children?: ReactNode
}

/**
 * Shows while the trigger is held (long press to open, release to close).
 * Screen readers do not get hover or long press, so the tooltip text is
 * also set as the trigger's `accessibilityHint` when it is a string.
 */
export function Tooltip({ open: controlled, onOpenChange, styles, children }: TooltipProps) {
  const [uncontrolled, setUncontrolled] = useState(false)
  const [content, setContent] = useState<string | undefined>()
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const s = useRecipe(tooltipRecipe, {}, styles)
  return (
    <TooltipContext.Provider value={{ open, setOpen, styles: s, content, setContent }}>
      <Popper>{children}</Popper>
    </TooltipContext.Provider>
  )
}

export type TooltipTriggerProps = Omit<PressableProps, 'children'> & {
  asChild?: boolean
  children: ReactElement<PressChildProps & { accessibilityHint?: string }> | ReactNode
}

export function TooltipTrigger({ asChild, children, ...rest }: TooltipTriggerProps) {
  const { open, setOpen, content } = useTooltip('TooltipTrigger')
  const handlers: PressChildProps = {
    onLongPress: () => setOpen(true),
    // Only close what a long press opened; a plain tap must not emit onOpenChange(false).
    onPressOut: () => {
      if (open) setOpen(false)
    },
  }
  return (
    <PopperAnchor>
      {asChild && isValidElement<PressChildProps & { accessibilityHint?: string }>(children) ? (
        withPressHandlers(
          children.props.accessibilityHint === undefined && content !== undefined
            ? cloneElement(children, { accessibilityHint: content })
            : children,
          handlers,
        )
      ) : (
        <Pressable accessibilityHint={content} {...handlers} {...rest}>
          {children}
        </Pressable>
      )}
    </PopperAnchor>
  )
}

export type TooltipContentProps = Omit<PopperContentProps, 'onDismiss' | 'modal'> & {
  children: string | ReactNode
}

export function TooltipContent({ side = 'top', style, children, ...rest }: TooltipContentProps) {
  const ctx = useTooltip('TooltipContent')
  const { open, styles, content, setContent } = ctx
  const text = typeof children === 'string' ? children : undefined
  // Share the text with the trigger for its accessibilityHint.
  useEffect(() => {
    if (text !== content) setContent(text)
  }, [text, content, setContent])
  if (!open) return null
  return (
    <PopperContent
      side={side}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.root, style]}
      {...rest}
    >
      {text !== undefined ? <Text style={styles.label}>{text}</Text> : children}
    </PopperContent>
  )
}

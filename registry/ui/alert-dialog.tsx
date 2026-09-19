import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AccessibilityInfo } from 'react-native'
import { extendSlotRecipe, useRecipe } from '@eoria/core'
import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  dialogRecipe,
  type DialogContentProps,
  type DialogProps,
} from '@/components/ui/dialog'
import type { TextProps } from '@/components/ui/text'

/**
 * Centred Dialog with the copy centred too, the way a system alert reads.
 * Edits to the Dialog base flow through.
 */
export const alertDialogRecipe = extendSlotRecipe(dialogRecipe, () => ({
  slots: {
    header: { alignItems: 'center' },
    title: { textAlign: 'center' },
    description: { textAlign: 'center' },
  },
  defaultVariants: { placement: 'center' },
}))

type Ctx = {
  setOpen: (open: boolean) => void
  /** True while an `AlertDialogCancel` is mounted. */
  cancelable: boolean
  registerCancel: () => () => void
}
const AlertDialogContext = createContext<Ctx | null>(null)

function useAlertDialog(part: string) {
  const ctx = useContext(AlertDialogContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <AlertDialog>`)
  return ctx
}

export type AlertDialogProps = Pick<
  DialogProps,
  'open' | 'defaultOpen' | 'onOpenChange' | 'styles'
> & {
  children?: ReactNode
}

/**
 * A Dialog that waits for an answer. The open state lives here, not in Dialog,
 * so the close requests Dialog makes on its own (Android back, overlay tap)
 * pass through `request` and are dropped unless the alert has a Cancel.
 */
export function AlertDialog({
  open: controlled,
  defaultOpen = false,
  onOpenChange,
  styles,
  children,
}: AlertDialogProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen)
  const open = controlled ?? uncontrolled
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [controlled, onOpenChange],
  )
  const [cancelCount, setCancelCount] = useState(0)
  const registerCancel = useCallback(() => {
    setCancelCount((n) => n + 1)
    return () => setCancelCount((n) => n - 1)
  }, [])
  const cancelable = cancelCount > 0
  const s = useRecipe(alertDialogRecipe, {}, styles)
  const request = (next: boolean) => {
    if (next || cancelable) setOpen(next)
  }
  return (
    <AlertDialogContext.Provider value={{ setOpen, cancelable, registerCancel }}>
      <Dialog open={open} onOpenChange={request} placement="center" styles={s}>
        {children}
      </Dialog>
    </AlertDialogContext.Provider>
  )
}

export const AlertDialogTrigger = DialogTrigger

export type AlertDialogContentProps = Omit<DialogContentProps, 'dismissable'>

/**
 * The overlay only closes the alert while a Cancel is mounted. Context does
 * not cross the portal inside `DialogContent`, so it is provided again here.
 */
export function AlertDialogContent({ children, ...rest }: AlertDialogContentProps) {
  const ctx = useAlertDialog('AlertDialogContent')
  return (
    <DialogContent accessibilityRole="alert" dismissable={ctx.cancelable} {...rest}>
      <AlertDialogContext.Provider value={ctx}>{children}</AlertDialogContext.Provider>
    </DialogContent>
  )
}

export const AlertDialogHeader = DialogHeader

export function AlertDialogTitle({ children, ...rest }: TextProps) {
  const text = typeof children === 'string' ? children : undefined
  // The title mounts when the alert opens. iOS reads nothing out for the
  // `alert` role, so announce it.
  useEffect(() => {
    if (text !== undefined) AccessibilityInfo.announceForAccessibility(text)
  }, [text])
  return <DialogTitle {...rest}>{children}</DialogTitle>
}

export const AlertDialogDescription = DialogDescription

export const AlertDialogFooter = DialogFooter

export type AlertDialogActionProps = ButtonProps & {
  /** Close after `onPress`. Default true. Pass false to close it yourself, e.g. once a request settles. */
  closeOnPress?: boolean
}

/** The confirming button. A Button, so `variant="destructive"` is all a delete confirm needs. */
export function AlertDialogAction({
  closeOnPress = true,
  width = 'full',
  onPress,
  ...rest
}: AlertDialogActionProps) {
  const { setOpen } = useAlertDialog('AlertDialogAction')
  return (
    <Button
      width={width}
      onPress={(e) => {
        onPress?.(e)
        if (closeOnPress) setOpen(false)
      }}
      {...rest}
    />
  )
}

/** The way out. While one is mounted, Android back and an overlay tap close the alert as well. */
export function AlertDialogCancel({
  variant = 'ghost',
  width = 'full',
  onPress,
  ...rest
}: ButtonProps) {
  const { setOpen, registerCancel } = useAlertDialog('AlertDialogCancel')
  useEffect(() => registerCancel(), [registerCancel])
  return (
    <Button
      variant={variant}
      width={width}
      onPress={(e) => {
        onPress?.(e)
        setOpen(false)
      }}
      {...rest}
    />
  )
}

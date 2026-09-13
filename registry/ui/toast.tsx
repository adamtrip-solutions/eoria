import { useEffect, useSyncExternalStore } from 'react'
import { AccessibilityInfo, Pressable, View } from 'react-native'
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import {
  defineSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Portal } from '@/components/ui/portal'
import { Text } from '@/components/ui/text'

export const toastRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Viewport: absolutely positioned column that holds the visible toasts. */
    root: {
      position: 'absolute',
      left: theme.space[4],
      right: theme.space[4],
      gap: theme.space[2],
    },
    /** Inverted pill, the way Airbnb and Uber confirm actions. */
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      paddingVertical: theme.space[3],
      paddingHorizontal: theme.space[4],
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.foreground,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    body: { flex: 1, gap: 2 },
    title: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.background,
    },
    description: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.background,
      opacity: 0.7,
    },
    action: {
      paddingHorizontal: theme.space[3],
      minHeight: 36,
      justifyContent: 'center',
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.background,
    },
    actionLabel: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      fontWeight: theme.fontWeight.semibold,
      color: theme.colors.foreground,
    },
  },
  variants: {
    variant: {
      default: {},
      destructive: {
        toast: { backgroundColor: theme.colors.destructive },
        title: { color: theme.colors.destructiveForeground },
        description: { color: theme.colors.destructiveForeground, opacity: 1 },
        action: { backgroundColor: theme.colors.destructiveForeground },
        actionLabel: { color: theme.colors.destructive },
      },
    },
    placement: {
      top: { root: { top: 0 } },
      bottom: { root: { bottom: 0 } },
    },
  },
  defaultVariants: { variant: 'default', placement: 'bottom' },
}))

type ToastSlots = 'toast' | 'body' | 'title' | 'description' | 'action' | 'actionLabel'
type ToastVariant = NonNullable<RecipeVariants<typeof toastRecipe>['variant']>
export type ToastPlacement = NonNullable<RecipeVariants<typeof toastRecipe>['placement']>

export type ToastOptions = {
  title: string
  description?: string
  variant?: ToastVariant
  /** Screen edge for this toast. Defaults to the Toaster's `placement`. */
  placement?: ToastPlacement
  /** Milliseconds before auto-dismiss. `Infinity` keeps it until dismissed. Default 4000. */
  duration?: number
  action?: { label: string; onPress: () => void }
}
type ToastRecord = ToastOptions & { id: number }

// Module store, so `toast()` can be called from anywhere, including outside
// React. Timers and the visible cap live here too, so a toast's lifetime does
// not depend on whether a Toaster is mounted or has room for it.
let records: ReadonlyArray<ToastRecord> = []
let nextId = 1
let maxVisible = 3
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => records

function dismiss(id?: number) {
  const gone = id === undefined ? records : records.filter((t) => t.id === id)
  for (const t of gone) {
    clearTimeout(timers.get(t.id))
    timers.delete(t.id)
  }
  records = id === undefined ? [] : records.filter((t) => t.id !== id)
  emit()
}

/** Show a toast. Returns its id for `toast.dismiss(id)`. */
export function toast(options: ToastOptions): number {
  const id = nextId++
  const { duration = 4000 } = options
  records = [...records, { ...options, id }]
  // Drop the oldest beyond the cap instead of hiding them, so they never resurface.
  while (records.length > maxVisible) {
    const oldest = records[0]
    if (!oldest) break
    clearTimeout(timers.get(oldest.id))
    timers.delete(oldest.id)
    records = records.slice(1)
  }
  if (Number.isFinite(duration))
    timers.set(
      id,
      setTimeout(() => dismiss(id), duration),
    )
  emit()
  return id
}
toast.dismiss = dismiss

const DURATION = 120

function ToastItem({ record, styles }: { record: ToastRecord; styles: SlotStyles<ToastSlots> }) {
  const { id, title, description, action } = record
  // Live regions are Android-only and do not fire on mount, so announce explicitly.
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(description ? `${title}. ${description}` : title)
  }, [title, description])
  return (
    <Animated.View
      entering={FadeIn.duration(DURATION)}
      exiting={FadeOut.duration(DURATION)}
      layout={LinearTransition.duration(DURATION).easing(Easing.out(Easing.quad))}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.toast}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Dismisses this notification"
        onPress={() => dismiss(id)}
        style={styles.body}
      >
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </Pressable>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            action.onPress()
            dismiss(id)
          }}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  )
}

export type ToasterProps = {
  /** Default edge for toasts that do not set their own. Default bottom. */
  placement?: ToastPlacement
  /** Distance from each edge, typically the safe-area insets. */
  offset?: number | { top?: number; bottom?: number }
  /** Newest toasts push the oldest out beyond this count. Default 3. */
  max?: number
  styles?: SlotOverrides<ToastSlots>
}

/**
 * Mount once, after `<PortalHost />`. Renders through the portal so toasts sit
 * above dialogs opened before them. Per-toast variant styles are resolved by
 * one recipe call per variant so the store stays free of React state.
 */
export function Toaster({ placement = 'bottom', offset = 0, max = 3, styles }: ToasterProps) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const top = useRecipe(toastRecipe, { placement: 'top', variant: 'default' }, styles)
  const topDestructive = useRecipe(
    toastRecipe,
    { placement: 'top', variant: 'destructive' },
    styles,
  )
  const bottom = useRecipe(toastRecipe, { placement: 'bottom', variant: 'default' }, styles)
  const bottomDestructive = useRecipe(
    toastRecipe,
    { placement: 'bottom', variant: 'destructive' },
    styles,
  )
  useEffect(() => {
    maxVisible = max
  }, [max])
  if (all.length === 0) return null
  const insets = typeof offset === 'number' ? { top: offset, bottom: offset } : offset
  const at = (edge: ToastPlacement) => all.filter((t) => (t.placement ?? placement) === edge)
  // Newest nearest the screen edge for both placements.
  const topToasts = at('top').reverse()
  const bottomToasts = at('bottom')
  return (
    <Portal>
      {topToasts.length > 0 ? (
        <View pointerEvents="box-none" style={[top.root, { top: insets.top ?? 0 }]}>
          {topToasts.map((t) => (
            <ToastItem
              key={t.id}
              record={t}
              styles={t.variant === 'destructive' ? topDestructive : top}
            />
          ))}
        </View>
      ) : null}
      {bottomToasts.length > 0 ? (
        <View pointerEvents="box-none" style={[bottom.root, { bottom: insets.bottom ?? 0 }]}>
          {bottomToasts.map((t) => (
            <ToastItem
              key={t.id}
              record={t}
              styles={t.variant === 'destructive' ? bottomDestructive : bottom}
            />
          ))}
        </View>
      ) : null}
    </Portal>
  )
}

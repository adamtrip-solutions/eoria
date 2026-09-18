import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/**
 * Haptic feedback by intent. Not a component: call `haptic()` in a handler, or wrap a
 * handler with `withHaptic()`. Kept out of Button and Switch so that they do not pull
 * expo-haptics into apps that never vibrate.
 */
export type HapticKind =
  'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'

let enabled = true

/** Turn every `haptic()` call into a no-op, for a user setting. */
export function setHapticsEnabled(next: boolean) {
  enabled = next
}

const impact = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
} as const

const notification = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const

/**
 * `selection` for a value that changed (a chip, a stepper tick), an impact for a press that
 * did something, a notification for the result of an action. Never throws and never waits.
 */
export function haptic(kind: HapticKind = 'selection') {
  if (!enabled || Platform.OS === 'web') return
  const run =
    kind === 'selection'
      ? Haptics.selectionAsync()
      : kind in impact
        ? Haptics.impactAsync(impact[kind as keyof typeof impact])
        : Haptics.notificationAsync(notification[kind as keyof typeof notification])
  // A device without a Taptic Engine, or low power mode, rejects. Nothing to do about it.
  run.catch(() => {})
}

/** `onPress={withHaptic('light', save)}` fires the haptic, then the handler. */
export function withHaptic<A extends unknown[]>(kind: HapticKind, handler?: (...args: A) => void) {
  return (...args: A) => {
    haptic(kind)
    handler?.(...args)
  }
}

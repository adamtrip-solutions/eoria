import { useSyncExternalStore } from 'react'
import { UnistylesRuntime } from 'react-native-unistyles'
import { colorPresets, type ColorPresetName } from '@eoria/core'

/**
 * Appearance store for the example app. Presets swap the colour palette of
 * both registered themes in place, so adaptive light/dark keeps working and
 * no component re-mounts.
 */
export type Mode = 'system' | 'light' | 'dark'

let preset: ColorPresetName = 'zinc'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const presetNames = Object.keys(colorPresets) as ColorPresetName[]

export function applyPreset(name: ColorPresetName) {
  preset = name
  const colors = colorPresets[name]
  UnistylesRuntime.updateTheme('light', (t) => ({ ...t, colors: colors.light }))
  UnistylesRuntime.updateTheme('dark', (t) => ({ ...t, colors: colors.dark }))
  emit()
}

export function usePreset() {
  return useSyncExternalStore(
    subscribe,
    () => preset,
    () => preset,
  )
}

export function setMode(mode: Mode) {
  if (mode === 'system') {
    UnistylesRuntime.setAdaptiveThemes(true)
    return
  }
  // Manual theme selection requires adaptive themes off.
  if (UnistylesRuntime.hasAdaptiveThemes) UnistylesRuntime.setAdaptiveThemes(false)
  UnistylesRuntime.setTheme(mode)
}

import { useSyncExternalStore } from 'react'
import { UnistylesRuntime } from 'react-native-unistyles'
import { createThemes, presets, type PresetName } from '@eoria/core'

/**
 * Appearance store for the example app. Presets swap colours, radii and weights
 * of both registered themes in place, so adaptive light/dark keeps working and
 * no component re-mounts.
 */
export type Mode = 'system' | 'light' | 'dark'

let preset: PresetName = 'zinc'
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const presetNames = Object.keys(presets) as PresetName[]

export function applyPreset(name: PresetName) {
  preset = name
  const themes = createThemes(presets[name])
  UnistylesRuntime.updateTheme('light', (t) => ({ ...t, ...themes.light }))
  UnistylesRuntime.updateTheme('dark', (t) => ({ ...t, ...themes.dark }))
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

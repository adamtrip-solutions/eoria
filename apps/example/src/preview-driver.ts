import { useEffect } from 'react'
import { useRouter, type Href } from 'expo-router'
import { presets, type PresetName } from '@eoria/core'
import { applyPreset } from '@/theme'

const ENDPOINT = 'http://localhost:8765/'

/**
 * Dev-only. apps/docs/scripts/capture-previews.mjs runs a tiny HTTP server that
 * names the preview to show and the preset to show it in; the app polls it and navigates.
 * Deep links would do the same job but the simulator asks "Open in app?" on every one.
 */
export function usePreviewDriver() {
  const router = useRouter()
  useEffect(() => {
    if (!__DEV__) return
    let last = ''
    let stopped = false
    const tick = async () => {
      try {
        const res = await fetch(ENDPOINT)
        const { name, seq, preset } = (await res.json()) as {
          name: string
          seq: number
          preset?: string
        }
        const key = `${seq}:${name}`
        if (name && key !== last) {
          last = key
          if (preset && preset in presets) applyPreset(preset as PresetName)
          // Names with a slash are app routes (showcase screens); the rest are component previews.
          router.replace((name.includes('/') ? `/${name}` : `/preview/${name}`) as Href)
        }
      } catch {
        // No driver running. Poll again later.
      }
      if (!stopped) timer = setTimeout(tick, 600)
    }
    let timer = setTimeout(tick, 600)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [router])
}

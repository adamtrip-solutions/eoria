import { useEffect } from 'react'
import { useRouter } from 'expo-router'

const ENDPOINT = 'http://localhost:8765/'

/**
 * Dev-only. apps/docs/scripts/capture-previews.mjs runs a tiny HTTP server that
 * names the preview to show; the app polls it and navigates. Deep links would do
 * the same job but the simulator asks "Open in app?" on every one.
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
        const { name, seq } = (await res.json()) as { name: string; seq: number }
        const key = `${seq}:${name}`
        if (name && key !== last) {
          last = key
          router.replace(`/preview/${name}`)
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

import { useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

/**
 * Minimal portal. Mount one <PortalHost /> as the last child of your root
 * layout; <Portal> then renders its children there, above everything else.
 * No native Modal, so it works the same on every platform.
 *
 * React context does not cross the portal by itself. Components that need
 * it must re-provide it inside `children` (see Dialog).
 */

type Entry = { key: string; node: ReactNode; modal: boolean }
let entries: ReadonlyArray<Entry> = []
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getSnapshot = () => entries

function upsert(entry: Entry) {
  const idx = entries.findIndex((e) => e.key === entry.key)
  entries = idx === -1 ? [...entries, entry] : entries.map((e) => (e.key === entry.key ? entry : e))
  emit()
}

function remove(key: string) {
  entries = entries.filter((e) => e.key !== key)
  emit()
}

// Window position of the host, so anchored content can convert
// `measureInWindow` coordinates into host coordinates.
let hostOffset = { x: 0, y: 0 }
/** Window offset of the mounted `<PortalHost />`. `{0,0}` when it fills the window. */
export const getPortalHostOffset = () => hostOffset

export function PortalHost() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const ref = useRef<View>(null)
  // The host is a sibling of the app tree, so marking it modal makes VoiceOver
  // ignore everything behind it. Android has no equivalent.
  const modal = items.some((e) => e.modal)
  return (
    <View
      ref={ref}
      collapsable={false}
      pointerEvents="box-none"
      accessibilityViewIsModal={modal}
      onLayout={() => {
        ref.current?.measureInWindow((x, y) => {
          hostOffset = { x, y }
        })
      }}
      style={StyleSheet.absoluteFill}
    >
      {items.map((e) => (
        <View key={e.key} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {e.node}
        </View>
      ))}
    </View>
  )
}

export type PortalProps = {
  children: ReactNode
  /** Hide the rest of the app from screen readers while mounted (iOS). */
  modal?: boolean
}

export function Portal({ children, modal = false }: PortalProps) {
  const key = useId()
  useEffect(() => {
    upsert({ key, node: children, modal })
  })
  useEffect(() => () => remove(key), [key])
  return null
}

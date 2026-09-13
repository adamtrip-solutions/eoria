import { forwardRef } from 'react'
import { View, type ViewProps } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import type { RadiusKey, EoriaColors, SpaceKey } from '@eoria/core'

type ColorKey = keyof EoriaColors

/** Token props. Each maps to one style key resolved from the theme. */
export type BoxTokenProps = {
  p?: SpaceKey
  px?: SpaceKey
  py?: SpaceKey
  pt?: SpaceKey
  pb?: SpaceKey
  pl?: SpaceKey
  pr?: SpaceKey
  m?: SpaceKey
  mx?: SpaceKey
  my?: SpaceKey
  mt?: SpaceKey
  mb?: SpaceKey
  ml?: SpaceKey
  mr?: SpaceKey
  gap?: SpaceKey
  bg?: ColorKey
  borderColor?: ColorKey
  borderWidth?: number
  rounded?: RadiusKey
  flex?: number
  row?: boolean
  center?: boolean
}

export type BoxProps = ViewProps & BoxTokenProps

const TOKEN_KEYS: ReadonlyArray<keyof BoxTokenProps> = [
  'p',
  'px',
  'py',
  'pt',
  'pb',
  'pl',
  'pr',
  'm',
  'mx',
  'my',
  'mt',
  'mb',
  'ml',
  'mr',
  'gap',
  'bg',
  'borderColor',
  'borderWidth',
  'rounded',
  'flex',
  'row',
  'center',
]

/** Splits token props from the rest. Exported so Stack can reuse it. */
export function splitBoxProps<P extends BoxTokenProps>(
  props: P,
): [BoxTokenProps, Omit<P, keyof BoxTokenProps>] {
  const tokens: Record<string, unknown> = {}
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    if ((TOKEN_KEYS as ReadonlyArray<string>).includes(key)) tokens[key] = value
    else rest[key] = value
  }
  return [tokens as BoxTokenProps, rest as Omit<P, keyof BoxTokenProps>]
}

/**
 * View with theme token props. `p="4"` reads `theme.space[4]`, `bg="muted"`
 * reads `theme.colors.muted`. Resolution happens inside Unistyles, so theme
 * changes do not re-render.
 */
export const Box = forwardRef<View, BoxProps>(function Box(props, ref) {
  const [tokens, { style, ...rest }] = splitBoxProps(props)
  return <View ref={ref} style={[styles.box(tokens), style]} {...rest} />
})

export const styles = StyleSheet.create((theme) => ({
  box: (t: BoxTokenProps) => ({
    ...(t.p !== undefined && { padding: theme.space[t.p] }),
    ...(t.px !== undefined && { paddingHorizontal: theme.space[t.px] }),
    ...(t.py !== undefined && { paddingVertical: theme.space[t.py] }),
    ...(t.pt !== undefined && { paddingTop: theme.space[t.pt] }),
    ...(t.pb !== undefined && { paddingBottom: theme.space[t.pb] }),
    ...(t.pl !== undefined && { paddingLeft: theme.space[t.pl] }),
    ...(t.pr !== undefined && { paddingRight: theme.space[t.pr] }),
    ...(t.m !== undefined && { margin: theme.space[t.m] }),
    ...(t.mx !== undefined && { marginHorizontal: theme.space[t.mx] }),
    ...(t.my !== undefined && { marginVertical: theme.space[t.my] }),
    ...(t.mt !== undefined && { marginTop: theme.space[t.mt] }),
    ...(t.mb !== undefined && { marginBottom: theme.space[t.mb] }),
    ...(t.ml !== undefined && { marginLeft: theme.space[t.ml] }),
    ...(t.mr !== undefined && { marginRight: theme.space[t.mr] }),
    ...(t.gap !== undefined && { gap: theme.space[t.gap] }),
    ...(t.bg !== undefined && { backgroundColor: theme.colors[t.bg] }),
    ...(t.borderColor !== undefined && { borderColor: theme.colors[t.borderColor] }),
    ...(t.borderWidth !== undefined && { borderWidth: t.borderWidth }),
    ...(t.rounded !== undefined && { borderRadius: theme.radius[t.rounded] }),
    ...(t.flex !== undefined && { flex: t.flex }),
    ...(t.row && { flexDirection: 'row' as const }),
    ...(t.center && { alignItems: 'center' as const, justifyContent: 'center' as const }),
  }),
}))

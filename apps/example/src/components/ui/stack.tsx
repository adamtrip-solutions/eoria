import { forwardRef } from 'react'
import { View, type FlexAlignType, type ViewProps, type ViewStyle } from 'react-native'
import { Box, type BoxProps } from '@/components/ui/box'

export type StackProps = Omit<BoxProps, 'row' | 'center'> & {
  direction?: 'row' | 'column'
  align?: FlexAlignType
  justify?: ViewStyle['justifyContent']
  wrap?: boolean
  reverse?: boolean
}

/** Box with a flex direction and alignment shorthands. Defaults to a column. */
export const Stack = forwardRef<View, StackProps>(function Stack(
  { direction = 'column', align, justify, wrap, reverse, style, ...rest },
  ref,
) {
  // Only emit keys that are set: an explicit `undefined` would override Box tokens.
  const layout: ViewStyle = {
    flexDirection: `${direction}${reverse ? '-reverse' : ''}` as ViewStyle['flexDirection'],
  }
  if (align) layout.alignItems = align
  if (justify) layout.justifyContent = justify
  if (wrap) layout.flexWrap = 'wrap'
  return <Box ref={ref} style={[layout, style]} {...rest} />
})

export const HStack = forwardRef<View, Omit<StackProps, 'direction'>>(function HStack(props, ref) {
  return <Stack ref={ref} direction="row" align="center" {...props} />
})

export const VStack = forwardRef<View, Omit<StackProps, 'direction'>>(function VStack(props, ref) {
  return <Stack ref={ref} direction="column" {...props} />
})

export type { ViewProps }

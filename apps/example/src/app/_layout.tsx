import '@/unistyles'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUnistyles } from 'react-native-unistyles'
import { PortalHost } from '@/components/ui/portal'
import { Toaster } from '@/components/ui/toast'
import { usePreviewDriver } from '@/preview-driver'

const screens = [
  ['index', 'eoria'],
  ['text', 'Text'],
  ['button', 'Button'],
  ['layout', 'Box & Stack'],
  ['input', 'Input & Label'],
  ['card', 'Card'],
  ['selection', 'Checkbox, Switch, Radio'],
  ['dialog', 'Dialog'],
  ['tabs', 'Tabs'],
  ['feedback', 'Badge, Separator, Progress, Skeleton, Avatar'],
  ['form', 'Field & Textarea'],
  ['accordion', 'Accordion'],
  ['toast', 'Toast'],
  ['overlays', 'Popover, Tooltip, Menu, Select'],
  ['showcase/login', 'Sign in'],
  ['showcase/checkout', 'Checkout'],
  ['showcase/profile', 'Profile'],
  ['showcase/settings', 'Settings'],
] as const

export default function RootLayout() {
  const { theme, rt } = useUnistyles()
  const insets = useSafeAreaInsets()
  usePreviewDriver()
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={rt.themeName === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.foreground,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {screens.map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={{ title }} />
        ))}
      </Stack>
      <PortalHost />
      <Toaster
        offset={{ top: insets.top + theme.space[2], bottom: insets.bottom + theme.space[4] }}
      />
    </GestureHandlerRootView>
  )
}

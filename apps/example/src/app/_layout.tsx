import '@/unistyles'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUnistyles } from 'react-native-unistyles'
import { PortalHost } from '@/components/ui/portal'
import { Toaster } from '@/components/ui/toast'
import { usePresetFonts } from '@/fonts'
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
  ['actions', 'Alert dialog, Action sheet, Search, Chip'],
  ['lists', 'Item, Swipeable, Stepper, Rating, Carousel'],
  ['native', 'Sheet, Date picker, Image, Keyboard, Haptics'],
  ['showcase/wallet', 'Wallet'],
  ['showcase/home', 'Home'],
  ['showcase/delivery', 'Your order'],
  ['showcase/login', 'Sign in'],
  ['showcase/checkout', 'Checkout'],
  ['showcase/profile', 'Profile'],
  ['showcase/settings', 'Settings'],
] as const

export default function RootLayout() {
  const { theme, rt } = useUnistyles()
  const insets = useSafeAreaInsets()
  usePreviewDriver()
  const fontsReady = usePresetFonts()
  if (!fontsReady) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Sheet needs the modal provider inside the gesture root. The keyboard helpers need theirs. */}
      <KeyboardProvider>
        <BottomSheetModalProvider>
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
        </BottomSheetModalProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

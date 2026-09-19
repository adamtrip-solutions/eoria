import { Link, router, type Href } from 'expo-router'
import { Pressable, View } from 'react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { presets } from '@eoria/core'
import { Screen, Section } from '@/components/screen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { HStack, VStack } from '@/components/ui/stack'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { applyPreset, presetNames, setMode, usePreset, type Mode } from '@/theme'

const showcase: Array<{ href: Href; title: string; description: string; tag: string }> = [
  {
    href: '/showcase/wallet',
    title: 'Wallet',
    description:
      'Balance on a primary card, budgets with Progress, transactions in a bottom sheet.',
    tag: 'App',
  },
  {
    href: '/showcase/home',
    title: 'Home',
    description: 'Room chips, a climate Slider, device tiles with Switch and scene buttons.',
    tag: 'App',
  },
  {
    href: '/showcase/delivery',
    title: 'Your order',
    description: 'Stepped Progress rail, courier card, Alert, Accordion and a tip sheet.',
    tag: 'App',
  },
  {
    href: '/showcase/login',
    title: 'Sign in',
    description: 'Field, Input, Checkbox, Separator and a validated submit.',
    tag: 'Form',
  },
  {
    href: '/showcase/checkout',
    title: 'Checkout',
    description: 'RadioGroup, Select, Switch, Accordion summary and a confirm Dialog.',
    tag: 'Form',
  },
  {
    href: '/showcase/profile',
    title: 'Profile',
    description: 'Avatar, Badge, Tabs, Progress, Skeleton loading and a DropdownMenu.',
    tag: 'Screen',
  },
  {
    href: '/showcase/settings',
    title: 'Settings',
    description: 'Switch rows, Select, theme preset picker and a destructive Dialog.',
    tag: 'Screen',
  },
]

const components: Array<{ href: Href; title: string }> = [
  { href: '/text', title: 'Text' },
  { href: '/button', title: 'Button' },
  { href: '/layout', title: 'Box & Stack' },
  { href: '/input', title: 'Input & Label' },
  { href: '/card', title: 'Card' },
  { href: '/selection', title: 'Checkbox, Switch, Radio' },
  { href: '/dialog', title: 'Dialog' },
  { href: '/tabs', title: 'Tabs' },
  { href: '/feedback', title: 'Badge, Alert, Spinner, Progress, Skeleton, Avatar' },
  { href: '/form', title: 'Field, Textarea, InputOTP, Slider' },
  { href: '/accordion', title: 'Accordion' },
  { href: '/toast', title: 'Toast' },
  { href: '/overlays', title: 'Popover, Tooltip, Menu, Select, Combobox' },
  { href: '/actions', title: 'Alert dialog, Action sheet, Input group, Search, Chip, Empty' },
  {
    href: '/lists',
    title: 'Item, Swipeable, Collapsible, Toggle group, Stepper, Rating, Carousel',
  },
  { href: '/native', title: 'Sheet, Date picker, Image, Keyboard, Haptics' },
]

function ModePicker() {
  const { rt } = useUnistyles()
  const mode: Mode = rt.hasAdaptiveThemes ? 'system' : rt.themeName === 'dark' ? 'dark' : 'light'
  return (
    <Tabs variant="segmented" value={mode} onValueChange={(v) => setMode(v as Mode)}>
      <TabsList>
        <TabsTrigger value="system">System</TabsTrigger>
        <TabsTrigger value="light">Light</TabsTrigger>
        <TabsTrigger value="dark">Dark</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

function PresetPicker() {
  const current = usePreset()
  const { rt } = useUnistyles()
  const scheme = rt.themeName === 'dark' ? 'dark' : 'light'
  return (
    <HStack gap={3} wrap accessibilityRole="radiogroup" accessibilityLabel="Theme preset">
      {presetNames.map((name) => {
        const selected = name === current
        return (
          <Pressable
            key={name}
            accessibilityRole="radio"
            accessibilityLabel={`${name} preset`}
            accessibilityState={{ checked: selected }}
            onPress={() => applyPreset(name)}
            style={[styles.swatchRing, selected && styles.swatchRingSelected]}
          >
            <View
              style={[
                styles.swatch,
                {
                  backgroundColor: presets[name][scheme].primary,
                  borderRadius: presets[name].radius.md,
                },
              ]}
            />
          </Pressable>
        )
      })}
      <Text variant="muted" style={{ textTransform: 'capitalize' }}>
        {current}
      </Text>
    </HStack>
  )
}

export default function Index() {
  return (
    <Screen>
      <VStack gap={2}>
        <HStack gap={2}>
          <Text variant="heading">eoria</Text>
          <Badge variant="outline">pre-alpha</Badge>
        </HStack>
        <Text variant="muted">Slot recipes on Unistyles. Copy the source, own the code.</Text>
      </VStack>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Presets swap colours, radii and weights live. Mode follows the OS by default.
          </CardDescription>
        </CardHeader>
        <CardContent style={styles.appearance}>
          <ModePicker />
          <PresetPicker />
        </CardContent>
      </Card>

      <Section block title="Showcase">
        {showcase.map((s) => (
          <Card
            key={s.title}
            variant="elevated"
            accessibilityLabel={`${s.title}. ${s.description}`}
            onPress={() => router.push(s.href)}
          >
            <CardHeader style={styles.cardHeader}>
              <HStack justify="space-between">
                <CardTitle>{s.title}</CardTitle>
                <Badge variant="secondary">{s.tag}</Badge>
              </HStack>
              <CardDescription>{s.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </Section>

      <Section title="Components">
        {components.map((c) => (
          <Link key={c.title} href={c.href} asChild>
            <Button variant="secondary" size="sm">
              {c.title}
            </Button>
          </Link>
        ))}
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  appearance: { gap: theme.space[4] },
  swatchRing: {
    padding: 3,
    borderRadius: theme.radius.md + 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchRingSelected: { borderColor: theme.colors.foreground },
  swatch: { width: 28, height: 28 },
  cardHeader: { paddingBottom: theme.space[5] },
}))

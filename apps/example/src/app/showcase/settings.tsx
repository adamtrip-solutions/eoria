import { useState, type ReactNode } from 'react'
import { router } from 'expo-router'
import { View } from 'react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Screen } from '@/components/screen'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type SelectOption,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'
import { applyPreset, presetNames, usePreset, type Mode, setMode } from '@/theme'
import type { PresetName } from '@eoria/core'

const languages: SelectOption[] = [
  { value: 'en', label: 'English' },
  { value: 'pt', label: 'Português' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
]
const modes: SelectOption[] = [
  { value: 'system', label: 'Follow system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]
const presets: SelectOption[] = presetNames.map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}))

function Row({
  label,
  hint,
  children,
  last,
}: {
  label: string
  hint?: string
  children: ReactNode
  last?: boolean
}) {
  return (
    <View>
      <HStack justify="space-between" gap={4} py={3}>
        <VStack flex={1} gap={0}>
          <Text>{label}</Text>
          {hint ? <Text variant="caption">{hint}</Text> : null}
        </VStack>
        {children}
      </HStack>
      {last ? null : <Separator />}
    </View>
  )
}

export default function SettingsScreen() {
  const preset = usePreset()
  const [push, setPush] = useState(true)
  const [marketing, setMarketing] = useState(false)
  const [language, setLanguage] = useState<SelectOption | undefined>(languages[0])
  const { rt } = useUnistyles()
  const mode: Mode = rt.hasAdaptiveThemes ? 'system' : rt.themeName === 'dark' ? 'dark' : 'light'
  return (
    <Screen>
      <Card>
        <CardContent style={styles.top}>
          <HStack gap={3}>
            <Avatar size="lg" accessibilityLabel="Ada Lovelace">
              <AvatarImage source={{ uri: 'https://i.pravatar.cc/200?img=47' }} />
              <AvatarFallback>al</AvatarFallback>
            </Avatar>
            <VStack flex={1} gap={0}>
              <HStack gap={2}>
                <Text weight="semibold">Ada Lovelace</Text>
                <Badge size="sm">Pro</Badge>
              </HStack>
              <Text variant="muted">ada@example.com</Text>
            </VStack>
            <Button variant="outline" size="sm" onPress={() => toast({ title: 'Edit profile' })}>
              Edit
            </Button>
          </HStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Row label="Push notifications" hint="Mentions, replies and follows">
            <Switch
              checked={push}
              onCheckedChange={setPush}
              accessibilityLabel="Push notifications"
            />
          </Row>
          <Row label="Product updates" hint="Occasional email, no spam" last>
            <Switch
              checked={marketing}
              onCheckedChange={setMarketing}
              accessibilityLabel="Product updates"
            />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Changes apply instantly across the whole app.</CardDescription>
        </CardHeader>
        <CardContent style={styles.gap}>
          <VStack gap={2}>
            <Text variant="label">Mode</Text>
            <Select
              value={modes.find((m) => m.value === mode)}
              onValueChange={(o) => setMode(o.value as Mode)}
            >
              <SelectTrigger />
              <SelectContent>
                {modes.map((m) => (
                  <SelectItem key={m.value} {...m} />
                ))}
              </SelectContent>
            </Select>
          </VStack>
          <VStack gap={2}>
            <Text variant="label">Theme</Text>
            <Select
              value={presets.find((p) => p.value === preset)}
              onValueChange={(o) => applyPreset(o.value as PresetName)}
            >
              <SelectTrigger />
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} {...p} />
                ))}
              </SelectContent>
            </Select>
          </VStack>
          <VStack gap={2}>
            <Text variant="label">Language</Text>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger />
              <SelectContent>
                {languages.map((l) => (
                  <SelectItem key={l.value} {...l} />
                ))}
              </SelectContent>
            </Select>
          </VStack>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
          <CardDescription>These actions cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent style={styles.gap}>
          <Button variant="outline" width="full" onPress={() => toast({ title: 'Signed out' })}>
            Sign out of all devices
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" width="full">
                Delete account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  Your posts, followers and settings will be removed permanently.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button
                    variant="destructive"
                    width="full"
                    onPress={() => {
                      toast({ title: 'Account deleted', variant: 'destructive' })
                      router.back()
                    }}
                  >
                    Delete
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="ghost" width="full">
                    Keep account
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  top: { paddingTop: theme.space[4] },
  gap: { gap: theme.space[4] },
}))

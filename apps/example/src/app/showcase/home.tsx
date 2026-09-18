import { cloneElement, useState, type ReactElement } from 'react'
import { View } from 'react-native'
import {
  Blinds,
  Clapperboard,
  DoorOpen,
  Lamp,
  Moon,
  Speaker,
  Sun,
  Tv,
  Wind,
} from 'lucide-react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Screen } from '@/components/screen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { HStack, VStack } from '@/components/ui/stack'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

type Device = {
  id: string
  name: string
  detail: string
  on: boolean
  icon: ReactElement<{ size?: number; color?: string }>
}

const rooms = [
  { value: 'living', label: 'Living room', current: 21.5 },
  { value: 'kitchen', label: 'Kitchen', current: 22.8 },
  { value: 'bedroom', label: 'Bedroom', current: 19.4 },
  { value: 'office', label: 'Office', current: 23.1 },
]

const initialDevices: Device[] = [
  { id: 'lamp', name: 'Floor lamp', detail: 'Warm white', on: true, icon: <Lamp /> },
  { id: 'speaker', name: 'Speaker', detail: 'Bill Evans', on: true, icon: <Speaker /> },
  { id: 'blinds', name: 'Blinds', detail: 'Open', on: false, icon: <Blinds /> },
  { id: 'tv', name: 'TV', detail: 'Standby', on: false, icon: <Tv /> },
]

const scenes = [
  { label: 'Movie night', icon: <Clapperboard /> },
  { label: 'Good night', icon: <Moon /> },
  { label: 'Leaving', icon: <DoorOpen /> },
]

const degrees = (n: number) => `${n.toFixed(1).replace('.', ',')}°`

export default function HomeScreen() {
  const { theme } = useUnistyles()
  const [room, setRoom] = useState(rooms[0].value)
  const [heating, setHeating] = useState(true)
  const [target, setTarget] = useState(22)
  const [brightness, setBrightness] = useState(60)
  const [warmth, setWarmth] = useState(35)
  const [devices, setDevices] = useState(initialDevices)
  const current = rooms.find((r) => r.value === room)?.current ?? 21

  const toggle = (id: string, on: boolean) =>
    setDevices((all) => all.map((d) => (d.id === id ? { ...d, on } : d)))

  return (
    <Screen>
      <Tabs
        value={room}
        onValueChange={setRoom}
        style={styles.rooms}
        styles={{ list: styles.roomsList }}
      >
        <TabsList>
          {rooms.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardContent style={styles.climate}>
          <HStack justify="space-between" align="flex-start">
            <VStack gap={0}>
              <Text variant="label" style={styles.muted}>
                Climate
              </Text>
              <Text style={styles.temperature} maxFontSizeMultiplier={1.2}>
                {degrees(current)}
              </Text>
              <Text variant="muted">
                {heating ? `Heating to ${degrees(target)}` : 'Heating is off'}
              </Text>
            </VStack>
            <Switch checked={heating} onCheckedChange={setHeating} accessibilityLabel="Heating" />
          </HStack>
          <Slider
            value={target}
            min={16}
            max={28}
            step={0.5}
            size="lg"
            disabled={!heating}
            onValueChange={setTarget}
            accessibilityLabel="Target temperature"
          />
          <HStack justify="space-between">
            <Text variant="caption">16°</Text>
            <Text variant="caption">28°</Text>
          </HStack>
        </CardContent>
      </Card>

      <View style={styles.grid}>
        {devices.map((d) => (
          <Card key={d.id} style={styles.tile}>
            <CardContent style={styles.tileContent}>
              <HStack justify="space-between" align="flex-start">
                <View style={[styles.iconWell, d.on && styles.iconWellOn]}>
                  {cloneElement(d.icon, {
                    size: 20,
                    color: d.on ? theme.colors.primaryForeground : theme.colors.mutedForeground,
                  })}
                </View>
                <Switch
                  size="sm"
                  checked={d.on}
                  onCheckedChange={(on) => toggle(d.id, on)}
                  accessibilityLabel={d.name}
                />
              </HStack>
              <VStack gap={0}>
                <Text weight="medium">{d.name}</Text>
                <Text variant="caption">{d.on ? d.detail : 'Off'}</Text>
              </VStack>
            </CardContent>
          </Card>
        ))}
      </View>

      <Card>
        <CardHeader>
          <HStack justify="space-between">
            <CardTitle>Lights</CardTitle>
            <Badge variant="secondary">{`${brightness}%`}</Badge>
          </HStack>
        </CardHeader>
        <CardContent style={styles.lights}>
          <HStack gap={3}>
            <Sun size={18} color={theme.colors.mutedForeground} />
            <Slider
              value={brightness}
              min={0}
              max={100}
              step={5}
              onValueChange={setBrightness}
              accessibilityLabel="Brightness"
              style={styles.flex}
            />
          </HStack>
          <HStack gap={3}>
            <Wind size={18} color={theme.colors.mutedForeground} />
            <Slider
              value={warmth}
              min={0}
              max={100}
              step={5}
              onValueChange={setWarmth}
              accessibilityLabel="Warmth"
              style={styles.flex}
            />
          </HStack>
        </CardContent>
      </Card>

      <VStack gap={3}>
        <Text variant="title">Scenes</Text>
        <HStack gap={2} wrap>
          {scenes.map((s) => (
            <Button
              key={s.label}
              variant="secondary"
              size="sm"
              icon={s.icon}
              onPress={() => toast({ title: `${s.label} is on` })}
            >
              {s.label}
            </Button>
          ))}
        </HStack>
      </VStack>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  rooms: { marginHorizontal: -theme.space[4] },
  roomsList: { paddingHorizontal: theme.space[4] },
  climate: { paddingTop: theme.space[5], gap: theme.space[4] },
  muted: { color: theme.colors.mutedForeground },
  temperature: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.space[3] },
  tile: { flexBasis: '47%', flexGrow: 1 },
  tileContent: { paddingTop: theme.space[4], gap: theme.space[5] },
  iconWell: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellOn: { backgroundColor: theme.colors.primary },
  lights: { gap: theme.space[4] },
  flex: { flex: 1 },
}))

// Previews for the items that wrap a native package: sheet, date-picker, image, keyboard
// and haptics. Spread into the map in ../previews.tsx.
import { useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { Calendar, ImageOff, Vibrate } from 'lucide-react-native'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { haptic, withHaptic } from '@/components/ui/haptics'
import { Image } from '@/components/ui/image'
import { Input } from '@/components/ui/input'
import { KeyboardFooter } from '@/components/ui/keyboard'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

function DatePickerPreview() {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 8, 24))
  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <Label>Check-in</Label>
        <DatePicker value={date} onValueChange={setDate} icon={<Calendar />} />
      </VStack>
      <VStack gap={2}>
        <Label>Wake me at</Label>
        <DatePicker mode="time" placeholder="No alarm" />
      </VStack>
    </VStack>
  )
}

export const nativePreviews: Record<string, () => ReactNode> = {
  sheet: () => (
    <Sheet open>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Share trip</SheetTitle>
          <SheetDescription>Anyone with the link can see the route and the dates.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <SheetClose asChild>
            <Button width="full">Copy link</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button variant="ghost" width="full">
              Not now
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
  'date-picker': () => <DatePickerPreview />,
  image: () => (
    <VStack gap={4}>
      <Image
        source="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=70"
        alt="A lake between mountains at dusk"
        ratio={16 / 9}
        rounded="card"
      />
      <HStack gap={4}>
        <Image
          source="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=70"
          alt="A road through a valley"
          ratio={1}
          rounded="lg"
          style={{ flex: 1 }}
        />
        <Image
          source="https://eoria.invalid/missing.jpg"
          alt="A picture that failed to load"
          ratio={1}
          rounded="lg"
          fallback={<ImageOff size={24} color="#8a8a8a" />}
          style={{ flex: 1 }}
        />
      </HStack>
    </VStack>
  ),
  keyboard: () => (
    <View style={{ flex: 1 }}>
      <VStack gap={2}>
        <Label>Display name</Label>
        <Input placeholder="Bruno" />
        <Text variant="muted">The button below rides above the keyboard.</Text>
      </VStack>
      <View style={{ flex: 1 }} />
      <KeyboardFooter variant="bordered" bottomInset={34} style={{ marginHorizontal: -20 }}>
        <Button width="full">Continue</Button>
      </KeyboardFooter>
    </View>
  ),
  haptics: () => (
    <VStack gap={3}>
      <Button icon={<Vibrate />} onPress={withHaptic('light')}>
        Light impact
      </Button>
      <Button variant="secondary" onPress={() => haptic('success')}>
        Success
      </Button>
      <Button variant="secondary" onPress={() => haptic('selection')}>
        Selection
      </Button>
    </VStack>
  ),
}

import { useState } from 'react'
import { Calendar, Clock, ImageOff } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useUnistyles } from 'react-native-unistyles'
import { Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { haptic, withHaptic } from '@/components/ui/haptics'
import { Image } from '@/components/ui/image'
import { Input } from '@/components/ui/input'
import { KeyboardFooter, KeyboardScrollView, KeyboardToolbar } from '@/components/ui/keyboard'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { HStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const stops = ['Lisbon', 'Évora', 'Monsaraz', 'Mértola', 'Tavira', 'Sagres', 'Aljezur', 'Sines']

export default function NativeScreen() {
  const { theme } = useUnistyles()
  const insets = useSafeAreaInsets()
  const [checkIn, setCheckIn] = useState<Date | undefined>(new Date(2026, 8, 24))
  return (
    <>
      <KeyboardScrollView
        contentContainerStyle={{ padding: theme.space[5], gap: theme.space[8] }}
        style={{ backgroundColor: theme.colors.background }}
      >
        <Section block title="Image">
          <Image
            source="https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1200&q=70"
            alt="A lake between mountains at dusk"
            ratio={16 / 9}
            rounded="card"
          />
          <HStack gap={3}>
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
              fallback={<ImageOff size={24} color={theme.colors.mutedForeground} />}
              style={{ flex: 1 }}
            />
          </HStack>
        </Section>

        <Section block title="Date picker">
          <Field>
            <FieldLabel>Check-in</FieldLabel>
            <FieldControl>
              <DatePicker
                value={checkIn}
                onValueChange={setCheckIn}
                minimumDate={new Date()}
                icon={<Calendar />}
              />
            </FieldControl>
            <FieldDescription>Opens the system calendar.</FieldDescription>
          </Field>
          <DatePicker mode="time" placeholder="Arrival time" icon={<Clock />} />
        </Section>

        <Section block title="Sheet">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Share trip</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Share trip</SheetTitle>
                <SheetDescription>
                  Anyone with the link can see the route and the dates.
                </SheetDescription>
              </SheetHeader>
              <SheetFooter>
                <SheetClose asChild>
                  <Button width="full" onPress={() => toast({ title: 'Link copied' })}>
                    Copy link
                  </Button>
                </SheetClose>
                <SheetClose asChild>
                  <Button variant="ghost" width="full">
                    Not now
                  </Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Stops, with snap points</Button>
            </SheetTrigger>
            <SheetContent scroll snapPoints={['40%', '90%']} enableDynamicSizing={false}>
              <SheetHeader>
                <SheetTitle>Stops</SheetTitle>
              </SheetHeader>
              {stops.map((stop) => (
                <Text key={stop}>{stop}</Text>
              ))}
            </SheetContent>
          </Sheet>
        </Section>

        <Section block title="Haptics">
          <Button variant="secondary" onPress={withHaptic('light')}>
            Light impact
          </Button>
          <Button variant="secondary" onPress={() => haptic('success')}>
            Success
          </Button>
        </Section>

        <Section block title="Keyboard">
          <Input placeholder="First name" />
          <Input placeholder="Last name" />
          <Input placeholder="City" />
          <Text variant="muted">Focus a field. The button stays above the keyboard.</Text>
        </Section>
      </KeyboardScrollView>
      <KeyboardFooter variant="bordered" bottomInset={insets.bottom}>
        <Button width="full">Continue</Button>
      </KeyboardFooter>
      <KeyboardToolbar />
    </>
  )
}

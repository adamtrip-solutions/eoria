// Previews for the list and input components. Merged into `previews` in ../previews.tsx.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Archive,
  Bell,
  Bold,
  Globe,
  Italic,
  Moon,
  Trash2,
  Underline,
} from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from '@/components/ui/carousel'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Item,
  ItemChevron,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemGroupFooter,
  ItemGroupLabel,
  ItemMedia,
  ItemTitle,
  ItemTrailing,
} from '@/components/ui/item'
import { Rating } from '@/components/ui/rating'
import { HStack, VStack } from '@/components/ui/stack'
import { Stepper } from '@/components/ui/stepper'
import { Swipeable, SwipeableAction, type SwipeableRef } from '@/components/ui/swipeable'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'
import { Toggle, ToggleGroup } from '@/components/ui/toggle-group'

const inbox = [
  {
    id: '1',
    from: 'Ana Ribeiro',
    initials: 'ar',
    subject: 'Friday works. Shall I book the table?',
  },
  { id: '2', from: 'Rui Matos', initials: 'rm', subject: 'The invoice for September is attached.' },
  { id: '3', from: 'Carris', initials: 'ca', subject: 'Your monthly pass renews tomorrow.' },
]

const slides = [
  ['Track every euro', 'Budgets by category, updated as you spend.'],
  ['Split with friends', 'Send a link and settle without the maths.'],
  ['Stay in the loop', 'A notification for every payment, nothing else.'],
]

function ItemPreview() {
  const [push, setPush] = useState(true)
  return (
    <ItemGroup>
      <ItemGroupLabel>General</ItemGroupLabel>
      <Item onPress={() => {}}>
        <ItemMedia>
          <Globe />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Language</ItemTitle>
        </ItemContent>
        <ItemTrailing>English</ItemTrailing>
        <ItemChevron />
      </Item>
      <Item onPress={() => {}}>
        <ItemMedia>
          <Moon />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Appearance</ItemTitle>
          <ItemDescription>Follows the system setting</ItemDescription>
        </ItemContent>
        <ItemChevron />
      </Item>
      <Item>
        <ItemMedia>
          <Bell />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Push notifications</ItemTitle>
        </ItemContent>
        <ItemTrailing>
          <Switch
            checked={push}
            onCheckedChange={setPush}
            accessibilityLabel="Push notifications"
          />
        </ItemTrailing>
      </Item>
      <ItemGroupFooter>Notifications respect your Focus settings.</ItemGroupFooter>
    </ItemGroup>
  )
}

function SwipeablePreview() {
  const second = useRef<SwipeableRef>(null)
  // Open one row after layout so the screenshot shows the actions.
  useEffect(() => {
    const t = setTimeout(() => second.current?.openTrailing(), 900)
    return () => clearTimeout(t)
  }, [])
  return (
    <ItemGroup>
      {inbox.map((m, i) => (
        <Swipeable
          key={m.id}
          ref={i === 1 ? second : undefined}
          trailing={
            <>
              <SwipeableAction icon={<Archive />}>Archive</SwipeableAction>
              <SwipeableAction variant="destructive" icon={<Trash2 />}>
                Delete
              </SwipeableAction>
            </>
          }
        >
          <Item onPress={() => {}}>
            <ItemMedia variant="avatar">
              <Avatar accessibilityLabel={m.from}>
                <AvatarFallback>{m.initials}</AvatarFallback>
              </Avatar>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{m.from}</ItemTitle>
              <ItemDescription numberOfLines={1}>{m.subject}</ItemDescription>
            </ItemContent>
          </Item>
        </Swipeable>
      ))}
    </ItemGroup>
  )
}

function ToggleGroupPreview() {
  const [align, setAlign] = useState<string | undefined>('left')
  return (
    <VStack gap={4}>
      <ToggleGroup value={align} onValueChange={setAlign} allowEmpty={false}>
        <Toggle value="left" icon={<AlignLeft />} accessibilityLabel="Align left" />
        <Toggle value="center" icon={<AlignCenter />} accessibilityLabel="Align centre" />
        <Toggle value="right" icon={<AlignRight />} accessibilityLabel="Align right" />
      </ToggleGroup>
      <ToggleGroup type="multiple" variant="outline" defaultValue={['bold']}>
        <Toggle value="bold" icon={<Bold />} accessibilityLabel="Bold" />
        <Toggle value="italic" icon={<Italic />} accessibilityLabel="Italic" />
        <Toggle value="underline" icon={<Underline />} accessibilityLabel="Underline" />
      </ToggleGroup>
      <ToggleGroup type="multiple" width="full" size="sm" defaultValue={['m']}>
        {['XS', 'S', 'M', 'L', 'XL'].map((size) => (
          <Toggle key={size} value={size.toLowerCase()}>
            {size}
          </Toggle>
        ))}
      </ToggleGroup>
      <HStack gap={3}>
        <Toggle defaultPressed>Following</Toggle>
        <Toggle variant="outline">Notify me</Toggle>
      </HStack>
    </VStack>
  )
}

export const listsPreviews: Record<string, () => ReactNode> = {
  item: () => <ItemPreview />,
  swipeable: () => <SwipeablePreview />,
  collapsible: () => (
    <VStack gap={4}>
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Order details</CollapsibleTrigger>
        <CollapsibleContent>
          Three items, shipped to Lisbon on Friday with standard delivery.
        </CollapsibleContent>
      </Collapsible>
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="secondary" size="sm">
            Show more
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>Hidden until the button is pressed.</CollapsibleContent>
      </Collapsible>
    </VStack>
  ),
  'toggle-group': () => <ToggleGroupPreview />,
  stepper: () => (
    <VStack gap={4}>
      <HStack gap={4}>
        <Stepper defaultValue={2} min={1} max={10} accessibilityLabel="Quantity" />
        <Stepper size="sm" defaultValue={1} min={1} max={10} accessibilityLabel="Quantity" />
      </HStack>
      <Stepper
        defaultValue={1.5}
        min={0}
        max={5}
        step={0.5}
        formatValue={(n) => `${n} kg`}
        accessibilityLabel="Weight"
      />
      <Stepper defaultValue={0} disabled accessibilityLabel="Guests" />
    </VStack>
  ),
  rating: () => (
    <VStack gap={3}>
      <Rating defaultValue={4} accessibilityLabel="Your rating" />
      <Rating defaultValue={2.5} allowHalf size="lg" />
      <HStack gap={2}>
        <Rating readOnly size="sm" value={4.3} />
        <Text variant="muted">4.3 from 128 reviews</Text>
      </HStack>
    </VStack>
  ),
  carousel: () => (
    <Carousel itemWidth={260} gap={12} defaultIndex={1}>
      <CarouselContent>
        {slides.map(([title, body]) => (
          <CarouselItem key={title}>
            <View style={styles.slide}>
              <Text variant="title">{title}</Text>
              <Text variant="muted">{body}</Text>
            </View>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselDots />
    </Carousel>
  ),
}

const styles = StyleSheet.create((theme) => ({
  slide: {
    minHeight: 160,
    justifyContent: 'flex-end',
    gap: theme.space[1],
    padding: theme.space[5],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.stroke,
    borderColor: theme.colors.border,
  },
}))

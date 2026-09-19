import { useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Archive,
  Bell,
  CreditCard,
  Globe,
  LayoutGrid,
  List,
  MailOpen,
  Moon,
  Rows3,
  Trash2,
} from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Screen, Section } from '@/components/screen'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  type CarouselRef,
} from '@/components/ui/carousel'
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
import { Swipeable, SwipeableAction } from '@/components/ui/swipeable'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'
import { Toggle, ToggleGroup } from '@/components/ui/toggle-group'

type Message = { id: string; from: string; initials: string; subject: string; unread: boolean }

const messages: Message[] = [
  {
    id: '1',
    from: 'Ana Ribeiro',
    initials: 'ar',
    subject: 'Friday works. Shall I book the table?',
    unread: true,
  },
  {
    id: '2',
    from: 'Rui Matos',
    initials: 'rm',
    subject: 'The invoice for September is attached.',
    unread: true,
  },
  {
    id: '3',
    from: 'Carris Metropolitana',
    initials: 'cm',
    subject: 'Your monthly pass renews tomorrow.',
    unread: false,
  },
]

const slides = [
  ['Track every euro', 'Budgets by category, updated as you spend.'],
  ['Split with friends', 'Send a link and settle without the maths.'],
  ['Stay in the loop', 'A notification for every payment, nothing else.'],
]

const PRICE = 18.5

export default function ListsScreen() {
  const [push, setPush] = useState(true)
  const [sounds, setSounds] = useState(false)
  const [inbox, setInbox] = useState(messages)
  const [quantity, setQuantity] = useState(2)
  const [stars, setStars] = useState(4)
  const [layout, setLayout] = useState<string | undefined>('list')
  const [page, setPage] = useState(0)
  const carousel = useRef<CarouselRef>(null)

  const markRead = (id: string) =>
    setInbox((list) => list.map((m) => (m.id === id ? { ...m, unread: false } : m)))
  const remove = (id: string) => setInbox((list) => list.filter((m) => m.id !== id))

  return (
    <Screen>
      <Section block title="Settings list">
        <ItemGroup>
          <ItemGroupLabel>General</ItemGroupLabel>
          <Item onPress={() => toast({ title: 'Language' })}>
            <ItemMedia>
              <Globe />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Language</ItemTitle>
            </ItemContent>
            <ItemTrailing>English</ItemTrailing>
            <ItemChevron />
          </Item>
          <Item onPress={() => toast({ title: 'Appearance' })}>
            <ItemMedia>
              <Moon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Appearance</ItemTitle>
              <ItemDescription>Follows the system setting</ItemDescription>
            </ItemContent>
            <ItemChevron />
          </Item>
          <Item onPress={() => toast({ title: 'Payment methods' })}>
            <ItemMedia>
              <CreditCard />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Payment methods</ItemTitle>
            </ItemContent>
            <ItemTrailing>
              <Badge>2 cards</Badge>
            </ItemTrailing>
            <ItemChevron />
          </Item>
        </ItemGroup>
        <ItemGroup>
          <ItemGroupLabel>Notifications</ItemGroupLabel>
          <Item>
            <ItemMedia>
              <Bell />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Push notifications</ItemTitle>
              <ItemDescription>Mentions, replies and follows</ItemDescription>
            </ItemContent>
            <ItemTrailing>
              <Switch
                checked={push}
                onCheckedChange={setPush}
                accessibilityLabel="Push notifications"
              />
            </ItemTrailing>
          </Item>
          <Item disabled={!push}>
            <ItemContent>
              <ItemTitle>Sounds</ItemTitle>
            </ItemContent>
            <ItemTrailing>
              <Switch
                checked={sounds}
                onCheckedChange={setSounds}
                disabled={!push}
                accessibilityLabel="Sounds"
              />
            </ItemTrailing>
          </Item>
          <ItemGroupFooter>Notifications respect your Focus settings.</ItemGroupFooter>
        </ItemGroup>
      </Section>

      <Section block title="Inbox with swipe actions">
        {inbox.length > 0 ? (
          <ItemGroup>
            {inbox.map((m) => (
              <Swipeable
                key={m.id}
                leading={
                  <SwipeableAction
                    variant="primary"
                    icon={<MailOpen />}
                    onPress={() => markRead(m.id)}
                  >
                    Read
                  </SwipeableAction>
                }
                trailing={
                  <>
                    <SwipeableAction
                      icon={<Archive />}
                      onPress={() => {
                        remove(m.id)
                        toast({ title: 'Archived' })
                      }}
                    >
                      Archive
                    </SwipeableAction>
                    <SwipeableAction
                      variant="destructive"
                      icon={<Trash2 />}
                      onPress={() => remove(m.id)}
                    >
                      Delete
                    </SwipeableAction>
                  </>
                }
              >
                <Item onPress={() => markRead(m.id)}>
                  <ItemMedia variant="avatar">
                    <Avatar accessibilityLabel={m.from}>
                      <AvatarFallback>{m.initials}</AvatarFallback>
                    </Avatar>
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle style={m.unread ? styles.unread : undefined}>{m.from}</ItemTitle>
                    <ItemDescription numberOfLines={1}>{m.subject}</ItemDescription>
                  </ItemContent>
                  {m.unread ? <View style={styles.dot} /> : null}
                </Item>
              </Swipeable>
            ))}
          </ItemGroup>
        ) : (
          <Button variant="secondary" onPress={() => setInbox(messages)}>
            Restore the inbox
          </Button>
        )}
      </Section>

      <Section block title="Cart line with a stepper">
        <ItemGroup>
          <Item size="lg">
            <ItemMedia variant="image">
              <Text style={styles.emoji}>🫒</Text>
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Olive oil, 750 ml</ItemTitle>
              <ItemDescription>€{(PRICE * quantity).toFixed(2)}</ItemDescription>
            </ItemContent>
            <ItemTrailing>
              <Stepper
                size="sm"
                value={quantity}
                onValueChange={setQuantity}
                min={1}
                max={12}
                accessibilityLabel="Quantity of olive oil"
              />
            </ItemTrailing>
          </Item>
        </ItemGroup>
      </Section>

      <Section block title="Review with a rating">
        <VStack gap={2}>
          <HStack gap={2}>
            <Rating readOnly size="sm" value={4.3} />
            <Text variant="muted">4.3 from 128 reviews</Text>
          </HStack>
          <Rating value={stars} onValueChange={setStars} accessibilityLabel="Your rating" />
          <Text variant="muted">
            {stars === 0
              ? 'No rating yet.'
              : `You gave ${stars} of 5. Drag back past the first star to clear.`}
          </Text>
          <Collapsible>
            <CollapsibleTrigger>How ratings work</CollapsibleTrigger>
            <CollapsibleContent>
              The average counts verified purchases from the last twelve months.
            </CollapsibleContent>
          </Collapsible>
        </VStack>
      </Section>

      <Section block title="View switch">
        <ToggleGroup value={layout} onValueChange={setLayout} allowEmpty={false}>
          <Toggle value="list" icon={<List />} accessibilityLabel="List" />
          <Toggle value="rows" icon={<Rows3 />} accessibilityLabel="Rows" />
          <Toggle value="grid" icon={<LayoutGrid />} accessibilityLabel="Grid" />
        </ToggleGroup>
        <Text variant="muted">Layout: {layout}</Text>
      </Section>

      <Section block title="Onboarding carousel">
        <Carousel ref={carousel} index={page} onIndexChange={setPage}>
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
        <Button
          width="full"
          onPress={() =>
            page < slides.length - 1
              ? carousel.current?.scrollTo(page + 1)
              : toast({ title: 'All set' })
          }
        >
          {page < slides.length - 1 ? 'Next' : 'Get started'}
        </Button>
      </Section>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  unread: { fontWeight: theme.fontWeight.semibold },
  dot: {
    width: 8,
    height: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.primary,
  },
  emoji: { fontSize: 24, lineHeight: 32 },
  slide: {
    minHeight: 180,
    justifyContent: 'flex-end',
    gap: theme.space[1],
    padding: theme.space[5],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.surface,
    borderWidth: theme.stroke,
    borderColor: theme.colors.border,
  },
}))

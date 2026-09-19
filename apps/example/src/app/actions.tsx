import { useState } from 'react'
import {
  AtSign,
  Bell,
  Copy,
  Heart,
  Pencil,
  Plus,
  SearchX,
  Share,
  Star,
  Trash2,
} from 'lucide-react-native'
import { Screen, Section } from '@/components/screen'
import {
  ActionSheet,
  ActionSheetCancel,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetItem,
  ActionSheetTrigger,
} from '@/components/ui/action-sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Chip, ChipGroup } from '@/components/ui/chip'
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldControl, FieldDescription, FieldLabel } from '@/components/ui/field'
import { IconButton } from '@/components/ui/icon-button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { PasswordInput } from '@/components/ui/password-input'
import { SearchBar } from '@/components/ui/search-bar'
import { HStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const places = [
  'Fábrica Coffee',
  'Hello, Kristof',
  'The Mill',
  'Copenhagen Coffee Lab',
  'Dramático',
]

export default function ActionsScreen() {
  const [liked, setLiked] = useState(false)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [last, setLast] = useState('none')
  const [handle, setHandle] = useState('')
  const [password, setPassword] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [tags, setTags] = useState<string[]>(['vegan'])
  const [guests, setGuests] = useState(['ada@example.com', 'grace@example.com'])

  const found = places.filter((p) => p.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <Screen>
      <Section title="IconButton">
        <IconButton icon={<Plus />} accessibilityLabel="Add item" />
        <IconButton variant="secondary" icon={<Share />} accessibilityLabel="Share" />
        <IconButton variant="outline" icon={<Pencil />} accessibilityLabel="Edit" />
        <IconButton
          variant="ghost"
          icon={<Heart />}
          accessibilityLabel={liked ? 'Remove from favourites' : 'Add to favourites'}
          accessibilityState={{ selected: liked }}
          onPress={() => setLiked(!liked)}
        />
        <IconButton variant="destructive" icon={<Trash2 />} accessibilityLabel="Delete" />
        <IconButton size="sm" variant="secondary" icon={<Bell />} accessibilityLabel="Alerts" />
        <IconButton size="lg" icon={<Plus />} accessibilityLabel="New post" />
        <IconButton disabled icon={<Plus />} accessibilityLabel="Add item" />
        <Text variant="muted">{liked ? 'In favourites' : 'Not in favourites'}</Text>
      </Section>

      <Section title="AlertDialog">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                Your projects and billing history go with it. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                variant="destructive"
                onPress={() => toast({ title: 'Account deleted', variant: 'destructive' })}
              >
                Delete account
              </AlertDialogAction>
              <AlertDialogCancel>Keep account</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" onPress={() => setUpdateOpen(true)}>
          No Cancel, controlled
        </Button>
        <AlertDialog open={updateOpen} onOpenChange={setUpdateOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Update required</AlertDialogTitle>
              <AlertDialogDescription>
                This version no longer syncs. Overlay taps and Android back do nothing here.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction>Update now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>

      <Section title="ActionSheet">
        <ActionSheet>
          <ActionSheetTrigger asChild>
            <Button variant="outline">Photo options</Button>
          </ActionSheetTrigger>
          <ActionSheetContent>
            <ActionSheetHeader title="IMG_2041.jpg" message="Taken in Lisbon, 3.2 MB" />
            <ActionSheetItem icon={<Share />} onSelect={() => setLast('share')}>
              Share
            </ActionSheetItem>
            <ActionSheetItem icon={<Copy />} onSelect={() => setLast('duplicate')}>
              Duplicate
            </ActionSheetItem>
            <ActionSheetItem icon={<Heart />} disabled>
              Add to favourites
            </ActionSheetItem>
            <ActionSheetItem
              variant="destructive"
              icon={<Trash2 />}
              onSelect={() => setLast('delete')}
            >
              Delete photo
            </ActionSheetItem>
            <ActionSheetCancel />
          </ActionSheetContent>
        </ActionSheet>
        <ActionSheet>
          <ActionSheetTrigger asChild>
            <Button variant="outline">Long list</Button>
          </ActionSheetTrigger>
          <ActionSheetContent>
            <ActionSheetHeader title="Move to album" />
            {Array.from({ length: 16 }, (_, i) => (
              <ActionSheetItem key={i} onSelect={() => setLast(`album ${i + 1}`)}>
                {`Album ${i + 1}`}
              </ActionSheetItem>
            ))}
            <ActionSheetCancel />
          </ActionSheetContent>
        </ActionSheet>
        <Text variant="muted">Last: {last}</Text>
      </Section>

      <Section block title="InputGroup">
        <Field>
          <FieldLabel>Handle</FieldLabel>
          <FieldControl>
            <InputGroup>
              <InputGroupAddon icon={<AtSign />} />
              <InputGroupInput
                placeholder="username"
                autoCapitalize="none"
                autoCorrect={false}
                value={handle}
                onChangeText={setHandle}
              />
            </InputGroup>
          </FieldControl>
          <FieldDescription>The label above reaches the input inside the group.</FieldDescription>
        </Field>
        <InputGroup>
          <InputGroupAddon>https://</InputGroupAddon>
          <InputGroupInput placeholder="example.com" keyboardType="url" autoCapitalize="none" />
        </InputGroup>
        <InputGroup>
          <InputGroupInput value="example.com/invite/7Q2K" />
          <InputGroupAddon align="end">
            <InputGroupButton
              icon={<Copy />}
              accessibilityLabel="Copy link"
              onPress={() => toast({ title: 'Link copied' })}
            />
          </InputGroupAddon>
        </InputGroup>
        <InputGroup size="sm">
          <InputGroupInput placeholder="Promo code, sm" autoCapitalize="characters" />
          <InputGroupAddon align="end">
            <InputGroupButton onPress={() => toast({ title: 'Code applied' })}>
              Apply
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <InputGroup invalid>
          <InputGroupAddon icon={<AtSign />} />
          <InputGroupInput value="taken" />
        </InputGroup>
        <InputGroup disabled>
          <InputGroupAddon icon={<AtSign />} />
          <InputGroupInput placeholder="Disabled" />
        </InputGroup>
      </Section>

      <Section block title="PasswordInput">
        <PasswordInput placeholder="Password" value={password} onChangeText={setPassword} />
        <PasswordInput
          size="lg"
          placeholder="New password, lg"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <PasswordInput invalid defaultValue="short" />
        <PasswordInput disabled placeholder="Disabled" />
      </Section>

      <Section block title="SearchBar">
        <SearchBar
          showCancel
          placeholder="Search coffee shops"
          value={query}
          onChangeText={setQuery}
          onSubmit={(text) => toast({ title: `Searched for ${text || 'nothing'}` })}
        />
        {found.length > 0 ? (
          <Text variant="muted">{found.join(', ')}</Text>
        ) : (
          <Card>
            <Empty>
              <EmptyMedia icon={<SearchX />} />
              <EmptyTitle>No coffee shops found</EmptyTitle>
              <EmptyDescription>Check the spelling or try a shorter name.</EmptyDescription>
              <EmptyActions>
                <Button variant="secondary" size="sm" onPress={() => setQuery('')}>
                  Clear search
                </Button>
              </EmptyActions>
            </Empty>
          </Card>
        )}
        <SearchBar size="sm" placeholder="Uncontrolled, sm" />
        <SearchBar disabled placeholder="Disabled" />
      </Section>

      <Section block title="Chip">
        <ChipGroup type="single" value={filter} onValueChange={setFilter} scroll>
          <Chip value="all">All</Chip>
          <Chip value="open">Open now</Chip>
          <Chip value="top" icon={<Star />}>
            Top rated
          </Chip>
          <Chip value="near">Nearby</Chip>
          <Chip value="new">New this month</Chip>
          <Chip value="quiet">Quiet</Chip>
        </ChipGroup>
        <ChipGroup type="multiple" variant="outline" value={tags} onValueChange={setTags}>
          <Chip value="vegan">Vegan</Chip>
          <Chip value="gluten-free">Gluten free</Chip>
          <Chip value="terrace">Terrace</Chip>
          <Chip value="dogs">Dog friendly</Chip>
          <Chip value="late" disabled>
            Open late
          </Chip>
        </ChipGroup>
        <Text variant="muted">
          Filter: {filter}. Tags: {tags.join(', ') || 'none'}
        </Text>
        <HStack gap={2} style={{ flexWrap: 'wrap' }}>
          {guests.map((guest) => (
            <Chip
              key={guest}
              size="sm"
              onDismiss={() => setGuests(guests.filter((g) => g !== guest))}
            >
              {guest}
            </Chip>
          ))}
        </HStack>
        {guests.length === 0 ? (
          <Button
            variant="link"
            size="sm"
            onPress={() => setGuests(['ada@example.com', 'grace@example.com'])}
          >
            Bring the guests back
          </Button>
        ) : null}
      </Section>

      <Section block title="Empty">
        <Card variant="outline">
          <Empty>
            <EmptyMedia variant="plain" icon={<Bell />} />
            <EmptyTitle>You are all caught up</EmptyTitle>
            <EmptyDescription>New alerts show up here as they arrive.</EmptyDescription>
          </Empty>
        </Card>
      </Section>
    </Screen>
  )
}

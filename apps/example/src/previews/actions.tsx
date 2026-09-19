// Demos for the action and input components, one per registry item.
// previews.tsx merges these into the map the docs screenshots read.
import type { ReactNode } from 'react'
import { AtSign, Copy, Heart, Inbox, MapPin, Plus, Share, Star, Trash2 } from 'lucide-react-native'
import {
  ActionSheet,
  ActionSheetCancel,
  ActionSheetContent,
  ActionSheetHeader,
  ActionSheetItem,
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
import { IconButton } from '@/components/ui/icon-button'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { PasswordInput } from '@/components/ui/password-input'
import { SearchBar } from '@/components/ui/search-bar'
import { HStack, VStack } from '@/components/ui/stack'

export const actionsPreviews: Record<string, () => ReactNode> = {
  'icon-button': () => (
    <VStack gap={5}>
      <HStack gap={3}>
        <IconButton size="sm" icon={<Plus />} accessibilityLabel="Add" />
        <IconButton icon={<Plus />} accessibilityLabel="Add" />
        <IconButton size="lg" icon={<Plus />} accessibilityLabel="Add" />
      </HStack>
      <HStack gap={3}>
        <IconButton variant="secondary" icon={<Share />} accessibilityLabel="Share" />
        <IconButton variant="outline" icon={<Copy />} accessibilityLabel="Copy" />
        <IconButton variant="ghost" icon={<Heart />} accessibilityLabel="Save" />
        <IconButton variant="destructive" icon={<Trash2 />} accessibilityLabel="Delete" />
      </HStack>
      <HStack gap={3}>
        <IconButton disabled icon={<Plus />} accessibilityLabel="Add" />
        <IconButton disabled variant="secondary" icon={<Share />} accessibilityLabel="Share" />
      </HStack>
    </VStack>
  ),
  'alert-dialog': () => (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            Your projects and billing history go with it. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction variant="destructive">Delete account</AlertDialogAction>
          <AlertDialogCancel>Keep account</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  'action-sheet': () => (
    <ActionSheet open>
      <ActionSheetContent>
        <ActionSheetHeader title="IMG_2041.jpg" message="Taken in Lisbon, 3.2 MB" />
        <ActionSheetItem icon={<Share />}>Share</ActionSheetItem>
        <ActionSheetItem icon={<Copy />}>Duplicate</ActionSheetItem>
        <ActionSheetItem icon={<Heart />}>Add to favourites</ActionSheetItem>
        <ActionSheetItem variant="destructive" icon={<Trash2 />}>
          Delete photo
        </ActionSheetItem>
        <ActionSheetCancel />
      </ActionSheetContent>
    </ActionSheet>
  ),
  'input-group': () => (
    <VStack gap={3}>
      <InputGroup>
        <InputGroupAddon icon={<AtSign />} />
        <InputGroupInput placeholder="username" />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon>https://</InputGroupAddon>
        <InputGroupInput value="example.com" />
      </InputGroup>
      <InputGroup>
        <InputGroupInput value="example.com/invite/7Q2K" />
        <InputGroupAddon align="end">
          <InputGroupButton icon={<Copy />} accessibilityLabel="Copy link" />
        </InputGroupAddon>
      </InputGroup>
      <InputGroup invalid>
        <InputGroupAddon icon={<MapPin />} />
        <InputGroupInput value="Rua sem número" />
        <InputGroupAddon align="end">
          <InputGroupButton>Locate</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <InputGroup size="sm" disabled>
        <InputGroupAddon icon={<AtSign />} />
        <InputGroupInput placeholder="disabled, sm" />
      </InputGroup>
    </VStack>
  ),
  'password-input': () => (
    <VStack gap={3}>
      <PasswordInput placeholder="Password" />
      <PasswordInput value="correct horse" />
      <PasswordInput defaultVisible value="correct horse" />
      <PasswordInput invalid value="short" />
      <PasswordInput size="sm" disabled placeholder="disabled, sm" />
    </VStack>
  ),
  'search-bar': () => (
    <VStack gap={3}>
      <SearchBar placeholder="Search places" />
      <SearchBar defaultValue="Lisbon" />
      <SearchBar showCancel defaultValue="Coffee near me" />
      <SearchBar size="sm" placeholder="sm" />
    </VStack>
  ),
  chip: () => (
    <VStack gap={5}>
      <ChipGroup type="single" defaultValue="open" scroll>
        <Chip value="all">All</Chip>
        <Chip value="open">Open now</Chip>
        <Chip value="top" icon={<Star />}>
          Top rated
        </Chip>
        <Chip value="near">Nearby</Chip>
        <Chip value="new">New</Chip>
      </ChipGroup>
      <ChipGroup type="multiple" variant="outline" defaultValue={['vegan', 'terrace']}>
        <Chip value="vegan">Vegan</Chip>
        <Chip value="gluten-free">Gluten free</Chip>
        <Chip value="terrace">Terrace</Chip>
        <Chip value="dogs">Dog friendly</Chip>
        <Chip value="late" disabled>
          Open late
        </Chip>
      </ChipGroup>
      <HStack gap={2} style={{ flexWrap: 'wrap' }}>
        <Chip onDismiss={() => {}}>ada@example.com</Chip>
        <Chip variant="outline" onDismiss={() => {}}>
          grace@example.com
        </Chip>
        <Chip size="sm" onDismiss={() => {}}>
          sm
        </Chip>
      </HStack>
    </VStack>
  ),
  empty: () => (
    <Card>
      <Empty>
        <EmptyMedia icon={<Inbox />} />
        <EmptyTitle>No messages yet</EmptyTitle>
        <EmptyDescription>
          When someone writes to you, the conversation shows up here.
        </EmptyDescription>
        <EmptyActions>
          <Button>Start a conversation</Button>
          <Button variant="ghost">Invite a friend</Button>
        </EmptyActions>
      </Empty>
    </Card>
  ),
}

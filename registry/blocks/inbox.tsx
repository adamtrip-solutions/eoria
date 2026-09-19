import { useMemo, useState } from 'react'
import { FlatList, View, type StyleProp, type ViewStyle } from 'react-native'
import { Archive, MessageCircle, SearchX, Trash2 } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { SearchBar } from '@/components/ui/search-bar'
import { Separator } from '@/components/ui/separator'
import { Swipeable, SwipeableAction } from '@/components/ui/swipeable'
import { Text } from '@/components/ui/text'

export type Conversation = {
  id: string
  name: string
  /** Last message, cut to one line. */
  preview: string
  /** Already formatted, e.g. "09:41" or "Tue". */
  time: string
  /** Number of unread messages. 0 or undefined is read. */
  unread?: number
  avatarUri?: string
  /** Shown until the image loads, or when there is none. Default comes from `name`. */
  initials?: string
}

export type InboxProps = {
  conversations: Conversation[]
  onPressConversation: (conversation: Conversation) => void
  /** Remove the conversation from `conversations` in here. The block keeps no copy. */
  onArchive: (conversation: Conversation) => void
  onDelete: (conversation: Conversation) => void
  /** Adds a "New message" button to the empty state. */
  onCompose?: () => void
  /** Heading above the search bar. Leave it out under a navigation header. */
  title?: string
  /** Pads the top by the safe area. Set to false under a navigation header. Default true. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')

export function Inbox({
  conversations,
  onPressConversation,
  onArchive,
  onDelete,
  onCompose,
  title,
  insetTop = true,
  style,
}: InboxProps) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const results = useMemo(
    () =>
      needle === ''
        ? conversations
        : conversations.filter(
            (c) =>
              c.name.toLowerCase().includes(needle) || c.preview.toLowerCase().includes(needle),
          ),
    [conversations, needle],
  )

  return (
    <View style={[styles.root, insetTop && styles.rootInsetTop, style]}>
      <View style={styles.header}>
        {title ? (
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
        ) : null}
        <SearchBar
          placeholder="Search messages"
          value={query}
          onChangeText={setQuery}
          disabled={conversations.length === 0}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(conversation) => conversation.id}
        contentContainerStyle={styles.content}
        // The first tap on a row or on the clear button counts while the keyboard is up.
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={RowSeparator}
        renderItem={({ item }) => (
          <Row conversation={item} {...{ onPressConversation, onArchive, onDelete }} />
        )}
        ListEmptyComponent={
          needle === '' ? (
            <Empty>
              <EmptyMedia icon={<MessageCircle />} />
              <EmptyTitle>No messages yet</EmptyTitle>
              <EmptyDescription>
                When someone writes to you, the conversation shows up here.
              </EmptyDescription>
              {onCompose ? (
                <EmptyActions>
                  <Button onPress={onCompose}>New message</Button>
                </EmptyActions>
              ) : null}
            </Empty>
          ) : (
            <Empty>
              <EmptyMedia icon={<SearchX />} />
              <EmptyTitle>No results</EmptyTitle>
              <EmptyDescription>
                Nothing matches "{query.trim()}". Try a name or a word from the message.
              </EmptyDescription>
              <EmptyActions>
                <Button variant="outline" onPress={() => setQuery('')}>
                  Clear search
                </Button>
              </EmptyActions>
            </Empty>
          )
        }
      />
    </View>
  )
}

type RowProps = Pick<InboxProps, 'onPressConversation' | 'onArchive' | 'onDelete'> & {
  conversation: Conversation
}

function Row({ conversation, onPressConversation, onArchive, onDelete }: RowProps) {
  const { name, preview, time, avatarUri, initials } = conversation
  const unread = conversation.unread ?? 0
  const spoken = [
    name,
    unread > 0 ? `${unread} unread ${unread === 1 ? 'message' : 'messages'}` : null,
    preview,
    time,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    // Swipeable hands both actions to the row as accessibility actions, so a
    // screen reader reaches Archive and Delete without the swipe.
    <Swipeable
      trailing={
        <>
          <SwipeableAction icon={<Archive />} onPress={() => onArchive(conversation)}>
            Archive
          </SwipeableAction>
          <SwipeableAction
            variant="destructive"
            icon={<Trash2 />}
            onPress={() => onDelete(conversation)}
          >
            Delete
          </SwipeableAction>
        </>
      }
    >
      <Item size="lg" accessibilityLabel={spoken} onPress={() => onPressConversation(conversation)}>
        <ItemMedia variant="avatar">
          <Avatar accessibilityLabel={name}>
            {avatarUri ? <AvatarImage source={{ uri: avatarUri }} /> : null}
            <AvatarFallback>{initials ?? initialsOf(name)}</AvatarFallback>
          </Avatar>
        </ItemMedia>
        <ItemContent>
          <ItemTitle style={unread > 0 ? styles.unreadTitle : undefined}>{name}</ItemTitle>
          <ItemDescription numberOfLines={1} style={unread > 0 ? styles.unreadPreview : undefined}>
            {preview}
          </ItemDescription>
        </ItemContent>
        <View style={styles.meta}>
          <Text variant="caption">{time}</Text>
          {unread > 0 ? (
            <Badge variant="solid">{unread > 99 ? '99+' : String(unread)}</Badge>
          ) : null}
        </View>
      </Item>
    </Swipeable>
  )
}

function RowSeparator() {
  return <Separator style={styles.separator} />
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  rootInsetTop: { paddingTop: rt.insets.top },
  header: {
    gap: theme.space[3],
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[3],
    paddingBottom: theme.space[2],
  },
  /** `flexGrow` lets the empty states fill the space under the search bar. */
  content: { flexGrow: 1, paddingBottom: rt.insets.bottom + theme.space[6] },
  unreadTitle: { fontWeight: theme.fontWeight.semibold },
  unreadPreview: { color: theme.colors.foreground },
  meta: { alignItems: 'flex-end', gap: theme.space[1] },
  /** Starts at the name: row padding, the `md` Avatar, then the row gap. */
  separator: { marginStart: theme.space[4] + theme.space[10] + theme.space[3] },
}))

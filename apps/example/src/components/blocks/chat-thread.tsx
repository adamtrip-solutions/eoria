import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { ArrowLeft, CircleAlert, Paperclip, Send } from 'lucide-react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { KeyboardFooter } from '@/components/ui/keyboard'
import { Text } from '@/components/ui/text'

export type ChatMessage = {
  id: string
  text: string
  sentAt: Date | string
  from: 'me' | 'them'
  status?: 'sending' | 'sent' | 'read' | 'failed'
}
export type ChatParticipant = {
  name: string
  avatarUrl?: string
  initials: string
  presence?: 'online' | 'offline' | string
}
export type ChatThreadProps = {
  /** Chronological order, oldest first. Keep message IDs unique and stable. */
  messages: ChatMessage[]
  participant: ChatParticipant
  onSend: (text: string) => void | Promise<void>
  onRetry?: (id: string) => void | Promise<void>
  onPressAttachment?: () => void | Promise<void>
  onPressHeader?: () => void | Promise<void>
  onBack?: () => void | Promise<void>
  header?: boolean
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

const dateOf = (value: Date | string) => new Date(value)
const dayOf = (message: ChatMessage) => {
  const date = dateOf(message.sentAt)
  return Number.isFinite(date.getTime()) ? date.toDateString() : 'Unknown date'
}
const timeOf = (message: ChatMessage) => {
  const date = dateOf(message.sentAt)
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : 'Unknown time'
}

export function ChatThread({
  messages,
  participant,
  onSend,
  onRetry,
  onPressAttachment,
  onPressHeader,
  onBack,
  header = true,
  insetTop = true,
  style,
}: ChatThreadProps) {
  const { rt } = useUnistyles()
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<string>()
  const [failure, setFailure] = useState<string>()
  // iOS: `automaticallyAdjustKeyboardInsets` reserves the keyboard, so only the composer needs
  // space. Android: the provider stops the window from resizing, so the list pads by the height
  // the keyboard reports as well.
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [footerHeight, setFooterHeight] = useState(0)
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  useEffect(() => {
    const ios = Platform.OS === 'ios'
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height),
    )
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () =>
      setKeyboardHeight(0),
    )
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])
  const keyboardOpen = keyboardHeight > 0
  const listSpace = (Platform.OS === 'ios' ? 0 : keyboardHeight) + footerHeight - rt.insets.bottom
  const rows = useMemo(() => [...messages].reverse(), [messages])
  const run = async (action: string, callback: () => void | Promise<void>, after?: () => void) => {
    if (pending.current) return
    pending.current = true
    setBusy(action)
    setFailure(undefined)
    try {
      await callback()
      if (mounted.current) after?.()
    } catch (error) {
      if (mounted.current) {
        const text =
          error instanceof Error && error.message
            ? error.message
            : 'Something went wrong. Try again.'
        setFailure(text)
        AccessibilityInfo.announceForAccessibility(text)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(undefined)
    }
  }
  const send = () => {
    const text = draft.trim()
    if (!text) return
    void run(
      'send',
      () => onSend(text),
      () => setDraft(''),
    )
  }
  const disabled = busy !== undefined
  const headerLabel = [participant.name, participant.presence].filter(Boolean).join(', ')

  return (
    <View style={[styles.root, insetTop && styles.insetTop, style]}>
      {header ? (
        <View style={styles.header}>
          {onBack ? (
            <IconButton
              variant="ghost"
              icon={<ArrowLeft />}
              accessibilityLabel="Back"
              loading={busy === 'back'}
              disabled={disabled && busy !== 'back'}
              onPress={() => void run('back', onBack)}
            />
          ) : null}
          <Pressable
            accessible
            accessibilityRole={onPressHeader ? 'button' : 'header'}
            accessibilityLabel={headerLabel}
            accessibilityState={{ busy: busy === 'header', disabled: !!onPressHeader && disabled }}
            disabled={!onPressHeader || disabled}
            onPress={() => onPressHeader && void run('header', onPressHeader)}
            style={styles.person}
          >
            <Avatar key={participant.avatarUrl ?? 'initials'} accessibilityLabel={participant.name}>
              <AvatarFallback>{participant.initials}</AvatarFallback>
              {participant.avatarUrl ? (
                <AvatarImage source={{ uri: participant.avatarUrl }} />
              ) : null}
            </Avatar>
            <View style={styles.personCopy}>
              <Text weight="semibold">{participant.name}</Text>
              {participant.presence ? <Text variant="caption">{participant.presence}</Text> : null}
              {busy === 'header' ? (
                <Text variant="caption" accessibilityLiveRegion="polite">
                  Opening profile...
                </Text>
              ) : null}
            </View>
          </Pressable>
        </View>
      ) : null}
      <FlatList
        inverted
        data={rows}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={[
          styles.messages,
          keyboardOpen && styles.keyboardSpace(Math.max(0, listSpace)),
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        // Native insets reserve the keyboard; the extra content padding reserves the
        // composer, whose sticky translation does not resize this list.
        automaticallyAdjustKeyboardInsets
        renderItem={({ item, index }) => {
          const newer = rows[index - 1]
          const older = rows[index + 1]
          const grouped = older?.from === item.from && dayOf(older) === dayOf(item)
          const last = !newer || newer.from !== item.from || dayOf(newer) !== dayOf(item)
          const firstOfDay = !older || dayOf(older) !== dayOf(item)
          const mine = item.from === 'me'
          const time = timeOf(item)
          return (
            <View>
              {firstOfDay ? (
                <Text variant="caption" style={styles.day} accessibilityRole="header">
                  {dayOf(item)}
                </Text>
              ) : null}
              <View
                style={[
                  styles.message,
                  mine ? styles.mineRow : styles.theirsRow,
                  grouped ? styles.grouped : styles.separate,
                ]}
              >
                <View
                  accessible
                  accessibilityLabel={`${mine ? 'You' : participant.name}: ${item.text}, ${time}${item.status ? `, ${item.status}` : ''}`}
                  style={[
                    styles.bubble,
                    mine ? styles.mine : styles.theirs,
                    last && (mine ? styles.mineTail : styles.theirsTail),
                  ]}
                >
                  <Text style={mine ? styles.mineText : undefined}>{item.text}</Text>
                  <Text
                    variant="caption"
                    style={[styles.meta, mine && styles.mineText]}
                  >{`${time}${item.status ? ` · ${item.status}` : ''}`}</Text>
                </View>
                {item.status === 'failed' && onRetry ? (
                  <Button
                    variant="link"
                    size="sm"
                    accessibilityLabel={`Retry message: ${item.text}`}
                    loading={busy === `retry:${item.id}`}
                    disabled={disabled && busy !== `retry:${item.id}`}
                    onPress={() => void run(`retry:${item.id}`, () => onRetry(item.id))}
                  >
                    Retry
                  </Button>
                ) : null}
              </View>
            </View>
          )
        }}
      />
      <KeyboardFooter
        variant="bordered"
        bottomInset={rt.insets.bottom}
        onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
      >
        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />} accessibilityLiveRegion="polite">
            <AlertTitle>Could not complete action</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <InputGroup disabled={disabled} style={styles.composer}>
          {onPressAttachment ? (
            <InputGroupAddon>
              <IconButton
                variant="ghost"
                icon={<Paperclip />}
                accessibilityLabel="Add attachment"
                loading={busy === 'attachment'}
                disabled={disabled && busy !== 'attachment'}
                onPress={() => void run('attachment', onPressAttachment)}
              />
            </InputGroupAddon>
          ) : null}
          <InputGroupInput
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            accessibilityLabel="Message"
            style={styles.composerInput}
          />
          <InputGroupAddon align="end">
            <IconButton
              icon={<Send />}
              accessibilityLabel="Send message"
              loading={busy === 'send'}
              disabled={!draft.trim() || (disabled && busy !== 'send')}
              onPress={send}
            />
          </InputGroupAddon>
        </InputGroup>
      </KeyboardFooter>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingLeft: rt.insets.left,
    paddingRight: rt.insets.right,
  },
  insetTop: { paddingTop: rt.insets.top },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[2],
    padding: theme.space[3],
  },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  personCopy: { flex: 1 },
  list: { flex: 1 },
  messages: { paddingHorizontal: theme.space[4], paddingVertical: theme.space[3] },
  keyboardSpace: (height: number) => ({ paddingTop: theme.space[3] + height }),
  day: { textAlign: 'center', marginVertical: theme.space[4] },
  message: { gap: theme.space[2] },
  mineRow: { alignItems: 'flex-end', paddingStart: theme.space[8] },
  theirsRow: { alignItems: 'flex-start', paddingEnd: theme.space[8] },
  grouped: { marginTop: theme.space[1] },
  separate: { marginTop: theme.space[3] },
  bubble: {
    flexShrink: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.space[3],
    paddingVertical: theme.space[2],
    gap: theme.space[1],
  },
  mine: { backgroundColor: theme.colors.primary },
  theirs: { backgroundColor: theme.colors.muted },
  mineTail: { borderBottomEndRadius: theme.radius.sm },
  theirsTail: { borderBottomStartRadius: theme.radius.sm },
  mineText: { color: theme.colors.primaryForeground },
  meta: { alignSelf: 'flex-end' },
  composer: { paddingHorizontal: theme.space[2], paddingVertical: theme.space[1] },
  composerInput: {
    minHeight: theme.control.md,
    maxHeight: theme.control.lg * 3,
    paddingVertical: theme.space[2],
    textAlignVertical: 'top',
  },
}))

import type { ReactElement } from 'react'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { ChatThread, type ChatMessage, type ChatParticipant } from '@/components/blocks/chat-thread'
import { FeedbackForm, type FeedbackCategory } from '@/components/blocks/feedback-form'

export const chatParticipant: ChatParticipant = {
  name: 'Grace Hopper',
  initials: 'GH',
  presence: 'online',
  avatarUrl: 'https://i.pravatar.cc/200?img=32',
}
export const chatMessages: ChatMessage[] = [
  {
    id: '1',
    text: 'Can you look at the draft tomorrow?',
    sentAt: '2026-09-21T16:00:00',
    from: 'them',
  },
  {
    id: '2',
    text: 'Yes, I will read it over breakfast.',
    sentAt: '2026-09-21T16:01:00',
    from: 'me',
    status: 'read',
  },
  { id: '3', text: 'The new version is ready.', sentAt: '2026-09-22T09:40:00', from: 'them' },
  {
    id: '4',
    text: 'I added your notes to the introduction.',
    sentAt: '2026-09-22T09:41:00',
    from: 'them',
  },
  {
    id: '5',
    text: 'Thanks! The example is much clearer now.',
    sentAt: '2026-09-22T09:42:00',
    from: 'me',
    status: 'read',
  },
  {
    id: '6',
    text: 'Shall we share it with the team?',
    sentAt: '2026-09-22T09:43:00',
    from: 'me',
    status: 'failed',
  },
]
export const feedbackCategories: FeedbackCategory[] = [
  { value: 'design', label: 'Design' },
  { value: 'speed', label: 'Speed' },
  { value: 'other', label: 'Other' },
]
export const feedbackCopy = {
  title: 'How was your experience?',
  description: 'Tell us what worked and what could be better.',
}
const noop = () => {}

export const socialBlockPreviews: Record<string, () => ReactElement> = {
  'chat-thread': () => (
    <ChatThread
      messages={chatMessages}
      participant={chatParticipant}
      onSend={noop}
      onRetry={noop}
      onPressAttachment={noop}
      onPressHeader={noop}
      onBack={noop}
    />
  ),
  'feedback-form': () => (
    <View style={styles.padded}>
      <FeedbackForm {...feedbackCopy} categories={feedbackCategories} askContact onSubmit={noop} />
    </View>
  ),
}
const styles = StyleSheet.create((theme, rt) => ({
  padded: { padding: theme.space[4], paddingTop: rt.insets.top + theme.space[4] },
}))

import { useState } from 'react'
import { Stack } from 'expo-router'
import { Inbox, type Conversation } from '@/components/blocks/inbox'
import { toast } from '@/components/ui/toast'
import { conversations as sample } from '@/previews/blocks-app'

export default function InboxDemo() {
  const [conversations, setConversations] = useState(sample)
  const remove = (conversation: Conversation) =>
    setConversations((list) => list.filter((c) => c.id !== conversation.id))
  return (
    <>
      <Stack.Screen options={{ title: 'Messages' }} />
      <Inbox
        insetTop={false}
        conversations={conversations}
        onPressConversation={(conversation) => toast({ title: `Open ${conversation.name}` })}
        onArchive={(conversation) => {
          remove(conversation)
          toast({ title: `Archived ${conversation.name}` })
        }}
        onDelete={(conversation) => {
          remove(conversation)
          toast({ title: `Deleted ${conversation.name}`, variant: 'destructive' })
        }}
        onCompose={() => toast({ title: 'New message' })}
      />
    </>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Stack, router } from 'expo-router'
import { ChatThread } from '@/components/blocks/chat-thread'
import { toast } from '@/components/ui/toast'
import { chatMessages, chatParticipant } from '@/previews/blocks-social'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
export default function ChatThreadDemo() {
  const [messages, setMessages] = useState(chatMessages)
  const attempts = useRef(0)
  const nextId = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  return (
    <>
      <Stack.Screen options={{ title: 'Chat thread', headerShown: false }} />
      <ChatThread
        participant={chatParticipant}
        messages={messages}
        onBack={() => router.back()}
        onPressHeader={async () => {
          await wait(400)
          toast({ title: chatParticipant.name })
        }}
        onPressAttachment={async () => {
          await wait(400)
          toast({ title: 'Attachment picker', description: 'Connect your file picker here.' })
        }}
        onRetry={async (id) => {
          await wait(800)
          if (!mounted.current) return
          setMessages((current) =>
            current.map((item) => (item.id === id ? { ...item, status: 'sent' } : item)),
          )
          toast({ title: 'Message sent' })
        }}
        onSend={async (text) => {
          await wait(900)
          attempts.current += 1
          if (attempts.current === 1) throw new Error('Your message could not be sent. Try again.')
          if (!mounted.current) return
          nextId.current += 1
          const id = `demo-${nextId.current}`
          setMessages((current) => [
            ...current,
            { id, text, sentAt: new Date(), from: 'me', status: 'sent' },
          ])
          toast({ title: 'Message sent' })
        }}
      />
    </>
  )
}

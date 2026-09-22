import { useRef } from 'react'
import { Stack } from 'expo-router'
import { StyleSheet } from 'react-native-unistyles'
import { FeedbackForm } from '@/components/blocks/feedback-form'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { toast } from '@/components/ui/toast'
import { feedbackCategories, feedbackCopy } from '@/previews/blocks-social'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
export default function FeedbackFormDemo() {
  const attempts = useRef(0)
  return (
    <>
      <Stack.Screen options={{ title: 'Feedback' }} />
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <FeedbackForm
          {...feedbackCopy}
          categories={feedbackCategories}
          askContact
          onSubmit={async () => {
            await wait(1000)
            attempts.current += 1
            if (attempts.current === 1)
              throw new Error('Your feedback could not be sent. Try again.')
            toast({ title: 'Thanks for your feedback' })
          }}
        />
      </KeyboardScrollView>
    </>
  )
}
const styles = StyleSheet.create((theme, rt) => ({
  content: { padding: theme.space[4], paddingBottom: rt.insets.bottom + theme.space[6] },
}))

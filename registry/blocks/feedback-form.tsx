import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { Check, CircleAlert } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyActions,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Rating } from '@/components/ui/rating'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { Textarea } from '@/components/ui/textarea'
import { Toggle, ToggleGroup } from '@/components/ui/toggle-group'

export type FeedbackCategory = { value: string; label: string }
export type FeedbackValues = {
  rating: number
  category?: string
  message: string
  contact: boolean
}
export type FeedbackFormProps = {
  title?: string
  description?: string
  categories?: FeedbackCategory[]
  askContact?: boolean
  onSubmit: (values: FeedbackValues) => void | Promise<void>
  style?: StyleProp<ViewStyle>
}

export function FeedbackForm({
  title = 'How was your experience?',
  description = 'Tell us what worked and what could be better.',
  categories = [],
  askContact = false,
  onSubmit,
  style,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0)
  const [category, setCategory] = useState<string>()
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [complete, setComplete] = useState(false)
  const [failure, setFailure] = useState<string>()
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const ratingError = rating > 0 ? undefined : 'Choose a rating before sending.'
  const submit = async () => {
    if (pending.current) return
    setSubmitted(true)
    if (ratingError) return
    pending.current = true
    setBusy(true)
    setFailure(undefined)
    try {
      const selected = categories.some((item) => item.value === category) ? category : undefined
      await onSubmit({
        rating,
        ...(selected !== undefined ? { category: selected } : {}),
        message: message.trim(),
        contact: askContact && contact,
      })
      if (mounted.current) {
        setComplete(true)
        AccessibilityInfo.announceForAccessibility('Thank you for your feedback.')
      }
    } catch (error) {
      if (mounted.current) {
        const text =
          error instanceof Error && error.message
            ? error.message
            : 'Could not send your feedback. Try again.'
        setFailure(text)
        AccessibilityInfo.announceForAccessibility(text)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  const onReset = () => {
    setRating(0)
    setCategory(undefined)
    setMessage('')
    setContact(false)
    setSubmitted(false)
    setFailure(undefined)
    setComplete(false)
  }

  return (
    <VStack gap={5} style={style}>
      {complete ? (
        <Empty style={styles.thanks} accessibilityLiveRegion="polite">
          <EmptyMedia icon={<Check />} />
          <EmptyTitle>Thank you for your feedback</EmptyTitle>
          <EmptyDescription>Your feedback has been sent.</EmptyDescription>
          <EmptyActions>
            <Button variant="link" onPress={onReset}>
              Send another
            </Button>
          </EmptyActions>
        </Empty>
      ) : (
        <>
          <VStack gap={1}>
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            <Text variant="muted">{description}</Text>
          </VStack>
          {failure ? (
            <Alert variant="destructive" icon={<CircleAlert />} accessibilityLiveRegion="polite">
              <AlertTitle>Could not send feedback</AlertTitle>
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          ) : null}
          <Field invalid={submitted && !!ratingError} disabled={busy}>
            <FieldLabel>Rating, required</FieldLabel>
            <Rating
              value={rating}
              onValueChange={setRating}
              disabled={busy}
              accessibilityLabel="Rating, required"
              accessibilityHint={submitted ? ratingError : undefined}
            />
            <FieldError>{ratingError}</FieldError>
          </Field>
          {categories.length > 0 ? (
            <VStack gap={2}>
              <Text variant="label">Category, optional</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <ToggleGroup
                  type="single"
                  value={category}
                  onValueChange={setCategory}
                  disabled={busy}
                  accessibilityLabel="Feedback category"
                >
                  {categories.map((item) => (
                    <Toggle key={item.value} value={item.value}>
                      {item.label}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </ScrollView>
            </VStack>
          ) : null}
          <Field disabled={busy}>
            <FieldLabel>Tell us more, optional</FieldLabel>
            <FieldControl>
              <Textarea
                value={message}
                onChangeText={setMessage}
                maxLength={500}
                placeholder="What would you change?"
              />
            </FieldControl>
            <Text variant="caption">{`${message.length}/500 characters`}</Text>
          </Field>
          {askContact ? (
            <HStack gap={3}>
              <Checkbox
                checked={contact}
                onCheckedChange={setContact}
                disabled={busy}
                accessibilityLabel="You can contact me about this"
              />
              <Text style={styles.contact} accessible={false}>
                You can contact me about this
              </Text>
            </HStack>
          ) : null}
          <Button width="full" loading={busy} onPress={submit}>
            Send feedback
          </Button>
        </>
      )}
    </VStack>
  )
}

const styles = StyleSheet.create((theme) => ({
  contact: { flexShrink: 1 },
  thanks: { flexGrow: 0, padding: theme.space[0] },
}))

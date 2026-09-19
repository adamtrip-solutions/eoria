import { cloneElement, useState, type ReactElement } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from '@/components/ui/carousel'
import { Text } from '@/components/ui/text'

export type OnboardingSlide = {
  id: string
  /** Any element accepting `size` and `color`, e.g. a lucide icon. The block sets both. */
  icon: ReactElement<{ size?: number; color?: string }>
  title: string
  body: string
}

export type OnboardingProps = {
  slides: OnboardingSlide[]
  /** Called by "Get started" on the last slide. */
  onDone: () => void
  /** Called by Skip. Falls back to `onDone`. */
  onSkip?: () => void
  style?: StyleProp<ViewStyle>
}

const ICON_SIZE = 40

export function Onboarding({ slides, onDone, onSkip, style }: OnboardingProps) {
  const { theme } = useUnistyles()
  // The carousel is controlled. A swipe reports the new page through
  // `onIndexChange`, and Continue sets the next page, which scrolls to it.
  const [index, setIndex] = useState(0)
  const last = index >= slides.length - 1

  return (
    <View style={[styles.root, style]}>
      <View style={styles.bar}>
        {last ? null : (
          <Button variant="ghost" size="sm" onPress={onSkip ?? onDone}>
            Skip
          </Button>
        )}
      </View>

      {/* The ScrollView is as tall as the tallest slide, and `carousel` centres it
          with the dots in the space left. No style goes on the ScrollView itself. */}
      <Carousel index={index} onIndexChange={setIndex} style={styles.carousel}>
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.id}>
              <View style={styles.slide}>
                <View
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                  style={styles.well}
                >
                  {cloneElement(slide.icon, { size: ICON_SIZE, color: theme.colors.foreground })}
                </View>
                <Text variant="heading" accessibilityRole="header" style={styles.centered}>
                  {slide.title}
                </Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselDots />
      </Carousel>

      <View style={styles.footer}>
        <Button width="full" onPress={last ? onDone : () => setIndex(index + 1)}>
          {last ? 'Get started' : 'Continue'}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: rt.insets.top,
    paddingBottom: rt.insets.bottom + theme.space[4],
  },
  /** Keeps its height on the last slide, where Skip goes away, so nothing jumps. */
  bar: {
    minHeight: theme.control.sm + theme.space[4],
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: theme.space[2],
  },
  carousel: { flex: 1, justifyContent: 'center' },
  // No `flex` here. The scroll view takes its height from the slides, and a flexed child
  // of an auto-height parent collapses to nothing.
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.space[3],
    paddingHorizontal: theme.space[8],
  },
  well: {
    width: theme.space[16] + theme.space[8],
    height: theme.space[16] + theme.space[8],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.space[5],
    borderRadius: theme.radius.card,
    backgroundColor: theme.colors.muted,
  },
  centered: { textAlign: 'center' },
  body: { textAlign: 'center', color: theme.colors.mutedForeground },
  footer: { paddingHorizontal: theme.space[5] },
}))

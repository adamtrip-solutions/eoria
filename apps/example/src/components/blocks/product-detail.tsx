import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowLeft, Heart, Share2 } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselDots, CarouselItem } from '@/components/ui/carousel'
import { IconButton } from '@/components/ui/icon-button'
import { Image, type ImageProps } from '@/components/ui/image'
import { Rating } from '@/components/ui/rating'
import { Stepper } from '@/components/ui/stepper'
import { Text } from '@/components/ui/text'
import { Toggle, ToggleGroup } from '@/components/ui/toggle-group'

/** The object source accepted by Image, without a dependency on expo-image here. */
export type ProductImageSource = Extract<NonNullable<ImageProps['source']>, { uri?: string }>
export type ProductOption = { value: string; label: string }
export type ProductSection = { id: string; title: string; body: string }
export type ProductCartValues = { quantity: number; option?: string }

export type ProductDetailProps = {
  images: ProductImageSource[]
  title: string
  price: number
  currency: string
  locale?: string
  rating: number
  ratingCount: number
  badge?: string
  description: string
  stock: number
  sections: ProductSection[]
  options?: ProductOption[]
  value?: string
  onValueChange?: (value: string | undefined) => void | Promise<void>
  onAddToCart: (values: ProductCartValues) => void | Promise<void>
  onBack?: () => void | Promise<void>
  onShare?: () => void | Promise<void>
  onToggleFavourite?: () => void | Promise<void>
  favourite?: boolean
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

export function ProductDetail({
  images,
  title,
  price,
  currency,
  locale,
  rating,
  ratingCount,
  badge,
  description,
  stock,
  sections,
  options,
  value,
  onValueChange,
  onAddToCart,
  onBack,
  onShare,
  onToggleFavourite,
  favourite = false,
  insetTop = true,
  style,
}: ProductDetailProps) {
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState<string>()
  const [failure, setFailure] = useState<string>()
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const available = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0
  const count = Math.min(quantity, Math.max(1, available))
  const option = options?.find((item) => item.value === value)?.value
  const needsOption = !!options?.length && option === undefined
  const money = useMemo(
    () => new Intl.NumberFormat(locale, { style: 'currency', currency }),
    [locale, currency],
  )

  const run = async (action: string, callback: () => void | Promise<void>) => {
    if (pending.current) return
    pending.current = true
    setBusy(action)
    setFailure(undefined)
    try {
      await callback()
    } catch (error) {
      if (mounted.current)
        setFailure(
          error instanceof Error && error.message
            ? error.message
            : 'Something went wrong. Try again.',
        )
    } finally {
      pending.current = false
      if (mounted.current) setBusy(undefined)
    }
  }

  return (
    <View style={[styles.root, insetTop && styles.insetTop, style]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Carousel>
            <CarouselContent>
              {images.map((source, index) => (
                <CarouselItem key={index}>
                  <Image
                    source={source}
                    ratio={1}
                    alt={`${title}, image ${index + 1} of ${images.length}`}
                    fallback={<Text variant="muted">Image unavailable</Text>}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselDots accessibilityLabel="Product image" />
          </Carousel>
          <View pointerEvents="box-none" style={styles.actions}>
            <View>
              {onBack ? (
                <IconButton
                  variant="secondary"
                  icon={<ArrowLeft />}
                  accessibilityLabel="Back"
                  loading={busy === 'back'}
                  disabled={!!busy}
                  onPress={() => void run('back', onBack)}
                />
              ) : null}
            </View>
            <View style={styles.row}>
              {onShare ? (
                <IconButton
                  variant="secondary"
                  icon={<Share2 />}
                  accessibilityLabel="Share product"
                  loading={busy === 'share'}
                  disabled={!!busy}
                  onPress={() => void run('share', onShare)}
                />
              ) : null}
              {onToggleFavourite ? (
                <IconButton
                  variant={favourite ? 'default' : 'secondary'}
                  icon={<Heart />}
                  accessibilityLabel={favourite ? 'Remove from favourites' : 'Add to favourites'}
                  accessibilityState={{ selected: favourite }}
                  loading={busy === 'favourite'}
                  disabled={!!busy}
                  onPress={() => void run('favourite', onToggleFavourite)}
                />
              ) : null}
            </View>
          </View>
        </View>
        <View style={styles.details}>
          {badge ? <Badge>{badge}</Badge> : null}
          <Text variant="heading" accessibilityRole="header">
            {title}
          </Text>
          <Text variant="title">{money.format(price)}</Text>
          <View
            accessible
            accessibilityLabel={`${rating} out of 5 stars, ${ratingCount} reviews`}
            style={styles.row}
          >
            <Rating readOnly size="sm" value={rating} />
            <Text variant="muted">{`${rating} (${ratingCount} reviews)`}</Text>
          </View>
          <Text>{description}</Text>
          {options?.length ? (
            <View style={styles.group}>
              <Text variant="label">Choose an option</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <ToggleGroup
                  type="single"
                  value={option}
                  allowEmpty={false}
                  disabled={!!busy || !onValueChange}
                  accessibilityLabel="Product option"
                  onValueChange={(next) => {
                    if (onValueChange) void run('option', () => onValueChange(next))
                  }}
                >
                  {options.map((item) => (
                    <Toggle key={item.value} value={item.value}>
                      {item.label}
                    </Toggle>
                  ))}
                </ToggleGroup>
              </ScrollView>
              {busy === 'option' ? (
                <Text variant="caption" accessibilityLiveRegion="polite">
                  Updating option…
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={styles.quantity}>
            <Text variant="label">{available === 0 ? 'Out of stock' : 'Quantity'}</Text>
            <Stepper
              min={1}
              max={Math.max(1, available)}
              value={count}
              onValueChange={(next) => {
                if (!pending.current && available > 0) setQuantity(next)
              }}
              disabled={!!busy || available === 0}
              accessibilityLabel="Quantity"
            />
          </View>
          <Accordion>
            {sections.map((section) => (
              <AccordionItem key={section.id} value={section.id}>
                <AccordionTrigger>{section.title}</AccordionTrigger>
                <AccordionContent>{section.body}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </View>
      </ScrollView>
      <View style={styles.bar}>
        {failure ? (
          <Alert variant="destructive" accessibilityLiveRegion="polite">
            <AlertTitle>Could not complete that action</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <View
          accessible
          accessibilityLabel={`Total, ${money.format(price * count)}`}
          style={styles.quantity}
        >
          <Text variant="muted">Total</Text>
          <Text variant="title">{money.format(price * count)}</Text>
        </View>
        <Button
          width="full"
          loading={busy === 'cart'}
          disabled={!!busy || available === 0 || needsOption}
          onPress={() => {
            if (available > 0 && !needsOption)
              void run('cart', () => onAddToCart({ quantity: count, option }))
          }}
        >
          {available === 0 ? 'Out of stock' : needsOption ? 'Choose an option' : 'Add to cart'}
        </Button>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  insetTop: { paddingTop: rt.insets.top },
  content: { paddingBottom: theme.space[6] },
  details: { paddingHorizontal: theme.space[4], gap: theme.space[4] },
  group: { gap: theme.space[2] },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  quantity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.space[3],
  },
  actions: {
    position: 'absolute',
    top: theme.space[3],
    left: theme.space[4],
    right: theme.space[4],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  bar: {
    gap: theme.space[3],
    padding: theme.space[4],
    paddingBottom: rt.insets.bottom + theme.space[4],
    borderTopWidth: theme.stroke,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
}))

import { useEffect, useMemo, useRef, useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { AlertCircle, Tag } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'

export type CheckoutLine = {
  id: string
  title: string
  /** Second line under the title, e.g. a size or a colour. */
  detail?: string
  quantity: number
  /** Price of one unit. */
  price: number
}

export type CheckoutSummaryProps = {
  lines: CheckoutLine[]
  /** Delivery cost. 0 reads "Free". */
  delivery: number
  /** Amount taken off, as a positive number. The row hides at 0 or undefined. */
  discount?: number
  /** Shown next to the discount, e.g. the code that gave it. */
  discountLabel?: string
  /** ISO 4217 code, e.g. "EUR". */
  currency: string
  /** BCP 47 tag for `Intl.NumberFormat`. Default is the device locale. */
  locale?: string
  /**
   * Called with the trimmed code. Check it and pass the result back through `discount`.
   * Return a promise to disable the field until it settles. If it rejects, the error
   * message shows under the field. Leave the prop out to hide the promo row.
   */
  onApplyPromo?: (code: string) => void | Promise<void>
  /** Marks the promo field invalid and shows under it. Wins over a rejection message. */
  promoError?: string
  /**
   * Return a promise and the button shows a spinner until it settles. If it rejects,
   * the error message shows in an Alert above the button until the next attempt.
   */
  onPay: () => void | Promise<void>
  style?: StyleProp<ViewStyle>
}

/** A rejection can be anything. Only an Error with a message is worth showing as is. */
const messageOf = (error: unknown, fallback: string) =>
  error instanceof Error && error.message !== '' ? error.message : fallback

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} style={styles.row}>
      <Text variant={strong ? 'body' : 'muted'} weight={strong ? 'semibold' : undefined}>
        {label}
      </Text>
      <Text
        weight={strong ? 'semibold' : undefined}
        style={[styles.number, strong && styles.total]}
      >
        {value}
      </Text>
    </View>
  )
}

export function CheckoutSummary({
  lines,
  delivery,
  discount = 0,
  discountLabel,
  currency,
  locale,
  onApplyPromo,
  promoError,
  onPay,
  style,
}: CheckoutSummaryProps) {
  const [code, setCode] = useState('')
  const [applying, setApplying] = useState(false)
  const [paying, setPaying] = useState(false)
  const [applyError, setApplyError] = useState<string>()
  const [payError, setPayError] = useState<string>()
  // A payment often ends with a navigation, so the promise can outlive the block.
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const money = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
    return (amount: number) => formatter.format(amount)
  }, [locale, currency])

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0)
  const total = Math.max(0, subtotal + delivery - discount)

  const applyPromo = async () => {
    const trimmed = code.trim()
    if (!onApplyPromo || trimmed === '') return
    setApplying(true)
    setApplyError(undefined)
    try {
      await onApplyPromo(trimmed)
    } catch (error) {
      if (mounted.current) setApplyError(messageOf(error, 'That code could not be applied.'))
    } finally {
      if (mounted.current) setApplying(false)
    }
  }

  const shownPromoError = promoError ?? applyError

  const pay = async () => {
    setPaying(true)
    setPayError(undefined)
    try {
      await onPay()
    } catch (error) {
      if (mounted.current) setPayError(messageOf(error, 'Something went wrong. Try again.'))
    } finally {
      if (mounted.current) setPaying(false)
    }
  }

  return (
    <View style={[styles.root, style]}>
      <Card>
        <CardHeader>
          <CardTitle accessibilityRole="header">Order summary</CardTitle>
        </CardHeader>
        <CardContent style={styles.cardContent}>
          {lines.map((line) => (
            <View
              key={line.id}
              accessible
              accessibilityLabel={`${line.quantity} × ${line.title}, ${money(line.price * line.quantity)}`}
              style={styles.line}
            >
              <View style={styles.lineCopy}>
                <Text numberOfLines={2}>{line.title}</Text>
                <Text variant="muted">
                  {line.detail ? `${line.detail} · Qty ${line.quantity}` : `Qty ${line.quantity}`}
                </Text>
              </View>
              <Text style={styles.number}>{money(line.price * line.quantity)}</Text>
            </View>
          ))}

          <Separator />

          <Row label="Subtotal" value={money(subtotal)} />
          <Row label="Delivery" value={delivery === 0 ? 'Free' : money(delivery)} />
          {discount > 0 ? (
            <Row
              label={discountLabel ? `Discount (${discountLabel})` : 'Discount'}
              value={`−${money(discount)}`}
            />
          ) : null}

          <Separator />

          <Row strong label="Total" value={money(total)} />
        </CardContent>
      </Card>

      {onApplyPromo ? (
        <View style={styles.promo}>
          <InputGroup invalid={shownPromoError !== undefined} disabled={applying || paying}>
            <InputGroupAddon icon={<Tag />} />
            <InputGroupInput
              value={code}
              onChangeText={(text) => {
                setCode(text)
                setApplyError(undefined)
              }}
              onSubmitEditing={applyPromo}
              placeholder="Promo code"
              accessibilityLabel="Promo code"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
            />
            <InputGroupAddon align="end">
              <InputGroupButton disabled={code.trim() === ''} onPress={applyPromo}>
                Apply
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {shownPromoError ? (
            <Text variant="caption" accessibilityLiveRegion="polite" style={styles.promoError}>
              {shownPromoError}
            </Text>
          ) : null}
        </View>
      ) : null}

      {payError ? (
        <Alert variant="destructive" icon={<AlertCircle />}>
          <AlertTitle>Payment failed</AlertTitle>
          <AlertDescription>{payError}</AlertDescription>
        </Alert>
      ) : null}

      <Button width="full" loading={paying} disabled={lines.length === 0} onPress={pay}>
        {paying ? 'Processing' : `Pay ${money(total)}`}
      </Button>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: { gap: theme.space[4] },
  cardContent: { gap: theme.space[3] },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[3] },
  lineCopy: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  number: { fontVariant: ['tabular-nums'] },
  total: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
  promo: { gap: theme.space[1] },
  promoError: { color: theme.colors.destructiveText, paddingHorizontal: theme.space[1] },
}))

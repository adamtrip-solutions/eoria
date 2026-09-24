import { cloneElement, useEffect, useRef, useState, type ReactElement } from 'react'
import { FlatList, View, type StyleProp, type ViewStyle } from 'react-native'
import { Check, X } from 'lucide-react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { IconButton } from '@/components/ui/icon-button'
import { RadioGroup } from '@/components/ui/radio-group'
import { Text } from '@/components/ui/text'

export type PaywallFeature = {
  icon?: ReactElement<{ size?: number; color?: string }>
  title: string
  description?: string
}
/** Monetary copy is already formatted, e.g. price: '€39.99', period: 'year'. */
export type PaywallPlan = {
  id: string
  title: string
  price: string
  period: string
  badge?: string
  description?: string
  perMonth?: string
}
export type PaywallProps = {
  title: string
  subtitle: string
  features: PaywallFeature[]
  plans: PaywallPlan[]
  ctaLabel?: string
  onSelectPlan: (planId: string) => void | Promise<void>
  onRestore?: () => void | Promise<void>
  onTerms?: () => void | Promise<void>
  onPrivacy?: () => void | Promise<void>
  onClose?: () => void | Promise<void>
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

type PaywallRow =
  | { kind: 'feature'; key: string; feature: PaywallFeature }
  | { kind: 'plan'; key: string; plan: PaywallPlan }

export function Paywall({
  title,
  subtitle,
  features,
  plans,
  ctaLabel = 'Continue',
  onSelectPlan,
  onRestore,
  onTerms,
  onPrivacy,
  onClose,
  insetTop = true,
  style,
}: PaywallProps) {
  const { theme } = useUnistyles()
  const preferred = plans.find((plan) => plan.badge)?.id ?? plans[0]?.id
  const [choice, setChoice] = useState(preferred)
  const selected = plans.some((plan) => plan.id === choice) ? choice : preferred
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
  const rows: PaywallRow[] = [
    ...features.map((feature, index): PaywallRow => ({
      kind: 'feature',
      key: `feature-${index}`,
      feature,
    })),
    ...plans.map((plan): PaywallRow => ({ kind: 'plan', key: `plan-${plan.id}`, plan })),
  ]
  return (
    <View style={[styles.root, insetTop && styles.insetTop, style]}>
      {onClose ? (
        <View style={styles.close}>
          <IconButton
            variant="ghost"
            icon={<X />}
            accessibilityLabel="Close"
            loading={busy === 'close'}
            disabled={!!busy && busy !== 'close'}
            onPress={() => void run('close', onClose)}
          />
        </View>
      ) : null}
      <RadioGroup
        value={selected ?? ''}
        onValueChange={setChoice}
        disabled={!!busy}
        accessibilityLabel="Subscription plans"
        style={styles.list}
      >
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          extraData={{ selected, busy }}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.heading}>
              <Text variant="heading" accessibilityRole="header">
                {title}
              </Text>
              <Text variant="muted">{subtitle}</Text>
            </View>
          }
          renderItem={({ item }) =>
            item.kind === 'feature' ? (
              <View
                accessible
                accessibilityLabel={[item.feature.title, item.feature.description]
                  .filter(Boolean)
                  .join('. ')}
                style={styles.feature}
              >
                {cloneElement(item.feature.icon ?? <Check />, {
                  size: theme.space[6],
                  color: theme.colors.primary,
                })}
                <View style={styles.copy}>
                  <Text weight="semibold">{item.feature.title}</Text>
                  {item.feature.description ? (
                    <Text variant="muted">{item.feature.description}</Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Card
                accessible
                accessibilityRole="radio"
                accessibilityState={{ checked: selected === item.plan.id, disabled: !!busy }}
                accessibilityLabel={[
                  item.plan.title,
                  `${item.plan.price} per ${item.plan.period}`,
                  item.plan.badge,
                  item.plan.description,
                  item.plan.perMonth,
                ]
                  .filter(Boolean)
                  .join('. ')}
                onPress={() => {
                  if (!pending.current) setChoice(item.plan.id)
                }}
                style={[styles.plan, selected === item.plan.id && styles.selected]}
              >
                <CardContent style={styles.planContent}>
                  <View style={styles.planHeading}>
                    <Text weight="semibold" style={styles.copy}>
                      {item.plan.title}
                    </Text>
                    {selected === item.plan.id ? (
                      <Check size={theme.space[5]} color={theme.colors.primary} />
                    ) : null}
                  </View>
                  {item.plan.badge ? <Badge>{item.plan.badge}</Badge> : null}
                  <Text variant="title">{`${item.plan.price} / ${item.plan.period}`}</Text>
                  {item.plan.perMonth ? <Text variant="caption">{item.plan.perMonth}</Text> : null}
                  {item.plan.description ? (
                    <Text variant="muted">{item.plan.description}</Text>
                  ) : null}
                </CardContent>
              </Card>
            )
          }
          ListFooterComponent={
            plans.length === 0 ? (
              <Text variant="muted">No plans are available right now.</Text>
            ) : null
          }
        />
      </RadioGroup>
      <View style={styles.footer}>
        {failure ? (
          <Alert variant="destructive" accessibilityLiveRegion="polite">
            <AlertTitle>Could not complete that action</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <Button
          width="full"
          loading={busy === 'select'}
          disabled={selected === undefined || (!!busy && busy !== 'select')}
          onPress={() => {
            if (selected !== undefined) void run('select', () => onSelectPlan(selected))
          }}
        >
          {ctaLabel}
        </Button>
        {onRestore || onTerms || onPrivacy ? (
          <View style={styles.links}>
            {onRestore ? (
              <Button
                variant="link"
                size="sm"
                loading={busy === 'restore'}
                disabled={!!busy && busy !== 'restore'}
                onPress={() => void run('restore', onRestore)}
              >
                Restore purchases
              </Button>
            ) : null}
            {onTerms ? (
              <Button
                variant="link"
                size="sm"
                accessibilityRole="link"
                loading={busy === 'terms'}
                disabled={!!busy && busy !== 'terms'}
                onPress={() => void run('terms', onTerms)}
              >
                Terms
              </Button>
            ) : null}
            {onPrivacy ? (
              <Button
                variant="link"
                size="sm"
                accessibilityRole="link"
                loading={busy === 'privacy'}
                disabled={!!busy && busy !== 'privacy'}
                onPress={() => void run('privacy', onPrivacy)}
              >
                Privacy
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  insetTop: { paddingTop: rt.insets.top },
  list: { flex: 1 },
  close: { alignItems: 'flex-end', paddingHorizontal: theme.space[4] },
  content: { padding: theme.space[6], gap: theme.space[4] },
  heading: { gap: theme.space[2], paddingBottom: theme.space[4] },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.space[3] },
  copy: { flex: 1, gap: theme.space[1] },
  plan: { borderWidth: theme.stroke, borderColor: theme.colors.border },
  selected: { borderColor: theme.colors.primary },
  planContent: { gap: theme.space[2] },
  planHeading: { flexDirection: 'row', alignItems: 'center', gap: theme.space[3] },
  footer: {
    padding: theme.space[4],
    paddingBottom: rt.insets.bottom + theme.space[4],
    gap: theme.space[4],
  },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: theme.space[4] },
}))

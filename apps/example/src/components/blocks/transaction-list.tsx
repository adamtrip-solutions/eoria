import { useMemo, type ReactElement } from 'react'
import { SectionList, View, type StyleProp, type ViewStyle } from 'react-native'
import { Receipt } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item'
import { Separator } from '@/components/ui/separator'
import { Text } from '@/components/ui/text'

export type Transaction = {
  id: string
  /** Group label, e.g. "Today" or "12 September". Rows with the same label share a section. */
  day: string
  title: string
  subtitle?: string
  /** Positive is money in, negative is money out. */
  amount: number
  /** Any element accepting `size` and `color`, e.g. a lucide icon. Wins over `initials`. */
  icon?: ReactElement<{ size?: number; color?: string }>
  /** Shown in an Avatar when there is no icon. Default comes from `title`. */
  initials?: string
}

export type TransactionListProps = {
  /** In display order. Sections appear in the order their `day` first shows up. */
  transactions: Transaction[]
  /** ISO 4217 code, e.g. "EUR". */
  currency: string
  /** BCP 47 tag for `Intl.NumberFormat`. Default is the device locale. */
  locale?: string
  onPressTransaction?: (transaction: Transaction) => void
  /** Rendered above the first section, e.g. a balance card. */
  header?: ReactElement
  /** Pads the top by the safe area. Set to false under a navigation header. Default true. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

type DaySection = { title: string; data: Transaction[] }

const initialsOf = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')

export function TransactionList({
  transactions,
  currency,
  locale,
  onPressTransaction,
  header,
  insetTop = true,
  style,
}: TransactionListProps) {
  const sections = useMemo(() => {
    const byDay = new Map<string, DaySection>()
    for (const transaction of transactions) {
      const section = byDay.get(transaction.day)
      if (section) section.data.push(transaction)
      else byDay.set(transaction.day, { title: transaction.day, data: [transaction] })
    }
    return [...byDay.values()]
  }, [transactions])

  const format = useMemo(() => {
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency })
    return (amount: number) => formatter.format(Math.abs(amount))
  }, [locale, currency])

  return (
    <SectionList
      style={[styles.root, style]}
      contentContainerStyle={[styles.content, insetTop && styles.contentInsetTop]}
      sections={sections}
      keyExtractor={(transaction) => transaction.id}
      ListHeaderComponent={header}
      ItemSeparatorComponent={RowSeparator}
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text variant="label" accessibilityRole="header" style={styles.sectionTitle}>
            {section.title}
          </Text>
        </View>
      )}
      renderItem={({ item }) => {
        const incoming = item.amount > 0
        const value = format(item.amount)
        // The sign carries the direction, so it does not rest on colour alone.
        const signed = incoming ? `+${value}` : item.amount < 0 ? `−${value}` : value
        const spoken = incoming ? `received ${value}` : `paid ${value}`
        return (
          <Item
            size="lg"
            onPress={onPressTransaction ? () => onPressTransaction(item) : undefined}
            accessible
            accessibilityLabel={[item.title, item.subtitle, spoken].filter(Boolean).join(', ')}
          >
            {item.icon ? (
              <ItemMedia style={styles.media}>{item.icon}</ItemMedia>
            ) : (
              <ItemMedia variant="avatar">
                <Avatar accessibilityLabel={item.title}>
                  <AvatarFallback>{item.initials ?? initialsOf(item.title)}</AvatarFallback>
                </Avatar>
              </ItemMedia>
            )}
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              {item.subtitle ? <ItemDescription>{item.subtitle}</ItemDescription> : null}
            </ItemContent>
            <Text
              weight={incoming ? 'semibold' : 'normal'}
              style={[styles.amount, incoming && styles.amountIn]}
            >
              {signed}
            </Text>
          </Item>
        )
      }}
      ListEmptyComponent={
        <Empty>
          <EmptyMedia icon={<Receipt />} />
          <EmptyTitle>No transactions yet</EmptyTitle>
          <EmptyDescription>Payments and transfers show up here as they happen.</EmptyDescription>
        </Empty>
      }
    />
  )
}

function RowSeparator() {
  return <Separator style={styles.separator} />
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  /** `flexGrow` lets the empty state fill the screen and centre itself. */
  content: { flexGrow: 1, paddingBottom: rt.insets.bottom + theme.space[6] },
  contentInsetTop: { paddingTop: rt.insets.top },
  /** Opaque, because section headers stick to the top on iOS. */
  sectionHeader: {
    paddingHorizontal: theme.space[4],
    paddingTop: theme.space[5],
    paddingBottom: theme.space[2],
    backgroundColor: theme.colors.background,
  },
  sectionTitle: { color: theme.colors.mutedForeground },
  /** As wide as the `md` Avatar, so icon rows and initials rows line up. */
  media: { width: theme.space[10], height: theme.space[10], borderRadius: theme.radius.full },
  amount: { fontVariant: ['tabular-nums'] },
  amountIn: { color: theme.colors.primary },
  /** Starts at the title: row padding, media, then the row gap. */
  separator: { marginStart: theme.space[4] + theme.space[10] + theme.space[3] },
}))

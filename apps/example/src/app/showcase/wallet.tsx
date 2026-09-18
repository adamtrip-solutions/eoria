import { useState } from 'react'
import { Pressable, View } from 'react-native'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Screen } from '@/components/screen'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

type Transaction = {
  id: string
  name: string
  category: string
  when: string
  amount: number
  emoji: string
}

const transactions: Transaction[] = [
  {
    id: '1',
    name: 'Pizzeria Lupita',
    category: 'Eating out',
    when: 'Today, 19:42',
    amount: -31.4,
    emoji: '🍕',
  },
  {
    id: '2',
    name: 'Carris Metropolitana',
    category: 'Transport',
    when: 'Today, 08:15',
    amount: -1.85,
    emoji: '🚌',
  },
  {
    id: '3',
    name: 'Adamtrip Solutions',
    category: 'Salary',
    when: 'Yesterday',
    amount: 2840,
    emoji: '💼',
  },
  {
    id: '4',
    name: 'Pingo Doce',
    category: 'Groceries',
    when: 'Yesterday',
    amount: -46.12,
    emoji: '🛒',
  },
  {
    id: '5',
    name: 'Copenhagen Coffee Lab',
    category: 'Eating out',
    when: 'Sunday',
    amount: -4.2,
    emoji: '☕',
  },
]

const budgets = [
  { name: 'Groceries', spent: 312, limit: 400 },
  { name: 'Transport', spent: 48, limit: 80 },
  { name: 'Eating out', spent: 205, limit: 150 },
]

const actions = [
  { label: 'Send', icon: <ArrowUpRight /> },
  { label: 'Request', icon: <ArrowDownLeft /> },
  { label: 'Top up', icon: <Plus /> },
  { label: 'Card', icon: <CreditCard /> },
]

/** Euro amounts the Portuguese way: thousands with a dot, cents with a comma. */
const euro = (n: number, sign = false) => {
  const abs = Math.abs(n)
  const [int, cents] = abs.toFixed(2).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const prefix = n < 0 ? '−' : sign ? '+' : ''
  return `${prefix}€${grouped},${cents}`
}

export default function WalletScreen() {
  const [selected, setSelected] = useState(transactions[0])
  const [open, setOpen] = useState(false)
  const show = (t: Transaction) => {
    setSelected(t)
    setOpen(true)
  }
  return (
    <Screen>
      <Card styles={{ root: styles.balanceCard }}>
        <CardContent style={styles.balanceContent}>
          <Text variant="label" style={styles.onPrimaryMuted}>
            Main account
          </Text>
          <Text style={styles.balance} maxFontSizeMultiplier={1.2}>
            €4.280,16
          </Text>
          <HStack gap={2}>
            <Badge
              variant="outline"
              styles={{ root: styles.onPrimaryBadge, label: styles.onPrimary }}
            >
              +€312,40
            </Badge>
            <Text variant="caption" style={styles.onPrimaryMuted}>
              this month
            </Text>
          </HStack>
        </CardContent>
      </Card>

      <HStack justify="space-between">
        {actions.map((a) => (
          <VStack key={a.label} align="center" gap={2}>
            <Button
              variant="secondary"
              size="icon"
              icon={a.icon}
              accessibilityLabel={a.label}
              onPress={() => toast({ title: `${a.label} is a demo` })}
            />
            <Text variant="caption">{a.label}</Text>
          </VStack>
        ))}
      </HStack>

      <Card>
        <CardHeader>
          <CardTitle>September budget</CardTitle>
          <CardDescription>€1.140 left of €2.000. Eating out is over by €55.</CardDescription>
        </CardHeader>
        <CardContent style={styles.budgets}>
          {budgets.map((b) => {
            const over = b.spent > b.limit
            return (
              <VStack key={b.name} gap={2}>
                <HStack justify="space-between">
                  <Text variant="label">{b.name}</Text>
                  <Text variant="muted">
                    {over ? (
                      <Text variant="label" style={styles.over}>
                        {euro(b.spent)}
                      </Text>
                    ) : (
                      euro(b.spent)
                    )}{' '}
                    / {euro(b.limit)}
                  </Text>
                </HStack>
                <Progress
                  value={b.spent}
                  max={b.limit}
                  size="sm"
                  accessibilityLabel={`${b.name}, ${euro(b.spent)} of ${euro(b.limit)}`}
                  styles={over ? { indicator: styles.overIndicator } : undefined}
                />
              </VStack>
            )
          })}
        </CardContent>
      </Card>

      <VStack gap={3}>
        <HStack justify="space-between">
          <Text variant="title">Recent</Text>
          <Button variant="link" size="sm" onPress={() => toast({ title: 'All transactions' })}>
            See all
          </Button>
        </HStack>
        <Card>
          <CardContent style={styles.list}>
            {transactions.map((t, i) => (
              <View key={t.id}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t.name}, ${euro(t.amount, true)}, ${t.when}`}
                  onPress={() => show(t)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <Avatar shape="rounded" accessibilityLabel={t.category}>
                    <AvatarFallback style={styles.emoji}>{t.emoji}</AvatarFallback>
                  </Avatar>
                  <VStack flex={1} gap={0}>
                    <Text weight="medium" numberOfLines={1}>
                      {t.name}
                    </Text>
                    <Text variant="caption">{t.when}</Text>
                  </VStack>
                  <Text weight={t.amount > 0 ? 'semibold' : 'normal'}>{euro(t.amount, true)}</Text>
                </Pressable>
                {i < transactions.length - 1 ? <Separator /> : null}
              </View>
            ))}
          </CardContent>
        </Card>
      </VStack>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <HStack gap={3}>
              <Avatar shape="rounded" size="lg" accessibilityLabel={selected.category}>
                <AvatarFallback style={styles.emojiLg}>{selected.emoji}</AvatarFallback>
              </Avatar>
              <VStack flex={1} gap={0}>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.when}</DialogDescription>
              </VStack>
            </HStack>
          </DialogHeader>
          <VStack gap={1} align="center" py={2}>
            <Text style={styles.amount} maxFontSizeMultiplier={1.2}>
              {euro(selected.amount, true)}
            </Text>
            <Badge variant="secondary">{selected.category}</Badge>
          </VStack>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                width="full"
                onPress={() =>
                  toast({ title: 'Split request sent', description: 'Ana and Rui got a link.' })
                }
              >
                Split with friends
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                variant="ghost"
                width="full"
                onPress={() => toast({ title: 'We will look into it' })}
              >
                Report a problem
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  balanceCard: { backgroundColor: theme.colors.primary },
  balanceContent: { paddingTop: theme.space[5], gap: theme.space[1] },
  balance: {
    color: theme.colors.primaryForeground,
    fontSize: 44,
    lineHeight: 52,
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -1.2,
    fontVariant: ['tabular-nums'],
  },
  onPrimary: { color: theme.colors.primaryForeground },
  onPrimaryMuted: { color: theme.colors.primaryForeground, opacity: 0.72 },
  onPrimaryBadge: { borderColor: theme.colors.primaryForeground, opacity: 0.9 },
  budgets: { gap: theme.space[4] },
  over: { color: theme.colors.destructive },
  overIndicator: { backgroundColor: theme.colors.destructive },
  list: { paddingTop: theme.space[1], paddingBottom: theme.space[1] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space[3],
    paddingVertical: theme.space[3],
  },
  rowPressed: { opacity: 0.6 },
  emoji: { fontSize: 18, lineHeight: 24 },
  emojiLg: { fontSize: 26, lineHeight: 32 },
  amount: {
    fontSize: theme.fontSize['3xl'],
    lineHeight: theme.lineHeight['3xl'],
    fontWeight: theme.fontWeight.bold,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
}))

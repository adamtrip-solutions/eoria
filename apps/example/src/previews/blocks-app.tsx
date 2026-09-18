// Previews for the app blocks. Merged into `previews` in ../previews.tsx.
// The sample data is exported so the demo routes in ../app/blocks use the same.
import type { ReactElement } from 'react'
import { View } from 'react-native'
import {
  Bell,
  Bus,
  Coffee,
  CreditCard,
  Globe,
  HelpCircle,
  Lock,
  Moon,
  MoreHorizontal,
  PiggyBank,
  ShieldCheck,
  ShoppingCart,
  Utensils,
} from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { CheckoutSummary, type CheckoutLine } from '@/components/blocks/checkout-summary'
import { Inbox, type Conversation } from '@/components/blocks/inbox'
import { Onboarding, type OnboardingSlide } from '@/components/blocks/onboarding'
import { ProfileHeader, type ProfileStat } from '@/components/blocks/profile-header'
import { SettingsScreen, type SettingsSection } from '@/components/blocks/settings-screen'
import { TransactionList, type Transaction } from '@/components/blocks/transaction-list'

const noop = () => {}

type SettingsHandlers = {
  push: boolean
  onPushChange: (value: boolean) => void
  dark: boolean
  onDarkChange: (value: boolean) => void
  onOpen: (title: string) => void
}

export const settingsSections = ({
  push,
  onPushChange,
  dark,
  onDarkChange,
  onOpen,
}: SettingsHandlers): SettingsSection[] => [
  {
    id: 'general',
    label: 'General',
    rows: [
      {
        kind: 'link',
        id: 'language',
        title: 'Language',
        icon: <Globe />,
        value: 'English',
        onPress: () => onOpen('Language'),
      },
      {
        kind: 'switch',
        id: 'dark',
        title: 'Dark mode',
        icon: <Moon />,
        value: dark,
        onValueChange: onDarkChange,
      },
    ],
  },
  {
    id: 'notifications',
    label: 'Notifications',
    footer: 'Notifications respect your Focus settings.',
    rows: [
      {
        kind: 'switch',
        id: 'push',
        title: 'Push notifications',
        description: 'Mentions, replies and follows',
        icon: <Bell />,
        value: push,
        onValueChange: onPushChange,
      },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    rows: [
      {
        kind: 'link',
        id: 'password',
        title: 'Password',
        icon: <Lock />,
        onPress: () => onOpen('Password'),
      },
      {
        kind: 'link',
        id: 'payment',
        title: 'Payment methods',
        icon: <CreditCard />,
        value: 'Visa 4242',
        onPress: () => onOpen('Payment methods'),
      },
      {
        kind: 'action',
        id: 'help',
        title: 'Contact support',
        icon: <HelpCircle />,
        onPress: () => onOpen('Contact support'),
      },
    ],
  },
]

export const profileStats: ProfileStat[] = [
  { label: 'Posts', value: '48' },
  { label: 'Followers', value: '12.4k' },
  { label: 'Following', value: '310' },
]

export const profile = {
  name: 'Ada Lovelace',
  handle: 'ada',
  bio: 'Writes about analytical engines and component libraries. London.',
  avatarUri: 'https://i.pravatar.cc/200?img=47',
}

export const onboardingSlides: OnboardingSlide[] = [
  {
    id: 'track',
    icon: <PiggyBank />,
    title: 'See where it goes',
    body: 'Every payment lands in a category, so the month adds up without a spreadsheet.',
  },
  {
    id: 'alerts',
    icon: <Bell />,
    title: 'Hear about it first',
    body: 'A notification arrives the moment your card is used, at home or abroad.',
  },
  {
    id: 'safe',
    icon: <ShieldCheck />,
    title: 'Freeze it in one tap',
    body: 'Lost your card? Freeze it from the app and unfreeze it when it turns up.',
  },
]

export const transactions: Transaction[] = [
  {
    id: '1',
    day: 'Today',
    title: 'Pizzeria Lupita',
    subtitle: 'Eating out · 19:42',
    amount: -31.4,
    icon: <Utensils />,
  },
  {
    id: '2',
    day: 'Today',
    title: 'Carris Metropolitana',
    subtitle: 'Transport · 08:15',
    amount: -1.85,
    icon: <Bus />,
  },
  {
    id: '3',
    day: 'Yesterday',
    title: 'Adamtrip Solutions',
    subtitle: 'Salary',
    amount: 2840,
  },
  {
    id: '4',
    day: 'Yesterday',
    title: 'Pingo Doce',
    subtitle: 'Groceries · 18:03',
    amount: -46.12,
    icon: <ShoppingCart />,
  },
  {
    id: '5',
    day: 'Sunday',
    title: 'Copenhagen Coffee Lab',
    subtitle: 'Eating out · 10:20',
    amount: -4.2,
    icon: <Coffee />,
  },
  {
    id: '6',
    day: 'Sunday',
    title: 'Grace Hopper',
    subtitle: 'Split for dinner',
    amount: 18.5,
  },
]

export const checkoutLines: CheckoutLine[] = [
  { id: 'hoodie', title: 'Recipe hoodie', detail: 'Size M', quantity: 1, price: 64 },
  { id: 'stickers', title: 'Slot sticker pack', quantity: 2, price: 6 },
]

export const conversations: Conversation[] = [
  {
    id: '1',
    name: 'Grace Hopper',
    preview: 'Found the bug. It was an actual moth this time.',
    time: '09:41',
    unread: 2,
    avatarUri: 'https://i.pravatar.cc/200?img=32',
  },
  {
    id: '2',
    name: 'Alan Turing',
    preview: 'Can you look at the draft before Friday?',
    time: '08:12',
    unread: 1,
  },
  {
    id: '3',
    name: 'Design team',
    preview: 'Katherine: the new icons are in the shared folder',
    time: 'Tue',
    initials: 'DT',
  },
  {
    id: '4',
    name: 'Margaret Hamilton',
    preview: 'Thanks, that fixed the build.',
    time: 'Mon',
    avatarUri: 'https://i.pravatar.cc/200?img=44',
  },
  {
    id: '5',
    name: 'Linus Torvalds',
    preview: 'Sent you the patch. Tell me if it applies.',
    time: '12 Sep',
  },
]

export const appBlockPreviews: Record<string, () => ReactElement> = {
  'settings-screen': () => (
    <SettingsScreen
      title="Settings"
      version="2.4.1"
      sections={settingsSections({
        push: true,
        onPushChange: noop,
        dark: false,
        onDarkChange: noop,
        onOpen: noop,
      })}
      onSignOut={noop}
    />
  ),
  'profile-header': () => (
    <View style={styles.padded}>
      <ProfileHeader
        {...profile}
        stats={profileStats}
        primaryAction={{ label: 'Follow', onPress: noop }}
        secondaryAction={{ icon: <MoreHorizontal />, label: 'More actions', onPress: noop }}
      />
    </View>
  ),
  onboarding: () => <Onboarding slides={onboardingSlides} onDone={noop} />,
  'transaction-list': () => (
    <TransactionList transactions={transactions} currency="EUR" locale="en-IE" />
  ),
  'checkout-summary': () => (
    <View style={styles.padded}>
      <CheckoutSummary
        lines={checkoutLines}
        delivery={4.5}
        discount={7.6}
        discountLabel="WELCOME10"
        currency="EUR"
        locale="en-IE"
        onApplyPromo={noop}
        onPay={noop}
      />
    </View>
  ),
  inbox: () => (
    <Inbox
      title="Messages"
      conversations={conversations}
      onPressConversation={noop}
      onArchive={noop}
      onDelete={noop}
    />
  ),
}

const styles = StyleSheet.create((theme, rt) => ({
  // A section has no insets of its own, and the preview canvas gives it the whole window.
  padded: { padding: theme.space[4], paddingTop: rt.insets.top + theme.space[4] },
}))

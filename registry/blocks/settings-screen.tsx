import { useState, type ReactElement } from 'react'
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native'
import { LogOut } from 'lucide-react-native'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Item,
  ItemChevron,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemGroupFooter,
  ItemGroupLabel,
  ItemMedia,
  ItemTitle,
  ItemTrailing,
} from '@/components/ui/item'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'

/** Any element accepting `size` and `color`, e.g. a lucide icon. */
type IconElement = ReactElement<{ size?: number; color?: string }>

type RowBase = {
  id: string
  title: string
  description?: string
  icon?: IconElement
  disabled?: boolean
}

export type SettingsLinkRow = RowBase & {
  kind: 'link'
  /** Current value, shown before the chevron. */
  value?: string
  onPress: () => void
}

export type SettingsSwitchRow = RowBase & {
  kind: 'switch'
  value: boolean
  onValueChange: (value: boolean) => void
}

export type SettingsActionRow = RowBase & {
  kind: 'action'
  /** Paints the title and icon in the destructive colour. */
  destructive?: boolean
  onPress: () => void
}

export type SettingsRow = SettingsLinkRow | SettingsSwitchRow | SettingsActionRow

export type SettingsSection = {
  id: string
  label?: string
  footer?: string
  rows: SettingsRow[]
}

export type SettingsScreenProps = {
  sections: SettingsSection[]
  /** Runs after the user confirms in the alert. */
  onSignOut: () => void
  /** Large heading above the first section. Leave it out under a navigation header. */
  title?: string
  /** Shown under the last group, as in "Version 2.4.1". */
  version?: string
  /** Pads the top by the safe area. Set to false under a navigation header. Default true. */
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

function Row({ row }: { row: SettingsRow }) {
  // ItemMedia reads the icon colour in JS, so it comes from the live theme.
  const { theme } = useUnistyles()
  const destructive = row.kind === 'action' && row.destructive === true
  const media = row.icon ? (
    <ItemMedia styles={destructive ? { icon: { color: theme.colors.destructiveText } } : undefined}>
      {row.icon}
    </ItemMedia>
  ) : null
  const content = (
    <ItemContent>
      <ItemTitle style={destructive ? styles.destructive : undefined}>{row.title}</ItemTitle>
      {row.description ? <ItemDescription>{row.description}</ItemDescription> : null}
    </ItemContent>
  )

  if (row.kind === 'switch') {
    // No `onPress` on the row, so the Switch stays its own element for screen readers.
    return (
      <Item disabled={row.disabled}>
        {media}
        {content}
        <ItemTrailing>
          <Switch
            checked={row.value}
            onCheckedChange={row.onValueChange}
            disabled={row.disabled}
            accessibilityLabel={row.title}
          />
        </ItemTrailing>
      </Item>
    )
  }

  return (
    <Item onPress={row.onPress} disabled={row.disabled}>
      {media}
      {content}
      {row.kind === 'link' && row.value ? <ItemTrailing>{row.value}</ItemTrailing> : null}
      {row.kind === 'link' ? <ItemChevron /> : null}
    </Item>
  )
}

export function SettingsScreen({
  sections,
  onSignOut,
  title,
  version,
  insetTop = true,
  style,
}: SettingsScreenProps) {
  const { theme } = useUnistyles()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <ScrollView
        style={[styles.root, style]}
        contentContainerStyle={[styles.content, insetTop && styles.contentInsetTop]}
      >
        {title ? (
          <Text variant="heading" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        ) : null}

        {sections.map((section) => (
          <ItemGroup key={section.id}>
            {section.label ? <ItemGroupLabel>{section.label}</ItemGroupLabel> : null}
            {section.rows.map((row) => (
              <Row key={row.id} row={row} />
            ))}
            {section.footer ? <ItemGroupFooter>{section.footer}</ItemGroupFooter> : null}
          </ItemGroup>
        ))}

        <ItemGroup>
          <Item onPress={() => setConfirming(true)}>
            <ItemMedia styles={{ icon: { color: theme.colors.destructiveText } }}>
              <LogOut />
            </ItemMedia>
            <ItemContent>
              <ItemTitle style={styles.destructive}>Sign out</ItemTitle>
            </ItemContent>
          </Item>
        </ItemGroup>

        {version ? (
          <Text variant="caption" style={styles.version}>
            Version {version}
          </Text>
        ) : null}
      </ScrollView>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need your password to sign in again on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="destructive" onPress={onSignOut}>
              Sign out
            </AlertDialogAction>
            <AlertDialogCancel>Stay signed in</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  content: {
    gap: theme.space[6],
    paddingTop: theme.space[4],
    paddingHorizontal: theme.space[4],
    paddingBottom: rt.insets.bottom + theme.space[8],
  },
  contentInsetTop: { paddingTop: rt.insets.top + theme.space[4] },
  title: { paddingHorizontal: theme.space[1] },
  destructive: { color: theme.colors.destructiveText },
  version: { textAlign: 'center' },
}))

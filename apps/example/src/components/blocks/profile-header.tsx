import type { ReactElement } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Text } from '@/components/ui/text'

export type ProfileStat = {
  label: string
  /** Already formatted, e.g. "12.4k". */
  value: string
}

export type ProfilePrimaryAction = {
  label: string
  onPress: () => void
  /** `secondary` suits a settled state such as "Following". Default `default`. */
  variant?: 'default' | 'secondary' | 'outline'
}

export type ProfileSecondaryAction = {
  /** Any element accepting `size` and `color`, e.g. a lucide icon. */
  icon: ReactElement<{ size?: number; color?: string }>
  /** Read out by screen readers. The button has no visible text. */
  label: string
  onPress: () => void
}

export type ProfileHeaderProps = {
  name: string
  /** Without the at sign. */
  handle?: string
  bio?: string
  avatarUri?: string
  /** Shown until the image loads, or when there is none. Default comes from `name`. */
  initials?: string
  /** The first three are shown. */
  stats?: ProfileStat[]
  primaryAction: ProfilePrimaryAction
  secondaryAction?: ProfileSecondaryAction
  style?: StyleProp<ViewStyle>
}

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join('')

export function ProfileHeader({
  name,
  handle,
  bio,
  avatarUri,
  initials,
  stats = [],
  primaryAction,
  secondaryAction,
  style,
}: ProfileHeaderProps) {
  const shown = stats.slice(0, 3)
  return (
    <View style={[styles.root, style]}>
      <View style={styles.top}>
        <Avatar size="xl" accessibilityLabel={name}>
          {avatarUri ? <AvatarImage source={{ uri: avatarUri }} /> : null}
          <AvatarFallback>{initials ?? initialsOf(name)}</AvatarFallback>
        </Avatar>
        {shown.length > 0 ? (
          <View style={styles.stats}>
            {shown.map((stat) => (
              // One element per stat, so a screen reader says "48 Posts" in one go.
              <View
                key={stat.label}
                accessible
                accessibilityLabel={`${stat.value} ${stat.label}`}
                style={styles.stat}
              >
                <Text weight="semibold" style={styles.statValue}>
                  {stat.value}
                </Text>
                <Text variant="caption">{stat.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.copy}>
        <Text variant="title" accessibilityRole="header">
          {name}
        </Text>
        {handle ? <Text variant="muted">@{handle}</Text> : null}
        {bio ? <Text style={styles.bio}>{bio}</Text> : null}
      </View>

      <View style={styles.actions}>
        <Button
          size="sm"
          variant={primaryAction.variant}
          styles={{ root: styles.primary }}
          onPress={primaryAction.onPress}
        >
          {primaryAction.label}
        </Button>
        {secondaryAction ? (
          <IconButton
            size="sm"
            variant="outline"
            icon={secondaryAction.icon}
            accessibilityLabel={secondaryAction.label}
            onPress={secondaryAction.onPress}
          />
        ) : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: { gap: theme.space[4] },
  top: { flexDirection: 'row', alignItems: 'center', gap: theme.space[4] },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: theme.space[1] },
  statValue: { fontSize: theme.fontSize.lg, lineHeight: theme.lineHeight.lg },
  copy: { gap: theme.space[1] },
  bio: { marginTop: theme.space[1] },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.space[2] },
  primary: { flex: 1 },
}))

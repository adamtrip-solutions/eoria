import { useState } from 'react'
import { Stack } from 'expo-router'
import { ScrollView } from 'react-native'
import { MoreHorizontal } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { ProfileHeader } from '@/components/blocks/profile-header'
import { toast } from '@/components/ui/toast'
import { profile, profileStats } from '@/previews/blocks-app'

export default function ProfileHeaderDemo() {
  const [following, setFollowing] = useState(false)
  return (
    <>
      <Stack.Screen options={{ title: 'Profile header' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader
          {...profile}
          stats={profileStats}
          primaryAction={{
            label: following ? 'Following' : 'Follow',
            variant: following ? 'secondary' : 'default',
            onPress: () => {
              setFollowing(!following)
              toast({ title: following ? 'Unfollowed Ada' : 'Following Ada' })
            },
          }}
          secondaryAction={{
            icon: <MoreHorizontal />,
            label: 'More actions',
            onPress: () => toast({ title: 'More actions' }),
          }}
        />
      </ScrollView>
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: { padding: theme.space[4] },
}))

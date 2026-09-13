import { useEffect, useState } from 'react'
import { Flag, MoreHorizontal, Share2, UserX } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Screen } from '@/components/screen'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { HStack, VStack } from '@/components/ui/stack'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const posts = [
  { title: 'Shipping the slot recipe engine', when: '2d', likes: 128 },
  { title: 'Why we picked Unistyles over StyleSheet', when: '1w', likes: 342 },
  { title: 'Snappy animations, no springs', when: '3w', likes: 96 },
]

const activity = [
  'Starred eoria/eoria',
  'Opened a pull request in expo/expo',
  'Commented on unistyles#1024',
  'Published @eoria/core 0.0.1',
]

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <VStack align="center" gap={0}>
      <Text weight="semibold">{value}</Text>
      <Text variant="caption">{label}</Text>
    </VStack>
  )
}

function ActivityTab() {
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 1200)
    return () => clearTimeout(t)
  }, [])
  if (!loaded) {
    return (
      <VStack
        gap={3}
        accessible
        accessibilityState={{ busy: true }}
        accessibilityLabel="Loading activity"
      >
        {activity.map((a) => (
          <HStack key={a} gap={3}>
            <Skeleton shape="circle" style={styles.dot} />
            <Skeleton shape="text" style={styles.flex} />
          </HStack>
        ))}
      </VStack>
    )
  }
  return (
    <VStack gap={3}>
      {activity.map((a, i) => (
        <HStack key={a} gap={3}>
          <Badge variant={i === 0 ? 'solid' : 'secondary'}>{i === 0 ? 'new' : 'seen'}</Badge>
          <Text style={styles.flex}>{a}</Text>
        </HStack>
      ))}
    </VStack>
  )
}

export default function ProfileScreen() {
  const [following, setFollowing] = useState(false)
  return (
    <Screen>
      <HStack justify="space-between" align="flex-start">
        <Avatar size="xl" accessibilityLabel="Ada Lovelace">
          <AvatarImage source={{ uri: 'https://i.pravatar.cc/200?img=47' }} />
          <AvatarFallback>al</AvatarFallback>
        </Avatar>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              icon={<MoreHorizontal />}
              accessibilityLabel="More actions"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem icon={<Share2 />} onSelect={() => toast({ title: 'Link copied' })}>
              Share profile
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Flag />} onSelect={() => toast({ title: 'Report sent' })}>
              Report
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              icon={<UserX />}
              onSelect={() => toast({ title: 'Blocked', variant: 'destructive' })}
            >
              Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HStack>

      <VStack gap={1}>
        <HStack gap={2}>
          <Text variant="title">Ada Lovelace</Text>
          <Badge>Pro</Badge>
        </HStack>
        <Text variant="muted">@ada · London</Text>
        <Text>Writes about analytical engines and component libraries. She/her.</Text>
      </VStack>

      <HStack justify="space-around">
        <Stat label="Posts" value="48" />
        <Stat label="Followers" value="12.4k" />
        <Stat label="Following" value="310" />
      </HStack>

      <HStack gap={2}>
        <Button
          styles={{ root: styles.flex }}
          variant={following ? 'secondary' : 'default'}
          onPress={() => setFollowing((f) => !f)}
        >
          {following ? 'Following' : 'Follow'}
        </Button>
        <Button
          styles={{ root: styles.flex }}
          variant="outline"
          onPress={() => toast({ title: 'Opening chat' })}
        >
          Message
        </Button>
      </HStack>

      <Tabs defaultValue="posts" variant="underline">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <VStack gap={3}>
            {posts.map((p) => (
              <Card key={p.title}>
                <CardHeader>
                  <CardTitle>{p.title}</CardTitle>
                  <CardDescription>
                    {p.when} ago · {p.likes} likes
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </VStack>
        </TabsContent>
        <TabsContent value="about">
          <Card variant="filled">
            <CardHeader>
              <CardTitle>Profile completeness</CardTitle>
              <CardDescription>Add a website and a pronoun set to reach 100%.</CardDescription>
            </CardHeader>
            <CardContent style={styles.gap}>
              <Progress value={72} accessibilityLabel="Profile completeness" />
              <Separator />
              <HStack justify="space-between">
                <Text variant="muted">Joined</Text>
                <Text>December 1815</Text>
              </HStack>
              <HStack justify="space-between">
                <Text variant="muted">Timezone</Text>
                <Text>GMT</Text>
              </HStack>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab />
        </TabsContent>
      </Tabs>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  dot: { width: 24, height: 24 },
  gap: { gap: theme.space[3] },
}))

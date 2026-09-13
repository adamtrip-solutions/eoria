import { useEffect, useState } from 'react'
import { Screen, Section } from '@/components/screen'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

export default function FeedbackScreen() {
  const [value, setValue] = useState(30)
  useEffect(() => {
    const t = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 10)), 1200)
    return () => clearInterval(t)
  }, [])
  return (
    <Screen>
      <Section title="Badge">
        <Badge>Default</Badge>
        <Badge variant="solid">Solid</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge size="md">Medium</Badge>
      </Section>
      <Section block title="Separator">
        <VStack gap={3}>
          <Text>Above</Text>
          <Separator />
          <Text>Below</Text>
          <HStack gap={3} style={{ height: 24 }}>
            <Text>Left</Text>
            <Separator orientation="vertical" />
            <Text>Right</Text>
          </HStack>
        </VStack>
      </Section>
      <Section block title="Progress">
        <VStack gap={3}>
          <Progress value={value} accessibilityLabel="Upload" />
          <Progress size="sm" value={value} />
          <Progress size="lg" value={value} />
          <HStack gap={2}>
            <Button size="sm" variant="outline" onPress={() => setValue(0)}>
              Reset
            </Button>
            <Text variant="muted">{value}%</Text>
          </HStack>
        </VStack>
      </Section>
      <Section block title="Skeleton">
        <HStack gap={3} accessibilityState={{ busy: true }} accessibilityLabel="Loading post">
          <Skeleton shape="circle" style={{ width: 40, height: 40 }} />
          <VStack gap={2} flex={1}>
            <Skeleton shape="text" style={{ width: '60%' }} />
            <Skeleton shape="text" />
          </VStack>
        </HStack>
        <Skeleton style={{ height: 120 }} />
      </Section>
      <Section title="Avatar">
        <Avatar size="sm">
          <AvatarFallback>ba</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarImage source={{ uri: 'https://i.pravatar.cc/100?img=12' }} />
          <AvatarFallback>ba</AvatarFallback>
        </Avatar>
        <Avatar size="lg" shape="rounded">
          <AvatarImage source={{ uri: 'https://invalid.example/404.png' }} />
          <AvatarFallback>xx</AvatarFallback>
        </Avatar>
        <Avatar size="xl">
          <AvatarImage source={{ uri: 'https://i.pravatar.cc/200?img=32' }} />
          <AvatarFallback>ba</AvatarFallback>
        </Avatar>
      </Section>
    </Screen>
  )
}

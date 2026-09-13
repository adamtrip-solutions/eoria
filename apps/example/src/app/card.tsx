import { Screen, Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Text } from '@/components/ui/text'

const variants = ['outline', 'filled', 'elevated'] as const

export default function CardScreen() {
  return (
    <Screen>
      {variants.map((v) => (
        <Section block key={v} title={v}>
          <Card variant={v}>
            <CardHeader>
              <CardTitle>Project settings</CardTitle>
              <CardDescription>Manage how this project behaves.</CardDescription>
            </CardHeader>
            <CardContent>
              <Text>Body content goes here. Any children work.</Text>
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
              <Button size="sm">Save</Button>
            </CardFooter>
          </Card>
        </Section>
      ))}
    </Screen>
  )
}

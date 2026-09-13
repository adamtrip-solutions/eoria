import { Screen, Section } from '@/components/screen'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'

function Demo({ variant }: { variant: 'default' | 'segmented' | 'underline' }) {
  return (
    <Tabs defaultValue="account" variant={variant}>
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
        <TabsTrigger value="billing" disabled>
          Billing
        </TabsTrigger>
      </TabsList>
      <TabsContent value="account">
        <Text>Account settings.</Text>
      </TabsContent>
      <TabsContent value="password">
        <Text>Change your password.</Text>
      </TabsContent>
    </Tabs>
  )
}

export default function TabsScreen() {
  return (
    <Screen>
      <Section block title="default (pills)">
        <Demo variant="default" />
      </Section>
      <Section block title="segmented">
        <Demo variant="segmented" />
      </Section>
      <Section block title="underline">
        <Demo variant="underline" />
      </Section>
    </Screen>
  )
}

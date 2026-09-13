import { Screen, Section } from '@/components/screen'
import { Box } from '@/components/ui/box'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'

export default function LayoutScreen() {
  return (
    <Screen>
      <Section title="Box token props">
        <Box p={4} bg="muted" rounded="lg">
          <Text>p=4 bg=muted rounded=lg</Text>
        </Box>
        <Box px={3} py={2} borderWidth={1} borderColor="border" rounded="full">
          <Text variant="muted">bordered pill</Text>
        </Box>
      </Section>
      <Section title="HStack">
        <HStack gap={2} p={3} bg="secondary" rounded="md">
          <Box p={2} bg="primary" rounded="sm" />
          <Box p={2} bg="destructive" rounded="sm" />
          <Text>items centred</Text>
        </HStack>
      </Section>
      <Section title="VStack">
        <VStack gap={1} p={3} borderWidth={1} borderColor="border" rounded="md">
          <Text variant="label">Title</Text>
          <Text variant="muted">Stacked vertically with gap=1</Text>
        </VStack>
      </Section>
    </Screen>
  )
}

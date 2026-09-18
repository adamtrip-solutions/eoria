import { useState } from 'react'
import { View } from 'react-native'
import { Info, MessageCircle, Phone } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Screen } from '@/components/screen'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { HStack, VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const steps = [
  { label: 'Confirmed', value: 100 },
  { label: 'Preparing', value: 100 },
  { label: 'On the way', value: 55 },
  { label: 'Delivered', value: 0 },
]
const currentStep = 2

const items = [
  { name: 'Margherita', qty: 1, price: '€12,90' },
  { name: 'Diavola', qty: 1, price: '€14,50' },
  { name: 'Tiramisù', qty: 1, price: '€4,00' },
]

const tips = [1, 2, 3, 5]

export default function DeliveryScreen() {
  const [tip, setTip] = useState(2)
  return (
    <Screen>
      <VStack gap={1}>
        <Text variant="heading">Arriving in 12 to 18 min</Text>
        <Text variant="muted">Pizzeria Lupita · ordered at 19:42</Text>
      </VStack>

      <VStack gap={2} accessible accessibilityLabel={`Order status: ${steps[currentStep].label}`}>
        <HStack gap={2}>
          {steps.map((s) => (
            <Progress key={s.label} value={s.value} size="sm" style={styles.flex} />
          ))}
        </HStack>
        <HStack gap={2}>
          {steps.map((s, i) => (
            <View key={s.label} style={styles.flex}>
              <Text
                variant="caption"
                numberOfLines={1}
                style={i === currentStep ? styles.stepCurrent : undefined}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </HStack>
      </VStack>

      <Card>
        <CardContent style={styles.courier}>
          <HStack gap={3}>
            <Avatar size="lg" accessibilityLabel="Miguel">
              <AvatarImage source={{ uri: 'https://i.pravatar.cc/200?img=12' }} />
              <AvatarFallback>mg</AvatarFallback>
            </Avatar>
            <VStack flex={1} gap={0}>
              <Text weight="semibold">Miguel is on the way</Text>
              <Text variant="caption">Honda PCX · AB-12-CD</Text>
            </VStack>
            <Button
              variant="secondary"
              size="icon"
              icon={<MessageCircle />}
              accessibilityLabel="Message Miguel"
              onPress={() => toast({ title: 'Opening chat' })}
            />
            <Button
              variant="secondary"
              size="icon"
              icon={<Phone />}
              accessibilityLabel="Call Miguel"
              onPress={() => toast({ title: 'Calling Miguel' })}
            />
          </HStack>
        </CardContent>
      </Card>

      <Alert icon={<Info />}>
        <AlertTitle>Leave at the door is on</AlertTitle>
        <AlertDescription>Miguel will ring once and leave the bag by the door.</AlertDescription>
      </Alert>

      <Accordion type="single" collapsible variant="contained" defaultValue="items">
        <AccordionItem value="items">
          <AccordionTrigger>3 items · €31,40</AccordionTrigger>
          <AccordionContent style={styles.itemsContent}>
            {items.map((it) => (
              <HStack key={it.name} justify="space-between">
                <Text>
                  {it.name} <Text variant="muted">× {it.qty}</Text>
                </Text>
                <Text>{it.price}</Text>
              </HStack>
            ))}
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="details">
          <AccordionTrigger>Delivery details</AccordionTrigger>
          <AccordionContent style={styles.itemsContent}>
            <HStack justify="space-between">
              <Text variant="muted">Address</Text>
              <Text>Rua da Prata 12, 3.º Esq</Text>
            </HStack>
            <HStack justify="space-between">
              <Text variant="muted">Paid with</Text>
              <Text>MB Way</Text>
            </HStack>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Dialog>
        <DialogTrigger asChild>
          <Button width="full">Tip Miguel</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a tip</DialogTitle>
            <DialogDescription>All of it goes to Miguel.</DialogDescription>
          </DialogHeader>
          <HStack gap={2}>
            {tips.map((t) => (
              <Button
                key={t}
                variant={t === tip ? 'default' : 'secondary'}
                styles={{ root: styles.flex }}
                onPress={() => setTip(t)}
                accessibilityState={{ selected: t === tip }}
              >
                {`€${t}`}
              </Button>
            ))}
          </HStack>
          <DialogFooter>
            <DialogClose asChild>
              <Button width="full" onPress={() => toast({ title: `€${tip} tip added` })}>
                {`Add €${tip} tip`}
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="ghost" width="full">
                Not now
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Button variant="link" onPress={() => toast({ title: 'Support chat opens here' })}>
        Need help with this order?
      </Button>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  stepCurrent: { color: theme.colors.foreground, fontWeight: theme.fontWeight.semibold },
  courier: { paddingTop: theme.space[5] },
  itemsContent: { gap: theme.space[3] },
}))

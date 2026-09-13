import { useState } from 'react'
import { router } from 'expo-router'
import { useHeaderHeight } from 'expo-router/build/react-navigation/elements'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { StyleSheet } from 'react-native-unistyles'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  type SelectOption,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { HStack, VStack } from '@/components/ui/stack'
import { Switch } from '@/components/ui/switch'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'

const shipping = [
  { value: 'standard', label: 'Standard', detail: '4 to 6 business days', price: 0 },
  { value: 'express', label: 'Express', detail: '2 business days', price: 9 },
  { value: 'overnight', label: 'Overnight', detail: 'Next business day', price: 24 },
]
const countries: SelectOption[] = [
  { value: 'pt', label: 'Portugal' },
  { value: 'es', label: 'Spain' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
]
const items = [
  { name: 'Recipe hoodie', price: 64 },
  { name: 'Slot sticker pack', price: 6 },
]

const money = (n: number) => `$${n.toFixed(2)}`

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  const [email, setEmail] = useState('')
  const [ship, setShip] = useState<string | undefined>('standard')
  const [country, setCountry] = useState<SelectOption | undefined>(countries[0])
  const [card, setCard] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [save, setSave] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const emailError = !email.includes('@') ? 'Enter a valid email.' : undefined
  const cardError =
    card.replace(/\s/g, '').length !== 16 ? 'Card number needs 16 digits.' : undefined
  const expiryError = !/^\d{2}\/\d{2}$/.test(expiry) ? 'MM/YY' : undefined
  const cvcError = cvc.length < 3 ? '3 digits' : undefined
  const valid = !emailError && !cardError && !expiryError && !cvcError && !!country

  const subtotal = items.reduce((n, i) => n + i.price, 0)
  const shipCost = shipping.find((s) => s.value === ship)?.price ?? 0
  const total = subtotal + shipCost

  const pay = () => {
    setSubmitted(true)
    if (!valid) {
      toast({ title: 'Check the highlighted fields', variant: 'destructive' })
      return
    }
    setConfirm(true)
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <Field invalid={submitted && !!emailError}>
              <FieldLabel>Email</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </FieldControl>
              <FieldError>{emailError}</FieldError>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={ship} onValueChange={setShip} accessibilityLabel="Shipping method">
              <VStack gap={0}>
                {shipping.map((s, i) => (
                  <View key={s.value}>
                    {i > 0 ? <Separator /> : null}
                    <HStack gap={3} py={3}>
                      <RadioGroupItem value={s.value} accessibilityLabel={s.label} />
                      <VStack flex={1} gap={0}>
                        <Label onPress={() => setShip(s.value)}>{s.label}</Label>
                        <Text variant="caption">{s.detail}</Text>
                      </VStack>
                      <Text weight="medium">{s.price === 0 ? 'Free' : money(s.price)}</Text>
                    </HStack>
                  </View>
                ))}
              </VStack>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
          </CardHeader>
          <CardContent style={styles.gap}>
            <Field invalid={submitted && !!cardError}>
              <FieldLabel>Card number</FieldLabel>
              <FieldControl>
                <Input
                  placeholder="4242 4242 4242 4242"
                  keyboardType="number-pad"
                  value={card}
                  onChangeText={setCard}
                />
              </FieldControl>
              <FieldError>{cardError}</FieldError>
            </Field>
            <HStack gap={3} align="flex-start">
              <Field invalid={submitted && !!expiryError} style={styles.flex}>
                <FieldLabel>Expiry</FieldLabel>
                <FieldControl>
                  <Input
                    placeholder="MM/YY"
                    keyboardType="number-pad"
                    value={expiry}
                    onChangeText={setExpiry}
                  />
                </FieldControl>
                <FieldError>{expiryError}</FieldError>
              </Field>
              <Field invalid={submitted && !!cvcError} style={styles.flex}>
                <FieldLabel>CVC</FieldLabel>
                <FieldControl>
                  <Input
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    value={cvc}
                    onChangeText={setCvc}
                  />
                </FieldControl>
                <FieldError>{cvcError}</FieldError>
              </Field>
            </HStack>
            <Field invalid={submitted && !country}>
              <FieldLabel>Country</FieldLabel>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger placeholder="Choose a country" />
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.value} {...c} />
                  ))}
                </SelectContent>
              </Select>
              <FieldError>Pick a country.</FieldError>
            </Field>
            <HStack justify="space-between">
              <Label style={styles.flex} onPress={() => setSave((s) => !s)}>
                Save card for next time
              </Label>
              <Switch checked={save} onCheckedChange={setSave} accessibilityLabel="Save card" />
            </HStack>
          </CardContent>
        </Card>

        <Accordion defaultValue="summary" variant="contained">
          <AccordionItem value="summary">
            <AccordionTrigger>{`Order summary · ${money(total)}`}</AccordionTrigger>
            <AccordionContent>
              {items.map((i) => (
                <HStack key={i.name} justify="space-between">
                  <Text variant="muted">{i.name}</Text>
                  <Text>{money(i.price)}</Text>
                </HStack>
              ))}
              <HStack justify="space-between">
                <Text variant="muted">Shipping</Text>
                <Text>{shipCost === 0 ? 'Free' : money(shipCost)}</Text>
              </HStack>
              <Separator />
              <HStack justify="space-between">
                <Text weight="semibold">Total</Text>
                <Text weight="semibold">{money(total)}</Text>
              </HStack>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Button size="lg" width="full" onPress={pay}>
          {`Pay ${money(total)}`}
        </Button>
      </View>

      <Dialog open={confirm} onOpenChange={setConfirm} placement="bottom">
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment</DialogTitle>
            <DialogDescription>
              {`${money(total)} will be charged to the card ending ${card.slice(-4)}.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                width="full"
                onPress={() => {
                  toast({ title: 'Payment complete', description: 'Receipt sent to ' + email })
                  router.back()
                }}
              >
                Pay now
              </Button>
            </DialogClose>
            <DialogClose asChild>
              <Button variant="ghost" width="full">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create((theme) => ({
  flex: { flex: 1 },
  gap: { gap: theme.space[4] },
  content: { padding: theme.space[4], gap: theme.space[4], paddingBottom: theme.space[8] },
  footer: {
    padding: theme.space[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
}))

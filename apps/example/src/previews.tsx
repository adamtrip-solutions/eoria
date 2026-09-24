// One compact demo per registry item. The docs site screenshots these on a
// simulator (apps/docs/scripts/capture-previews.mjs) via /preview/<name>.
import { useEffect, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { AlertCircle, Check, Copy, Info, Pencil, Plus, Share, Trash2 } from 'lucide-react-native'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Box } from '@/components/ui/box'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox, ComboboxContent, ComboboxTrigger } from '@/components/ui/combobox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputOTP } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Popper, PopperAnchor, PopperContent } from '@/components/ui/popper'
import { Portal } from '@/components/ui/portal'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { HStack, VStack } from '@/components/ui/stack'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Text } from '@/components/ui/text'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { actionsPreviews } from '@/previews/actions'
import { accountBlockPreviews } from '@/previews/blocks-account'
import { appBlockPreviews } from '@/previews/blocks-app'
import { authBlockPreviews } from '@/previews/blocks-auth'
import { commerceBlockPreviews } from '@/previews/blocks-commerce'
import { socialBlockPreviews } from '@/previews/blocks-social'
import { listsPreviews } from '@/previews/lists'
import { nativePreviews } from '@/previews/native'

const faq = [
  ['shipping', 'How long does shipping take?', 'Two to five business days in most regions.'],
  ['returns', 'What is the return policy?', 'Thirty days, no questions asked.'],
  ['support', 'How do I contact support?', 'Email support@example.com or use the in-app chat.'],
] as const

function ToastPreview() {
  useEffect(() => {
    toast({ title: 'Saved', description: 'Your changes are live.' })
    toast({ title: 'Upload failed', description: 'Check your connection.', variant: 'destructive' })
    toast({ title: 'From the top', placement: 'top', duration: Infinity })
    return () => toast.dismiss()
  }, [])
  return (
    <VStack gap={3}>
      <Button onPress={() => toast({ title: 'Saved', description: 'Your changes are live.' })}>
        Show toast
      </Button>
      <Button variant="outline" onPress={() => toast({ title: 'From the top', placement: 'top' })}>
        Top placement
      </Button>
    </VStack>
  )
}

function ProgressPreview() {
  const [value, setValue] = useState(30)
  useEffect(() => {
    const t = setTimeout(() => setValue(65), 100)
    return () => clearTimeout(t)
  }, [])
  return (
    <VStack gap={4}>
      <Progress value={value} accessibilityLabel="Upload" />
      <Progress size="sm" value={value} />
      <Progress size="lg" value={value} />
    </VStack>
  )
}

const countries = [
  { value: 'pt', label: 'Portugal', keywords: ['lisbon'] },
  { value: 'es', label: 'Spain', keywords: ['madrid'] },
  { value: 'fr', label: 'France', keywords: ['paris'] },
  { value: 'de', label: 'Germany', keywords: ['berlin'] },
  { value: 'it', label: 'Italy', disabled: true },
]

export const previews: Record<string, () => ReactNode> = {
  ...actionsPreviews,
  ...listsPreviews,
  ...nativePreviews,
  accordion: () => (
    <Accordion type="multiple" variant="contained" defaultValue={['shipping']}>
      {faq.map(([value, q, a]) => (
        <AccordionItem key={value} value={value}>
          <AccordionTrigger>{q}</AccordionTrigger>
          <AccordionContent>{a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  ),
  alert: () => (
    <VStack gap={3}>
      <Alert icon={<Info />}>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>You can change this later in Settings.</AlertDescription>
      </Alert>
      <Alert variant="primary" icon={<Check />}>
        <AlertTitle>Backup complete</AlertTitle>
        <AlertDescription>Last run two minutes ago.</AlertDescription>
      </Alert>
      <Alert variant="destructive" icon={<AlertCircle />}>
        <AlertTitle>Payment failed</AlertTitle>
        <AlertDescription>Your card was declined. Try another method.</AlertDescription>
      </Alert>
      <Alert variant="outline">
        <AlertTitle>No icon, no description</AlertTitle>
      </Alert>
    </VStack>
  ),
  avatar: () => (
    <HStack gap={3}>
      <Avatar size="sm">
        <AvatarFallback>ba</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>ba</AvatarFallback>
      </Avatar>
      <Avatar size="lg" shape="rounded">
        <AvatarImage source={{ uri: 'https://i.pravatar.cc/100?img=12' }} />
        <AvatarFallback>ba</AvatarFallback>
      </Avatar>
      <Avatar size="xl">
        <AvatarImage source={{ uri: 'https://i.pravatar.cc/200?img=32' }} />
        <AvatarFallback>ba</AvatarFallback>
      </Avatar>
    </HStack>
  ),
  badge: () => (
    <HStack gap={2} style={{ flexWrap: 'wrap' }}>
      <Badge>Default</Badge>
      <Badge variant="solid">Solid</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge size="md">Medium</Badge>
    </HStack>
  ),
  box: () => (
    <VStack gap={3}>
      <Box p={4} bg="surface" rounded="xl">
        <Text>p=4 bg=surface rounded=xl</Text>
      </Box>
      <Box p={4} bg="muted" rounded="lg">
        <Text>p=4 bg=muted rounded=lg</Text>
      </Box>
      <Box
        px={3}
        py={2}
        borderWidth={1}
        borderColor="border"
        rounded="full"
        style={{ alignSelf: 'flex-start' }}
      >
        <Text variant="muted">bordered pill</Text>
      </Box>
    </VStack>
  ),
  button: () => (
    <VStack gap={3}>
      <Button icon={<Check />}>Confirm</Button>
      <Button variant="secondary" icon={<Plus />}>
        Add item
      </Button>
      <Button variant="outline">Outline</Button>
      <HStack gap={3}>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button size="icon" icon={<Plus />} accessibilityLabel="Add" />
      </HStack>
      <Button variant="destructive" size="sm">
        Delete
      </Button>
      <Button disabled>Disabled</Button>
    </VStack>
  ),
  card: () => (
    <VStack gap={4}>
      <Card>
        <CardHeader>
          <CardTitle>Project settings</CardTitle>
          <CardDescription>Manage how this project behaves.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text>Body content goes here.</Text>
        </CardContent>
        <CardFooter>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
          <Button size="sm">Save</Button>
        </CardFooter>
      </Card>
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Elevated</CardTitle>
          <CardDescription>Floats above the screen.</CardDescription>
        </CardHeader>
      </Card>
      <Card variant="outline">
        <CardHeader>
          <CardTitle>Outline</CardTitle>
          <CardDescription>A hairline instead of a fill.</CardDescription>
        </CardHeader>
      </Card>
    </VStack>
  ),
  checkbox: () => (
    <VStack gap={3}>
      <HStack gap={2}>
        <Checkbox checked accessibilityLabel="Accept terms" />
        <Label>Accept terms</Label>
      </HStack>
      <HStack gap={2}>
        <Checkbox checked={false} accessibilityLabel="Newsletter" />
        <Label>Weekly newsletter</Label>
      </HStack>
      <HStack gap={3}>
        <Checkbox size="sm" checked />
        <Checkbox size="lg" checked />
        <Checkbox checked disabled />
      </HStack>
    </VStack>
  ),
  combobox: () => (
    <Combobox open options={countries} value="es">
      <ComboboxTrigger placeholder="Choose a country" />
      <ComboboxContent searchPlaceholder="Search countries" />
    </Combobox>
  ),
  dialog: () => (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this item?</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="destructive" width="full">
              Delete
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
  ),
  'dropdown-menu': () => (
    <DropdownMenu open>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Item 42</DropdownMenuLabel>
        <DropdownMenuItem icon={<Pencil />}>Edit</DropdownMenuItem>
        <DropdownMenuItem icon={<Copy />}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem icon={<Share />} description="Anyone with the link can view">
          Share
        </DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive icon={<Trash2 />}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  field: () => (
    <VStack gap={5}>
      <Field>
        <FieldLabel>Display name</FieldLabel>
        <FieldControl>
          <Input placeholder="At least 3 characters" value="Ada" />
        </FieldControl>
        <FieldDescription>Shown on your public profile.</FieldDescription>
      </Field>
      <Field invalid>
        <FieldLabel>Email</FieldLabel>
        <FieldControl>
          <Input value="ada@" />
        </FieldControl>
        <FieldError>Enter a valid email address.</FieldError>
      </Field>
    </VStack>
  ),
  input: () => (
    <VStack gap={3}>
      <Input placeholder="you@example.com" />
      <Input value="Ada Lovelace" />
      <Input invalid value="not an email" />
      <Input disabled placeholder="disabled" />
      <Input size="sm" placeholder="sm" />
    </VStack>
  ),
  'input-otp': () => (
    <VStack gap={4}>
      <InputOTP length={6} defaultValue="4821" autoFocus />
      <InputOTP length={4} mode="alphanumeric" defaultValue="A7" size="sm" />
      <InputOTP length={6} secure defaultValue="123456" invalid />
    </VStack>
  ),
  label: () => (
    <VStack gap={3}>
      <Label>Email address</Label>
      <Label disabled>Disabled label</Label>
      <HStack gap={2}>
        <Switch checked accessibilityLabel="Notifications" />
        <Label>Pressable, next to a control</Label>
      </HStack>
    </VStack>
  ),
  popover: () => (
    <Popover open>
      <PopoverTrigger asChild>
        <Button variant="outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverTitle>Dimensions</PopoverTitle>
        <PopoverDescription>Tap outside or the button to close.</PopoverDescription>
        <Button size="sm">Done</Button>
      </PopoverContent>
    </Popover>
  ),
  popper: () => (
    <Popper>
      <PopperAnchor>
        <Button variant="secondary">Anchor</Button>
      </PopperAnchor>
      <PopperContent side="bottom" align="start">
        <Box p={3} bg="elevated" rounded="md" borderWidth={1} borderColor="border">
          <Text variant="caption">Positioned below, aligned start</Text>
        </Box>
      </PopperContent>
    </Popper>
  ),
  portal: () => (
    <VStack gap={3}>
      <Card>
        <CardContent>
          <Text>The badge below is rendered through the portal host at the root.</Text>
        </CardContent>
      </Card>
      <Portal>
        <View
          style={{ position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center' }}
        >
          <Badge variant="solid">Rendered through the portal</Badge>
        </View>
      </Portal>
    </VStack>
  ),
  progress: () => <ProgressPreview />,
  'radio-group': () => (
    <RadioGroup value="pro">
      <VStack gap={3}>
        {['free', 'pro', 'team'].map((v) => (
          <HStack key={v} gap={2}>
            <RadioGroupItem value={v} accessibilityLabel={v} />
            <Label>{v}</Label>
          </HStack>
        ))}
        <HStack gap={2}>
          <RadioGroupItem value="enterprise" disabled />
          <Label disabled>enterprise</Label>
        </HStack>
      </VStack>
    </RadioGroup>
  ),
  select: () => (
    <Select open value={{ value: 'cherry', label: 'Cherry' }}>
      <SelectTrigger placeholder="Pick a fruit" />
      <SelectContent>
        <SelectLabel>Fruits</SelectLabel>
        {['Apple', 'Banana', 'Cherry', 'Fig'].map((f) => (
          <SelectItem key={f} value={f.toLowerCase()} label={f} />
        ))}
        <SelectItem value="durian" label="Durian" disabled />
      </SelectContent>
    </Select>
  ),
  separator: () => (
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
  ),
  skeleton: () => (
    <VStack gap={4}>
      <HStack gap={3}>
        <Skeleton shape="circle" style={{ width: 40, height: 40 }} />
        <VStack gap={2} flex={1}>
          <Skeleton shape="text" style={{ width: '60%' }} />
          <Skeleton shape="text" />
        </VStack>
      </HStack>
      <Skeleton style={{ height: 120 }} />
    </VStack>
  ),
  slider: () => (
    <VStack gap={5}>
      <Slider defaultValue={35} accessibilityLabel="Volume" />
      <Slider size="sm" defaultValue={70} />
      <Slider size="lg" defaultValue={2.5} min={0} max={5} step={0.5} />
      <Slider defaultValue={50} disabled />
    </VStack>
  ),
  spinner: () => (
    <VStack gap={5}>
      <HStack gap={6}>
        <Spinner size="sm" />
        <Spinner />
        <Spinner size="lg" />
      </HStack>
      <HStack gap={6}>
        <Spinner variant="dots" size="sm" />
        <Spinner variant="dots" />
        <Spinner variant="dots" size="lg" />
      </HStack>
      <HStack gap={6}>
        <Spinner variant="bars" size="sm" />
        <Spinner variant="bars" />
        <Spinner variant="bars" size="lg" />
      </HStack>
      <Button disabled icon={<Spinner size="sm" color="white" />}>
        Saving
      </Button>
    </VStack>
  ),
  stack: () => (
    <VStack gap={3}>
      <HStack gap={2} p={3} bg="surface" rounded="lg">
        <Box p={3} bg="primary" rounded="sm" />
        <Box p={3} bg="destructive" rounded="sm" />
        <Text>HStack, items centred</Text>
      </HStack>
      <VStack gap={1} p={3} bg="surface" rounded="lg">
        <Text variant="label">VStack</Text>
        <Text variant="muted">Stacked vertically with gap=1</Text>
      </VStack>
    </VStack>
  ),
  switch: () => (
    <VStack gap={3}>
      <HStack gap={2}>
        <Switch checked accessibilityLabel="Notifications" />
        <Label>Notifications on</Label>
      </HStack>
      <HStack gap={2}>
        <Switch checked={false} accessibilityLabel="Sounds" />
        <Label>Sounds off</Label>
      </HStack>
      <HStack gap={3}>
        <Switch size="sm" checked />
        <Switch checked disabled />
      </HStack>
    </VStack>
  ),
  tabs: () => (
    <VStack gap={5}>
      {(['default', 'segmented', 'underline'] as const).map((variant) => (
        <Tabs key={variant} defaultValue="account" variant={variant}>
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="billing" disabled>
              Billing
            </TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <Text variant="muted">{variant}</Text>
          </TabsContent>
        </Tabs>
      ))}
    </VStack>
  ),
  text: () => (
    <VStack gap={2}>
      <Text variant="heading">Heading</Text>
      <Text variant="title">Title</Text>
      <Text>Body. The quick brown fox jumps over the lazy dog.</Text>
      <Text variant="label">Label</Text>
      <Text variant="muted">Muted, for secondary lines.</Text>
      <Text variant="caption">Caption</Text>
    </VStack>
  ),
  textarea: () => (
    <VStack gap={3}>
      <Textarea placeholder="Tell people about yourself" />
      <Textarea value="Builds React Native apps in Lisbon. Likes tall buttons." />
      <Textarea invalid value="Too long" />
    </VStack>
  ),
  toast: () => <ToastPreview />,
  tooltip: () => (
    <Tooltip open>
      <TooltipTrigger asChild>
        <Button variant="secondary">Hold me</Button>
      </TooltipTrigger>
      <TooltipContent>Shown while pressed</TooltipContent>
    </Tooltip>
  ),
}

/** Blocks, keyed by registry name. The preview route renders these full screen. */
export const blockPreviews: Record<string, () => ReactNode> = {
  ...authBlockPreviews,
  ...appBlockPreviews,
  ...commerceBlockPreviews,
  ...accountBlockPreviews,
  ...socialBlockPreviews,
}

import { useState } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react-native'
import { Screen, Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  type SelectOption,
} from '@/components/ui/select'
import { Text } from '@/components/ui/text'
import { toast } from '@/components/ui/toast'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const fruits = [
  'Apple',
  'Banana',
  'Cherry',
  'Dragonfruit',
  'Elderberry',
  'Fig',
  'Grape',
  'Honeydew',
]

export default function OverlaysScreen() {
  const [fruit, setFruit] = useState<SelectOption | undefined>()
  const [last, setLast] = useState('none')
  return (
    <Screen>
      <Section title="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <PopoverTitle>Dimensions</PopoverTitle>
            <PopoverDescription>Tap outside or the button to close.</PopoverDescription>
            <PopoverClose asChild>
              <Button size="sm">Done</Button>
            </PopoverClose>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Side: top, align: end</Button>
          </PopoverTrigger>
          <PopoverContent side="top" align="end">
            <PopoverDescription>
              Flips to the bottom when there is no room above.
            </PopoverDescription>
          </PopoverContent>
        </Popover>
      </Section>
      <Section title="Tooltip (long press)">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary">Hold me</Button>
          </TooltipTrigger>
          <TooltipContent>Shown while pressed</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon" icon={<Copy />} accessibilityLabel="Copy" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Copy to clipboard</TooltipContent>
        </Tooltip>
      </Section>
      <Section title="DropdownMenu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Item 42</DropdownMenuLabel>
            <DropdownMenuItem icon={<Pencil />} onSelect={() => setLast('edit')}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem icon={<Copy />} onSelect={() => setLast('duplicate')}>
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Archive</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              icon={<Trash2 />}
              onSelect={() => {
                setLast('delete')
                toast({ title: 'Deleted', variant: 'destructive' })
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Text variant="muted">Last: {last}</Text>
      </Section>
      <Section block title="Select">
        <Select value={fruit} onValueChange={setFruit}>
          <SelectTrigger placeholder="Pick a fruit" />
          <SelectContent>
            <SelectLabel>Fruits</SelectLabel>
            {fruits.map((f) => (
              <SelectItem key={f} value={f.toLowerCase()} label={f} />
            ))}
            <SelectItem value="durian" label="Durian" disabled />
          </SelectContent>
        </Select>
        <Select size="sm" defaultValue={{ value: 'fig', label: 'Fig' }}>
          <SelectTrigger />
          <SelectContent>
            {fruits.map((f) => (
              <SelectItem key={f} value={f.toLowerCase()} label={f} />
            ))}
          </SelectContent>
        </Select>
        <Select invalid>
          <SelectTrigger placeholder="Invalid" />
          <SelectContent>
            <SelectItem value="a" label="A" />
          </SelectContent>
        </Select>
        <Select disabled>
          <SelectTrigger placeholder="Disabled" />
          <SelectContent>
            <SelectItem value="a" label="A" />
          </SelectContent>
        </Select>
        <Text variant="muted">Selected: {fruit?.label ?? 'none'}</Text>
      </Section>
    </Screen>
  )
}

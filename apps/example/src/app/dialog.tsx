import { useState } from 'react'
import { Screen, Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
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
import { Text } from '@/components/ui/text'

export default function DialogScreen() {
  const [open, setOpen] = useState(false)
  return (
    <Screen>
      <Section title="Uncontrolled, centred">
        <Dialog placement="center">
          <DialogTrigger asChild>
            <Button>Delete item</Button>
          </DialogTrigger>
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
      </Section>
      <Section title="Controlled, sheet (default)">
        <Button variant="outline" onPress={() => setOpen(true)}>
          Open
        </Button>
        <Text variant="muted">{open ? 'open' : 'closed'}</Text>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share</DialogTitle>
              <DialogDescription>Overlay tap and Android back both close it.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button width="full">Done</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>
    </Screen>
  )
}

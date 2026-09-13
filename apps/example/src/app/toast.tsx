import { Screen, Section } from '@/components/screen'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

export default function ToastScreen() {
  return (
    <Screen>
      <Section title="Fire">
        <Button onPress={() => toast({ title: 'Saved', description: 'Your changes are live.' })}>
          Default
        </Button>
        <Button
          variant="destructive"
          onPress={() =>
            toast({
              title: 'Upload failed',
              description: 'Check your connection and try again.',
              variant: 'destructive',
            })
          }
        >
          Destructive
        </Button>
        <Button
          variant="outline"
          onPress={() =>
            toast({
              title: 'Message archived',
              duration: Infinity,
              action: { label: 'Undo', onPress: () => toast({ title: 'Restored' }) },
            })
          }
        >
          With action, sticky
        </Button>
        <Button
          variant="secondary"
          onPress={() => toast({ title: 'From the top', placement: 'top' })}
        >
          Top placement
        </Button>
        <Button variant="ghost" onPress={() => toast.dismiss()}>
          Dismiss all
        </Button>
      </Section>
    </Screen>
  )
}

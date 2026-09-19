import { useState } from 'react'
import { Stack, router } from 'expo-router'
import { SettingsScreen } from '@/components/blocks/settings-screen'
import { toast } from '@/components/ui/toast'
import { settingsSections } from '@/previews/blocks-app'

export default function SettingsScreenDemo() {
  const [push, setPush] = useState(true)
  const [dark, setDark] = useState(false)
  return (
    <>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SettingsScreen
        // The stack header already clears the status bar.
        insetTop={false}
        version="2.4.1"
        sections={settingsSections({
          push,
          onPushChange: setPush,
          dark,
          onDarkChange: setDark,
          onOpen: (title) => toast({ title: `Open ${title}` }),
        })}
        onSignOut={() => {
          toast({ title: 'Signed out' })
          router.back()
        }}
      />
    </>
  )
}

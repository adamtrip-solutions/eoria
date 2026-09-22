import { useEffect, useRef, useState } from 'react'
import { Stack, router } from 'expo-router'
import { EditProfile } from '@/components/blocks/edit-profile'
import { toast } from '@/components/ui/toast'
import { editProfilePhoto, editProfileValues, profileCountries } from '@/previews/blocks-account'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
export default function EditProfileDemo() {
  const attempts = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(editProfilePhoto.avatarUrl)
  return (
    <>
      <Stack.Screen options={{ title: 'Edit profile' }} />
      <EditProfile
        insetTop={false}
        defaultValues={editProfileValues}
        countries={profileCountries}
        initials={editProfilePhoto.initials}
        avatarUrl={avatarUrl}
        onChangePhoto={async () => {
          await wait(600)
          if (!mounted.current) return
          setAvatarUrl((current) => (current ? undefined : editProfilePhoto.avatarUrl))
          toast({ title: 'Profile photo updated' })
        }}
        onCancel={() => router.back()}
        onSubmit={async () => {
          await wait(1000)
          attempts.current += 1
          if (attempts.current === 1) throw new Error('Your changes could not be saved. Try again.')
          toast({ title: 'Profile saved' })
        }}
      />
    </>
  )
}

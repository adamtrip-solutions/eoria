import type { ReactElement } from 'react'
import {
  EditProfile,
  type EditProfileValues,
  type ProfileCountry,
} from '@/components/blocks/edit-profile'

export const profileCountries: ProfileCountry[] = [
  { value: 'PT', label: 'Portugal' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'US', label: 'United States' },
]
export const editProfileValues: EditProfileValues = {
  name: 'Ada Lovelace',
  username: 'ada',
  bio: 'Writes about analytical engines and component libraries.',
  birthday: new Date(1992, 11, 10),
  country: 'PT',
  website: 'https://example.com',
}
export const editProfilePhoto = { initials: 'AL', avatarUrl: 'https://i.pravatar.cc/200?img=47' }
const noop = () => {}

export const accountBlockPreviews: Record<string, () => ReactElement> = {
  'edit-profile': () => (
    <EditProfile
      defaultValues={editProfileValues}
      countries={profileCountries}
      {...editProfilePhoto}
      onChangePhoto={noop}
      onSubmit={noop}
      onCancel={noop}
    />
  ),
}

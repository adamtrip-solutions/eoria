import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, View, type StyleProp, type ViewStyle } from 'react-native'
import { CircleAlert } from 'lucide-react-native'
import { StyleSheet } from 'react-native-unistyles'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Field, FieldControl, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { KeyboardScrollView } from '@/components/ui/keyboard'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { VStack } from '@/components/ui/stack'
import { Text } from '@/components/ui/text'
import { Textarea } from '@/components/ui/textarea'

export type ProfileCountry = { value: string; label: string }
export type EditProfileValues = {
  name: string
  username: string
  bio: string
  birthday?: Date
  country: string
  website: string
}
export type EditProfileProps = {
  defaultValues?: Partial<EditProfileValues>
  countries: ProfileCountry[]
  avatarUrl?: string
  initials?: string
  onChangePhoto?: () => void | Promise<void>
  onSubmit: (values: EditProfileValues) => void | Promise<void>
  onCancel?: () => void | Promise<void>
  insetTop?: boolean
  style?: StyleProp<ViewStyle>
}

export function EditProfile({
  defaultValues,
  countries,
  avatarUrl,
  initials,
  onChangePhoto,
  onSubmit,
  onCancel,
  insetTop = true,
  style,
}: EditProfileProps) {
  const [name, setName] = useState(defaultValues?.name ?? '')
  const [username, setUsername] = useState(defaultValues?.username ?? '')
  const [bio, setBio] = useState(defaultValues?.bio ?? '')
  const [birthday, setBirthday] = useState(defaultValues?.birthday)
  const [country, setCountry] = useState(defaultValues?.country ?? '')
  const [website, setWebsite] = useState(defaultValues?.website ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState<'save' | 'photo' | 'cancel'>()
  const [failure, setFailure] = useState<string>()
  const pending = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const nameError = name.trim() ? undefined : 'Enter your name.'
  const usernameError =
    username.trim() === '' || /^[a-zA-Z0-9_]+$/.test(username.trim())
      ? undefined
      : 'Use letters, numbers and underscores.'
  const bioError = bio.length <= 160 ? undefined : 'Keep your bio to 160 characters.'
  const birthdayError =
    birthday && (!Number.isFinite(birthday.getTime()) || birthday > new Date())
      ? 'Choose a birthday in the past.'
      : undefined
  const countryError =
    country === '' || countries.some((item) => item.value === country)
      ? undefined
      : 'Choose a country from the list.'
  let websiteError: string | undefined
  if (website.trim()) {
    try {
      const url = new URL(website.trim())
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) throw new Error()
    } catch {
      websiteError = 'Enter a full website address, such as https://example.com.'
    }
  }

  const run = async (action: NonNullable<typeof busy>, callback: () => void | Promise<void>) => {
    if (pending.current) return
    pending.current = true
    setBusy(action)
    setFailure(undefined)
    try {
      await callback()
    } catch (error) {
      if (mounted.current) {
        const message =
          error instanceof Error && error.message
            ? error.message
            : 'Something went wrong. Try again.'
        setFailure(message)
        AccessibilityInfo.announceForAccessibility(message)
      }
    } finally {
      pending.current = false
      if (mounted.current) setBusy(undefined)
    }
  }
  const submit = () => {
    if (pending.current) return
    setSubmitted(true)
    if (nameError || usernameError || bioError || birthdayError || countryError || websiteError)
      return
    void run('save', () =>
      onSubmit({
        name: name.trim(),
        username: username.trim(),
        bio: bio.trim(),
        ...(birthday ? { birthday } : {}),
        country,
        website: website.trim(),
      }),
    )
  }
  const disabled = busy !== undefined
  const fallback =
    initials ??
    (name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('') ||
      '?')

  return (
    <View style={[styles.root, insetTop && styles.insetTop, style]}>
      <KeyboardScrollView contentContainerStyle={styles.content}>
        <Text variant="heading" accessibilityRole="header">
          Edit profile
        </Text>
        <VStack gap={3} align="center">
          <Avatar
            key={avatarUrl ?? 'initials'}
            size="xl"
            accessibilityLabel={name.trim() || 'Profile photo'}
          >
            {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
          {onChangePhoto ? (
            <Button
              variant="outline"
              loading={busy === 'photo'}
              disabled={disabled && busy !== 'photo'}
              onPress={() => void run('photo', onChangePhoto)}
            >
              Change photo
            </Button>
          ) : null}
        </VStack>
        {failure ? (
          <Alert variant="destructive" icon={<CircleAlert />} accessibilityLiveRegion="polite">
            <AlertTitle>Could not update profile</AlertTitle>
            <AlertDescription>{failure}</AlertDescription>
          </Alert>
        ) : null}
        <Field invalid={submitted && !!nameError} disabled={disabled}>
          <FieldLabel>Name</FieldLabel>
          <FieldControl>
            <Input value={name} onChangeText={setName} autoComplete="name" autoCapitalize="words" />
          </FieldControl>
          <FieldError>{nameError}</FieldError>
        </Field>
        <Field invalid={submitted && !!usernameError} disabled={disabled}>
          <FieldLabel>Username</FieldLabel>
          <FieldControl>
            <InputGroup>
              <InputGroupAddon>@</InputGroupAddon>
              <InputGroupInput
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </InputGroup>
          </FieldControl>
          <FieldError>{usernameError}</FieldError>
        </Field>
        <Field invalid={submitted && !!bioError} disabled={disabled}>
          <FieldLabel>Bio</FieldLabel>
          <FieldControl>
            <Textarea value={bio} onChangeText={setBio} maxLength={160} />
          </FieldControl>
          <Text variant="caption">{`${bio.length}/160 characters`}</Text>
          <FieldError>{bioError}</FieldError>
        </Field>
        <Field invalid={submitted && !!birthdayError} disabled={disabled}>
          <FieldLabel>Birthday, optional</FieldLabel>
          <FieldControl>
            <DatePicker
              key={birthday ? 'selected' : 'empty'}
              value={birthday && Number.isFinite(birthday.getTime()) ? birthday : undefined}
              onValueChange={setBirthday}
              maximumDate={new Date()}
              title="Birthday"
            />
          </FieldControl>
          {birthday ? (
            <Button variant="link" disabled={disabled} onPress={() => setBirthday(undefined)}>
              Clear birthday
            </Button>
          ) : null}
          <FieldError>{birthdayError}</FieldError>
        </Field>
        <Field invalid={submitted && !!countryError} disabled={disabled}>
          <FieldLabel>Country</FieldLabel>
          <Select
            value={countries.find((item) => item.value === country)}
            onValueChange={(item) => setCountry(item.value)}
            disabled={disabled}
            invalid={submitted && !!countryError}
          >
            <SelectTrigger accessibilityLabel="Country" placeholder="Choose a country" />
            <SelectContent>
              {countries.map((item) => (
                <SelectItem key={item.value} {...item} />
              ))}
            </SelectContent>
          </Select>
          <FieldError>{countryError}</FieldError>
        </Field>
        <Field invalid={submitted && !!websiteError} disabled={disabled}>
          <FieldLabel>Website</FieldLabel>
          <FieldControl>
            <Input
              value={website}
              onChangeText={setWebsite}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://example.com"
              returnKeyType="done"
              onSubmitEditing={submit}
            />
          </FieldControl>
          <FieldError>{websiteError}</FieldError>
        </Field>
        <Button
          width="full"
          loading={busy === 'save'}
          disabled={disabled && busy !== 'save'}
          onPress={submit}
        >
          Save changes
        </Button>
        {onCancel ? (
          <Button
            variant="ghost"
            loading={busy === 'cancel'}
            disabled={disabled && busy !== 'cancel'}
            onPress={() => void run('cancel', onCancel)}
          >
            Cancel
          </Button>
        ) : null}
      </KeyboardScrollView>
    </View>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: { flex: 1, backgroundColor: theme.colors.background },
  insetTop: { paddingTop: rt.insets.top },
  content: {
    gap: theme.space[5],
    paddingTop: theme.space[6],
    paddingLeft: rt.insets.left + theme.space[4],
    paddingRight: rt.insets.right + theme.space[4],
    paddingBottom: rt.insets.bottom + theme.space[6],
  },
}))

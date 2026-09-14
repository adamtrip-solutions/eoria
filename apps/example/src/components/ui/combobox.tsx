import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  FlatList,
  Keyboard,
  Pressable,
  View,
  type FlatListProps,
  type PressableProps,
} from 'react-native'
import {
  extendSlotRecipe,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Input } from '@/components/ui/input'
import {
  Popper,
  PopperAnchor,
  PopperContent,
  type PopperContentProps,
} from '@/components/ui/popper'
import { selectRecipe } from '@/components/ui/select'
import { Text } from '@/components/ui/text'

/**
 * Select recipe plus a search row and an empty state. Edits to the Select
 * base, the trigger frame and the list rows flow through.
 */
export const comboboxRecipe = extendSlotRecipe(selectRecipe, (theme) => ({
  slots: {
    search: {
      paddingHorizontal: theme.space[2],
      paddingBottom: theme.space[2],
    },
    empty: {
      paddingHorizontal: theme.space[4],
      paddingVertical: theme.space[3],
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
  },
}))

type ComboboxSlots =
  | 'value'
  | 'placeholder'
  | 'chevron'
  | 'content'
  | 'list'
  | 'item'
  | 'itemPressed'
  | 'itemSelected'
  | 'itemDisabled'
  | 'itemLabel'
  | 'check'
  | 'label'
  | 'search'
  | 'empty'

export type ComboboxOption = {
  value: string
  label: string
  disabled?: boolean
  /** Extra terms the default filter matches, besides the label. */
  keywords?: string[]
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Case- and accent-insensitive substring match on label and keywords. */
export function defaultComboboxFilter(option: ComboboxOption, query: string): boolean {
  const q = fold(query.trim())
  if (!q) return true
  if (fold(option.label).includes(q)) return true
  return option.keywords?.some((k) => fold(k).includes(q)) ?? false
}

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  options: ReadonlyArray<ComboboxOption>
  selected: ComboboxOption | undefined
  select: (option: ComboboxOption) => void
  query: string
  setQuery: (q: string) => void
  filter: (option: ComboboxOption, query: string) => boolean
  disabled: boolean
  styles: SlotStyles<ComboboxSlots>
}
const ComboboxContext = createContext<Ctx | null>(null)

function useCombobox(part: string) {
  const ctx = useContext(ComboboxContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <Combobox>`)
  return ctx
}

export type ComboboxProps = Pick<RecipeVariants<typeof comboboxRecipe>, 'size'> & {
  options: ReadonlyArray<ComboboxOption>
  /** Selected option value. Present-but-undefined means controlled and cleared. */
  value?: string | undefined
  defaultValue?: string
  onValueChange?: (value: string, option: ComboboxOption) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Replaces the default label and keyword match. */
  filter?: (option: ComboboxOption, query: string) => boolean
  invalid?: boolean
  disabled?: boolean
  styles?: SlotOverrides<ComboboxSlots>
  children?: ReactNode
}

export function Combobox(props: ComboboxProps) {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onValueChange,
    open: controlledOpen,
    onOpenChange,
    filter = defaultComboboxFilter,
    size,
    invalid = false,
    disabled = false,
    styles,
    children,
  } = props
  const isControlled = 'value' in props
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const [query, setQuery] = useState('')
  const value = isControlled ? controlledValue : uncontrolledValue
  const open = controlledOpen ?? uncontrolledOpen
  const selected = useMemo(() => options.find((o) => o.value === value), [options, value])
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
      if (!next) setQuery('')
    },
    [controlledOpen, onOpenChange],
  )
  const select = useCallback(
    (option: ComboboxOption) => {
      if (!isControlled) setUncontrolledValue(option.value)
      onValueChange?.(option.value, option)
      setOpen(false)
    },
    [isControlled, onValueChange, setOpen],
  )
  const s = useRecipe(comboboxRecipe, { size, open, invalid, disabled }, styles)
  return (
    <ComboboxContext.Provider
      value={{
        open,
        setOpen,
        options,
        selected,
        select,
        query,
        setQuery,
        filter,
        disabled,
        styles: s,
      }}
    >
      <Popper>{children}</Popper>
    </ComboboxContext.Provider>
  )
}

export type ComboboxTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  placeholder?: string
  children?: ReactNode
}

/** Shows the selected label or the placeholder. Full width by default. */
export function ComboboxTrigger({
  placeholder = 'Select…',
  children,
  ...rest
}: ComboboxTriggerProps) {
  const { open, setOpen, selected, disabled, styles } = useCombobox('ComboboxTrigger')
  return (
    <PopperAnchor style={{ alignSelf: 'stretch' }}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityValue={selected ? { text: selected.label } : undefined}
        disabled={disabled}
        onPress={() => setOpen(!open)}
        style={styles.root}
        {...rest}
      >
        {children ?? (
          <Text numberOfLines={1} style={[styles.value, !selected && styles.placeholder]}>
            {selected ? selected.label : placeholder}
          </Text>
        )}
        <View style={styles.chevron} />
      </Pressable>
    </PopperAnchor>
  )
}

export type ComboboxContentProps = Omit<PopperContentProps, 'onDismiss' | 'matchAnchorWidth'> & {
  searchPlaceholder?: string
  /** Shown when no option matches. */
  emptyText?: string
  /** Custom row body. Receives the option and whether it is selected. */
  renderOption?: (option: ComboboxOption, selected: boolean) => ReactNode
  listProps?: Partial<Omit<FlatListProps<ComboboxOption>, 'data' | 'renderItem'>>
}

const LIST_MAX = 280
const PAD = 8

function Row({
  option,
  renderOption,
}: {
  option: ComboboxOption
  renderOption?: ComboboxContentProps['renderOption']
}) {
  const { selected, select, styles } = useCombobox('ComboboxItem')
  const isSelected = selected?.value === option.value
  return (
    <Pressable
      role="option"
      accessibilityState={{ selected: isSelected, disabled: option.disabled === true }}
      accessibilityLabel={option.label}
      disabled={option.disabled}
      onPress={() => select(option)}
      style={({ pressed }) => [
        styles.item,
        isSelected && styles.itemSelected,
        pressed && styles.itemPressed,
        option.disabled && styles.itemDisabled,
      ]}
    >
      {renderOption ? (
        renderOption(option, isSelected)
      ) : (
        <Text style={styles.itemLabel}>{option.label}</Text>
      )}
      {isSelected ? <View style={styles.check} /> : null}
    </Pressable>
  )
}

/**
 * Search field over a filtered list. The list shrinks so it stays above the
 * keyboard, since the popper positions against the window, not the keyboard.
 */
export function ComboboxContent({
  align = 'start',
  searchPlaceholder = 'Search…',
  emptyText = 'No results',
  renderOption,
  listProps,
  style,
  ...rest
}: ComboboxContentProps) {
  const ctx = useCombobox('ComboboxContent')
  const { open, setOpen, options, query, setQuery, filter, styles } = ctx
  const dismiss = useCallback(() => setOpen(false), [setOpen])
  const listWrap = useRef<View>(null)
  const [maxHeight, setMaxHeight] = useState(LIST_MAX)

  useEffect(() => {
    if (!open) return
    // Use the keyboard's top edge, not its height: Android may already have
    // shrunk the window to make room, and subtracting twice would leave nothing.
    const fit = (keyboardTop: number) => {
      listWrap.current?.measureInWindow((_x, y) => {
        const room = keyboardTop - y - PAD
        setMaxHeight(Math.max(120, Math.min(LIST_MAX, room)))
      })
    }
    const show = Keyboard.addListener('keyboardDidShow', (e) => fit(e.endCoordinates.screenY))
    const hide = Keyboard.addListener('keyboardDidHide', () => setMaxHeight(LIST_MAX))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [open])

  const visible = useMemo(() => options.filter((o) => filter(o, query)), [options, filter, query])

  if (!open) return null
  return (
    <PopperContent
      align={align}
      matchAnchorWidth
      onDismiss={dismiss}
      style={[styles.content, style]}
      {...rest}
    >
      <ComboboxContext.Provider value={ctx}>
        <View style={styles.search}>
          <Input
            size="sm"
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            accessibilityLabel={searchPlaceholder}
          />
        </View>
        <View ref={listWrap} collapsable={false}>
          <FlatList
            role="list"
            data={visible}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => <Row option={item} renderOption={renderOption} />}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            style={[styles.list, { maxHeight }]}
            ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
            {...listProps}
          />
        </View>
      </ComboboxContext.Provider>
    </PopperContent>
  )
}

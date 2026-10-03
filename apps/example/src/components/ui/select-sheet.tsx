import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from 'react'
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  View,
  type FlatListProps,
  type PressableProps,
} from 'react-native'
import { Plus } from 'lucide-react-native'
import {
  defineSlotRecipe,
  getStyleValue,
  useRecipe,
  type RecipeVariants,
  type SlotOverrides,
  type SlotStyles,
} from '@eoria/core'
import { Button } from '@/components/ui/button'
import { SearchBar, type SearchBarProps } from '@/components/ui/search-bar'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetList,
  SheetTitle,
  type SheetContentProps,
  type SheetProps,
  type SheetRef,
} from '@/components/ui/sheet'
import { Text } from '@/components/ui/text'

/**
 * Select whose options open in a bottom Sheet, with optional search. The trigger mirrors
 * the Select trigger, so the two line up in a form. Rows run edge to edge and line up with
 * the sheet title.
 */
export const selectSheetRecipe = defineSlotRecipe((theme) => ({
  slots: {
    /** Trigger. Mirrors the Input frame. Full width by default. */
    root: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.space[2],
      minHeight: theme.control.md,
      paddingHorizontal: theme.space[4],
      borderWidth: 1.5,
      borderColor: theme.stroke ? theme.colors.input : 'transparent',
      borderRadius: theme.radius.control,
      backgroundColor: theme.colors.muted,
    },
    value: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    placeholder: { color: theme.colors.mutedForeground },
    /** Chevron drawn with two borders, rotated. */
    chevron: {
      width: 8,
      height: 8,
      marginTop: -4,
      borderRightWidth: 1.5,
      borderBottomWidth: 1.5,
      borderColor: theme.colors.mutedForeground,
      transform: [{ rotate: '45deg' }],
    },
    /** Around the sheet title and description. */
    header: { paddingHorizontal: theme.space[6] },
    /** Around the SearchBar. */
    search: { paddingHorizontal: theme.space[6] },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      minHeight: 52,
      paddingHorizontal: theme.space[6],
      paddingVertical: theme.space[2],
    },
    itemPressed: { backgroundColor: theme.colors.accent },
    itemSelected: { backgroundColor: theme.colors.accent },
    itemDisabled: { opacity: 0.5 },
    /** Read by the icon adapter: `width` becomes `size`, `color` becomes `color`. */
    itemIcon: { width: 20, height: 20, color: theme.colors.foreground },
    itemContent: { flex: 1, justifyContent: 'center' },
    itemLabel: {
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.foreground,
    },
    itemDescription: {
      fontSize: theme.fontSize.sm,
      lineHeight: theme.lineHeight.sm,
      color: theme.colors.mutedForeground,
    },
    /** Checkmark on the selected row of a single select. Drawn with borders. */
    check: {
      width: 6,
      height: 11,
      marginTop: -3,
      marginHorizontal: 4,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: theme.colors.primary,
      transform: [{ rotate: '45deg' }],
    },
    /** Box on every row of a multiple select. */
    box: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: theme.colors.mutedForeground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    /** Tick inside a checked box. */
    boxCheck: {
      width: 6,
      height: 10,
      marginTop: -2,
      borderRightWidth: 2,
      borderBottomWidth: 2,
      borderColor: theme.colors.primaryForeground,
      transform: [{ rotate: '45deg' }],
    },
    /** Row that creates an option from the search text. */
    create: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.space[3],
      minHeight: 52,
      paddingHorizontal: theme.space[6],
      paddingVertical: theme.space[2],
    },
    createPressed: { backgroundColor: theme.colors.accent },
    /** Read by the icon adapter, like `itemIcon`. */
    createIcon: { width: 20, height: 20, color: theme.colors.primary },
    createLabel: {
      flex: 1,
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      fontWeight: theme.fontWeight.medium,
      color: theme.colors.primary,
    },
    /** Row holding the spinner while `loading`. `color` is the spinner colour. */
    loading: {
      alignItems: 'center',
      paddingVertical: theme.space[4],
      color: theme.colors.mutedForeground,
    },
    empty: {
      alignItems: 'center',
      gap: theme.space[3],
      paddingHorizontal: theme.space[6],
      paddingVertical: theme.space[8],
    },
    emptyText: {
      textAlign: 'center',
      fontSize: theme.fontSize.md,
      lineHeight: theme.lineHeight.md,
      color: theme.colors.mutedForeground,
    },
  },
  variants: {
    size: {
      sm: { root: { minHeight: theme.control.sm }, value: { fontSize: theme.fontSize.sm } },
      md: {},
      lg: { root: { minHeight: theme.control.lg }, value: { fontSize: theme.fontSize.lg } },
    },
    open: {
      true: { root: { borderColor: theme.colors.ring } },
      false: {},
    },
    invalid: {
      true: { root: { borderColor: theme.colors.destructiveText } },
      false: {},
    },
    disabled: {
      true: { root: { opacity: 0.5 } },
      false: {},
    },
  },
  defaultVariants: { size: 'md', open: false, invalid: false, disabled: false },
}))

type SelectSheetSlots =
  | 'value'
  | 'placeholder'
  | 'chevron'
  | 'header'
  | 'search'
  | 'item'
  | 'itemPressed'
  | 'itemSelected'
  | 'itemDisabled'
  | 'itemIcon'
  | 'itemContent'
  | 'itemLabel'
  | 'itemDescription'
  | 'check'
  | 'box'
  | 'boxChecked'
  | 'boxCheck'
  | 'create'
  | 'createPressed'
  | 'createIcon'
  | 'createLabel'
  | 'loading'
  | 'empty'
  | 'emptyText'

export type SelectSheetValue = string | number

export type SelectSheetOption<T extends SelectSheetValue = string> = {
  value: T
  label: string
  /** Second line under the label. Searched and read out with it. */
  description?: string
  /** Any element accepting `size` and `color` props, e.g. a lucide icon. */
  icon?: ReactElement<{ size?: number; color?: string }>
  disabled?: boolean
  /** Extra terms the default filter matches, besides the label and description. */
  keywords?: string[]
}

export type SelectSheetFilter<T extends SelectSheetValue = string> = (
  option: SelectSheetOption<T>,
  query: string,
) => boolean

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Case- and accent-insensitive substring match on label, description and keywords. */
export function defaultSelectSheetFilter<T extends SelectSheetValue>(
  option: SelectSheetOption<T>,
  query: string,
): boolean {
  const q = fold(query)
  if (!q) return true
  if (fold(option.label).includes(q)) return true
  if (option.description && fold(option.description).includes(q)) return true
  return option.keywords?.some((k) => fold(k).includes(q)) ?? false
}

/** Methods on the `SelectSheet` ref. The same as the Sheet ref. */
export type SelectSheetRef = SheetRef

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  options: ReadonlyArray<SelectSheetOption<SelectSheetValue>>
  values: ReadonlyArray<SelectSheetValue>
  toggle: (option: SelectSheetOption<SelectSheetValue>) => void
  multiple: boolean
  closeOnSelect: boolean
  query: string
  setQuery: (query: string) => void
  filter: SelectSheetFilter<SelectSheetValue> | false
  loading: boolean
  size: RecipeVariants<typeof selectSheetRecipe>['size']
  invalid: boolean
  disabled: boolean
  styles: SlotStyles<SelectSheetSlots>
  /** Kept raw so the trigger can resolve the recipe again with a Field's state. */
  overrides: SlotOverrides<SelectSheetSlots> | undefined
}
const SelectSheetContext = createContext<Ctx | null>(null)

function useSelectSheet(part: string) {
  const ctx = useContext(SelectSheetContext)
  if (!ctx) throw new Error(`${part} must be rendered inside <SelectSheet>`)
  return ctx
}

type SingleProps<T extends SelectSheetValue> = {
  multiple?: false
  /** Selected value. Present-but-undefined means controlled and cleared. */
  value?: NoInfer<T> | undefined
  defaultValue?: NoInfer<T>
  onValueChange?: (value: NoInfer<T>, option: SelectSheetOption<NoInfer<T>>) => void
}

type MultipleProps<T extends SelectSheetValue> = {
  multiple: true
  value?: ReadonlyArray<NoInfer<T>>
  defaultValue?: ReadonlyArray<NoInfer<T>>
  /** Receives every selected value and the option that was toggled. */
  onValueChange?: (value: NoInfer<T>[], option: SelectSheetOption<NoInfer<T>>) => void
}

export type SelectSheetProps<T extends SelectSheetValue = string> = Pick<
  RecipeVariants<typeof selectSheetRecipe>,
  'size'
> &
  (SingleProps<T> | MultipleProps<T>) & {
    options: ReadonlyArray<SelectSheetOption<T>>
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Called once the sheet has finished closing, after the query has been cleared. */
    onDismiss?: () => void
    /** Close after a row is chosen. Default true for single, false for multiple. */
    closeOnSelect?: boolean
    /** Search text. Passing it hands the query, and by default the filtering, to you. */
    query?: string
    onQueryChange?: (query: string) => void
    /**
     * Local filter. Defaults to `defaultSelectSheetFilter` while the query is uncontrolled and
     * to `false`, no filtering, when `query` is passed.
     */
    filter?: SelectSheetFilter<T> | false
    /**
     * Results are on their way. Shows a spinner above the rows and holds back the empty state
     * and the create row.
     */
    loading?: boolean
    invalid?: boolean
    disabled?: boolean
    styles?: SlotOverrides<SelectSheetSlots>
    /** Overrides for the Sheet slots. */
    sheetStyles?: SheetProps['styles']
    children?: ReactNode
  }

function SelectSheetImpl(
  props: SelectSheetProps<SelectSheetValue>,
  ref: ForwardedRef<SelectSheetRef>,
) {
  const {
    options,
    multiple = false,
    open: controlledOpen,
    onOpenChange,
    onDismiss,
    closeOnSelect = !multiple,
    query: controlledQuery,
    onQueryChange,
    filter = controlledQuery === undefined ? defaultSelectSheetFilter : false,
    loading = false,
    size,
    invalid = false,
    disabled = false,
    styles,
    sheetStyles,
    children,
  } = props
  // Controlled when the `value` key is present, even if undefined (cleared).
  const isControlled = 'value' in props
  const [uncontrolledValue, setUncontrolledValue] = useState(props.defaultValue)
  const raw = isControlled ? props.value : uncontrolledValue
  const values = useMemo<ReadonlyArray<SelectSheetValue>>(
    () => (raw === undefined ? [] : Array.isArray(raw) ? raw : [raw as SelectSheetValue]),
    [raw],
  )

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) setUncontrolledOpen(next)
      onOpenChange?.(next)
    },
    [controlledOpen, onOpenChange],
  )

  const [uncontrolledQuery, setUncontrolledQuery] = useState('')
  const query = controlledQuery ?? uncontrolledQuery
  const setQuery = useCallback(
    (next: string) => {
      if (controlledQuery === undefined) setUncontrolledQuery(next)
      onQueryChange?.(next)
    },
    [controlledQuery, onQueryChange],
  )

  const onChange = props.onValueChange as
    | ((
        value: SelectSheetValue | SelectSheetValue[],
        option: SelectSheetOption<SelectSheetValue>,
      ) => void)
    | undefined
  // Toggles build on this, not on the rendered `values`, so taps that land before the parent
  // re-renders are not lost. Every commit resets it, so a controlled parent that keeps its
  // value wins.
  const latest = useRef(values)
  useLayoutEffect(() => {
    latest.current = values
  })
  const toggle = useCallback(
    (option: SelectSheetOption<SelectSheetValue>) => {
      if (option.disabled) return
      if (multiple) {
        const current = latest.current
        const next = current.includes(option.value)
          ? current.filter((v) => v !== option.value)
          : [...current, option.value]
        latest.current = next
        if (!isControlled) setUncontrolledValue(next)
        onChange?.(next, option)
      } else {
        latest.current = [option.value]
        if (!isControlled) setUncontrolledValue(option.value)
        onChange?.(option.value, option)
      }
      if (closeOnSelect) setOpen(false)
    },
    [multiple, isControlled, onChange, closeOnSelect, setOpen],
  )

  // After the close animation, so the list does not jump while it slides away.
  const handleDismiss = useCallback(() => {
    if (query !== '') setQuery('')
    onDismiss?.()
  }, [query, setQuery, onDismiss])

  const s = useRecipe(selectSheetRecipe, { size, open, invalid, disabled }, styles)
  return (
    <SelectSheetContext.Provider
      value={{
        open,
        setOpen,
        options,
        values,
        toggle,
        multiple,
        closeOnSelect,
        query,
        setQuery,
        filter: filter as Ctx['filter'],
        loading,
        size,
        invalid,
        disabled,
        styles: s,
        overrides: styles,
      }}
    >
      <Sheet
        ref={ref}
        open={open}
        onOpenChange={setOpen}
        onDismiss={handleDismiss}
        inset="flush"
        styles={sheetStyles}
      >
        {children}
      </Sheet>
    </SelectSheetContext.Provider>
  )
}

/**
 * Holds the options and the selection. Renders nothing itself: put a `SelectSheetTrigger`
 * and a `SelectSheetContent` inside, or only the content and open it from the ref.
 */
export const SelectSheet = forwardRef(SelectSheetImpl) as <T extends SelectSheetValue = string>(
  props: SelectSheetProps<T> & RefAttributes<SelectSheetRef>,
) => ReactElement

export type SelectSheetTriggerProps = Omit<PressableProps, 'style' | 'children'> & {
  placeholder?: string
  /** Set by a Field through `FieldControl`, or by hand. Added to the `SelectSheet` state. */
  invalid?: boolean
  children?: ReactNode
}

/**
 * Shows the selected labels or the placeholder. Dismisses the keyboard before the sheet
 * opens.
 */
export function SelectSheetTrigger({
  placeholder = 'Select…',
  invalid: fieldInvalid,
  disabled: fieldDisabled,
  onPress,
  children,
  ...rest
}: SelectSheetTriggerProps) {
  const ctx = useSelectSheet('SelectSheetTrigger')
  const { open, setOpen, options, values, size, overrides } = ctx
  const invalid = ctx.invalid || fieldInvalid === true
  const disabled = ctx.disabled || fieldDisabled === true
  const s = useRecipe(selectSheetRecipe, { size, open, invalid, disabled }, overrides)
  const label = useMemo(
    () =>
      options
        .filter((o) => values.includes(o.value))
        .map((o) => o.label)
        .join(', '),
    [options, values],
  )
  return (
    <Pressable
      accessibilityRole="combobox"
      accessibilityState={{ expanded: open, disabled }}
      accessibilityValue={label ? { text: label } : undefined}
      disabled={disabled}
      onPress={(e) => {
        Keyboard.dismiss()
        setOpen(true)
        onPress?.(e)
      }}
      style={s.root}
      {...rest}
    >
      {children ?? (
        <Text numberOfLines={1} style={[s.value, !label && s.placeholder]}>
          {label || placeholder}
        </Text>
      )}
      <View style={s.chevron} />
    </Pressable>
  )
}

export type SelectSheetContentProps<T extends SelectSheetValue = SelectSheetValue> = Omit<
  SheetContentProps,
  'children' | 'scroll' | 'accessibilityLabel' | 'footer'
> & {
  /** Sheet title. Names the select for screen readers and takes focus on open. */
  title: string
  description?: string
  /** Show a SearchBar above the list. Default false. */
  searchable?: boolean
  /** Placeholder and accessibility label of the search field. Default `"Search"`. */
  searchPlaceholder?: string
  /** Other SearchBar props, e.g. `autoFocus`. */
  searchProps?: Omit<SearchBarProps, 'value' | 'defaultValue' | 'onChangeText' | 'placeholder'>
  /** Shown when no row is left to show. Default `"No results"`. */
  emptyText?: string
  /** Button under `emptyText`. Receives the trimmed query. */
  emptyAction?: { label: string; onPress: (query: string) => void }
  /**
   * Row above the options while the query has no option with the same label. Receives the
   * trimmed query. `alwaysShow` keeps it for a query that matches a label, for records whose
   * labels can repeat.
   */
  createAction?: {
    label: (query: string) => string
    onPress: (query: string) => void
    alwaysShow?: boolean
  }
  /** Read out for the spinner while `loading`. Default `"Loading"`. */
  loadingLabel?: string
  /** Custom row body. The row keeps its press, role, state and selection mark. */
  renderOption?: (option: SelectSheetOption<T>, selected: boolean) => ReactNode
  /**
   * Pinned under the list. A multiple select gets a Done button that closes the sheet;
   * pass `null` to drop it.
   */
  footer?: ReactNode
  /** Label of the default Done button. Default `"Done"`. */
  doneLabel?: string
  listProps?: Partial<
    Omit<FlatListProps<SelectSheetOption<T>>, 'data' | 'renderItem' | 'extraData'>
  >
}

const DEFAULT_SNAP_POINTS = ['65%']

type RowProps = {
  option: SelectSheetOption<SelectSheetValue>
  selected: boolean
  multiple: boolean
  onPress: (option: SelectSheetOption<SelectSheetValue>) => void
  renderOption?: (option: SelectSheetOption<SelectSheetValue>, selected: boolean) => ReactNode
  styles: SlotStyles<SelectSheetSlots>
}

/** Takes everything as props: the sheet renders in a portal that our context does not reach. */
function Row({ option, selected, multiple, onPress, renderOption, styles: s }: RowProps) {
  const disabled = option.disabled === true
  const icon = isValidElement(option.icon)
    ? cloneElement(option.icon, {
        size: getStyleValue(s.itemIcon, 'width') as number | undefined,
        color: getStyleValue(s.itemIcon, 'color') as string | undefined,
      })
    : null
  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={
        option.description ? `${option.label}, ${option.description}` : option.label
      }
      disabled={disabled}
      onPress={() => onPress(option)}
      style={({ pressed }) => [
        s.item,
        selected && s.itemSelected,
        pressed && s.itemPressed,
        disabled && s.itemDisabled,
      ]}
    >
      {renderOption ? (
        renderOption(option, selected)
      ) : (
        <>
          {icon}
          <View style={s.itemContent}>
            <Text style={s.itemLabel}>{option.label}</Text>
            {option.description ? (
              <Text style={s.itemDescription}>{option.description}</Text>
            ) : null}
          </View>
        </>
      )}
      {multiple ? (
        <View style={[s.box, selected && s.boxChecked]}>
          {selected ? <View style={s.boxCheck} /> : null}
        </View>
      ) : selected ? (
        <View style={s.check} />
      ) : null}
    </Pressable>
  )
}

/**
 * The sheet: title, optional search, then the options in a `SheetList`. Opens at 65% by
 * default, a fixed height, so the keyboard lifts the whole sheet and the rows stay above it.
 */
export function SelectSheetContent<T extends SelectSheetValue = SelectSheetValue>({
  title,
  description,
  searchable = false,
  searchPlaceholder,
  searchProps,
  emptyText = 'No results',
  emptyAction,
  createAction,
  loadingLabel = 'Loading',
  renderOption,
  footer,
  doneLabel = 'Done',
  listProps,
  snapPoints = DEFAULT_SNAP_POINTS,
  ...rest
}: SelectSheetContentProps<T>) {
  const ctx = useSelectSheet('SelectSheetContent')
  const {
    options,
    values,
    toggle,
    multiple,
    closeOnSelect,
    query,
    setQuery,
    filter,
    loading,
    setOpen,
    styles: s,
  } = ctx

  const visible = useMemo(
    () => (filter ? options.filter((o) => filter(o, query)) : options),
    [options, filter, query],
  )
  const trimmed = query.trim()
  // Hidden while results load: stale or empty options would offer to create one that exists.
  const showCreate =
    createAction !== undefined &&
    !loading &&
    trimmed !== '' &&
    (createAction.alwaysShow === true || !options.some((o) => fold(o.label) === fold(trimmed)))

  // The create and empty actions count as a choice: they close the sheet when a row would.
  const afterAction = () => {
    if (closeOnSelect) setOpen(false)
    else setQuery('')
  }

  const header =
    showCreate || loading ? (
      <>
        {showCreate ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              createAction.onPress(trimmed)
              afterAction()
            }}
            style={({ pressed }) => [s.create, pressed && s.createPressed]}
          >
            <Plus
              size={getStyleValue(s.createIcon, 'width') as number | undefined}
              color={getStyleValue(s.createIcon, 'color') as string | undefined}
            />
            <Text style={s.createLabel}>{createAction.label(trimmed)}</Text>
          </Pressable>
        ) : null}
        {loading ? (
          <View style={s.loading}>
            <ActivityIndicator
              accessibilityLabel={loadingLabel}
              color={getStyleValue(s.loading, 'color') as string | undefined}
            />
          </View>
        ) : null}
      </>
    ) : null

  const empty = loading ? null : (
    <View style={s.empty}>
      <Text style={s.emptyText}>{emptyText}</Text>
      {emptyAction ? (
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            emptyAction.onPress(trimmed)
            afterAction()
          }}
        >
          {emptyAction.label}
        </Button>
      ) : null}
    </View>
  )

  const pinned =
    footer !== undefined ? (
      footer
    ) : multiple ? (
      <Button width="full" onPress={() => setOpen(false)}>
        {doneLabel}
      </Button>
    ) : null

  return (
    <SheetContent snapPoints={snapPoints} footer={pinned} {...rest}>
      <SheetHeader style={s.header}>
        <SheetTitle>{title}</SheetTitle>
        {description ? <SheetDescription>{description}</SheetDescription> : null}
      </SheetHeader>
      {searchable ? (
        <View style={s.search}>
          <SearchBar
            {...searchProps}
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      ) : null}
      <SheetList
        accessibilityRole={multiple ? 'list' : 'radiogroup'}
        accessibilityLabel={title}
        accessibilityState={{ busy: loading }}
        data={visible as ReadonlyArray<SelectSheetOption<T>>}
        extraData={values}
        // The type keeps `1` and `'1'` apart.
        keyExtractor={(o) => `${typeof o.value}:${o.value}`}
        renderItem={({ item }) => (
          <Row
            option={item}
            selected={values.includes(item.value)}
            multiple={multiple}
            onPress={toggle}
            renderOption={renderOption as RowProps['renderOption']}
            styles={s}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        {...listProps}
      />
    </SheetContent>
  )
}

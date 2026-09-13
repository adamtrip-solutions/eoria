# eoria

A React Native component library in the shadcn model. Components are source
files you copy into your app and own. A small runtime package, `@eoria/core`,
provides the styling engine on top of [Unistyles 3](https://www.unistyl.es).

Status: pre-alpha. Nothing is published yet. The API will change.

## Requirements

- Expo SDK 57 or React Native 0.86 with the New Architecture.
- A development build. Expo Go is not supported because Unistyles and
  Reanimated ship native code.
- `react-native-unistyles` 3.x and `react-native-reanimated` 4.x as peers.

## How it works

Every component is a slot recipe. A recipe declares named parts (slots), the
variants that change them, and defaults. `useRecipe` resolves it to plain
React Native styles through one Unistyles stylesheet, so theme and breakpoint
changes are handled off the JS thread.

```tsx
export const buttonRecipe = defineSlotRecipe((theme) => ({
  slots: {
    root: { borderRadius: theme.radius.md },
    label: { color: theme.colors.foreground },
  },
  variants: {
    variant: {
      default: { root: { backgroundColor: theme.colors.primary } },
      outline: { root: { borderWidth: 1, borderColor: theme.colors.border } },
    },
  },
  defaultVariants: { variant: 'default' },
}))
```

Recipes extend without touching the base. A derived component imports the
local base recipe, so edits to the base flow through automatically:

```tsx
export const checkoutButtonRecipe = extendSlotRecipe(buttonRecipe, (theme) => ({
  slots: { root: { borderRadius: theme.radius.full } },
  variants: { variant: { brand: { root: { backgroundColor: '#7c3aed' } } } },
  defaultVariants: { variant: 'brand' },
}))

export const CheckoutButton = createButton(checkoutButtonRecipe)
```

Merge rules: slots deep-merge per slot, variants deep-merge per name then per
slot, compound variants append, default variants override. Nothing inherited
can be removed.

## Components

| Group      | Components                                                                    |
| ---------- | ----------------------------------------------------------------------------- |
| Layout     | Box, Stack (HStack, VStack), Separator, Card                                  |
| Typography | Text, Label, Badge                                                            |
| Forms      | Button, Input, Textarea, Field, Checkbox, Switch, RadioGroup, Select          |
| Feedback   | Progress, Skeleton, Avatar, Toast                                             |
| Disclosure | Accordion, Tabs                                                               |
| Overlays   | Dialog, Popover, Tooltip, DropdownMenu, plus the Portal and Popper primitives |

`eoria add <name>` resolves `registryDependencies` transitively, so adding
`select` also copies `popper`, `portal` and `text`.

## Themes

The look is native-first rather than shadcn: tall full-bleed buttons with a
press scale, filled fields, surface-tinted cards without hairline borders,
chip and segmented tabs, bottom sheets with a grabber, and dark pill toasts.
Three surface steps carry most of it: `background`, `surface` (cards and
tiles) and `muted` (controls), so a control keeps its fill inside a card.

`@eoria/core` ships one token scale and six colour presets: zinc (default),
blue, green, rose, violet and orange. Each preset is a light and a dark
palette for the same semantic keys.

```ts
import { colorPresets, createThemes } from '@eoria/core'

configureUnistyles({ themes: createThemes(colorPresets.violet) })
```

To switch presets at runtime, update the registered themes in place so
adaptive light/dark keeps working:

```ts
UnistylesRuntime.updateTheme('light', (t) => ({ ...t, colors: colorPresets.rose.light }))
UnistylesRuntime.updateTheme('dark', (t) => ({ ...t, colors: colorPresets.rose.dark }))
```

The example app's home screen has a mode and preset picker, and four
showcase screens (sign in, checkout, profile, settings) built only from
library components.

## Motion

Animations are short timings, 120 to 150 ms, with no springs. Reanimated
defaults every animation to `ReduceMotion.System`, so when the OS reduce
motion setting is on, transitions jump to their end state and the Skeleton
pulse stops. Wrap your app in `<ReducedMotionConfig mode={ReduceMotion.Never}>`
to force animations on, or `Always` to disable them everywhere.

## Repository layout

| Path            | Purpose                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/core` | `@eoria/core`: recipe engine, theme tokens, Jest mock.                                                 |
| `packages/cli`  | `eoria`: init, add, diff, extend over the registry.                                                    |
| `registry/ui`   | Component sources. The source of truth for what users copy.                                            |
| `registry/dist` | Static, shadcn-compatible registry JSON. Built, not committed.                                         |
| `apps/example`  | Expo app: a screen per component group, showcase screens, and the /preview routes the docs screenshot. |
| `apps/docs`     | Astro docs site styled from the core tokens. Serves `/r/`.                                             |
| `scripts`       | Registry build and example sync.                                                                       |

## Commands

```sh
pnpm install
pnpm typecheck        # all workspaces
pnpm test             # core unit tests
pnpm build            # core package
pnpm build:registry   # registry/dist
pnpm sync:example     # copy registry/ui into apps/example/src/components/ui
pnpm dev:docs         # docs site at http://localhost:4321
pnpm build:docs       # registry + docs into apps/docs/dist
pnpm --filter docs previews   # screenshot every component on the booted iOS simulator
```

Run the example with `pnpm --filter example ios` after `npx expo prebuild`.

The docs deploy to Cloudflare Pages as a static site at https://eoria.adamtrip.pt, from the
release workflow so the site never documents an unpublished package. See [RELEASING.md](RELEASING.md).

## Testing components

`@eoria/core/jest` mocks Unistyles with variant resolution, unlike the official
mock which strips variants. Add it to `setupFiles` in your Jest config.

## License

MIT

## Contributing and releases

See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and [RELEASING.md](RELEASING.md) for how `@eoria/core` and `eoria` reach npm.

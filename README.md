# eoria

Native-first React Native components you copy into your app and own. Built on
[Unistyles 3](https://www.unistyl.es) and Reanimated, with a small runtime package
and a CLI that keeps your copies in step with the registry.

Docs, previews and the registry live at **[eoria.adamtrip.pt](https://eoria.adamtrip.pt)**.

[![@eoria/core](https://img.shields.io/npm/v/%40eoria%2Fcore?label=%40eoria%2Fcore)](https://www.npmjs.com/package/@eoria/core)
[![@eoria/cli](https://img.shields.io/npm/v/%40eoria%2Fcli?label=%40eoria%2Fcli)](https://www.npmjs.com/package/@eoria/cli)
[![CI](https://github.com/adamtrip-solutions/eoria/actions/workflows/ci.yml/badge.svg)](https://github.com/adamtrip-solutions/eoria/actions/workflows/ci.yml)

Status: pre-alpha. The API may change before 1.0.

## Quick start

```sh
npx @eoria/cli init
npx @eoria/cli add button input card
```

`init` writes `eoria.json`, the Unistyles theme file and the Babel plugins, then installs
the peers. `add` copies the component sources into `src/components/ui` and pulls in whatever
they depend on, so `add select` also brings `popper`, `portal` and `text`. From there the
files are yours. Edit them, rename them, delete what you do not use.

Requirements: React Native with the New Architecture, which Unistyles 3 and Reanimated 4
need, and a development build, because Expo Go cannot run either. Any Expo SDK from 53 on
qualifies. The example app and the previews run on SDK 57 and React Native 0.86. The
[installation guide](https://eoria.adamtrip.pt/start/installation/) walks through the setup.

## The CLI

`@eoria/cli` installs an `eoria` binary. Run it with `npx @eoria/cli`, or add the package as
a dev dependency and call `pnpm eoria`.

| Command                      | What it does                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `eoria init`                 | Writes `eoria.json`, `src/unistyles.ts`, the theme import in your root layout, the Babel config and the `@/*` alias. Installs peers. |
| `eoria add <name…>`          | Copies components and their registry dependencies. Never overwrites without `--overwrite`.                                           |
| `eoria diff [name]`          | Shows what changed between your copies and the registry, and tells local edits from upstream ones.                                   |
| `eoria extend <base> <name>` | Creates a new component whose recipe extends a local base, so base edits flow into it.                                               |

`eoria.json` records a hash of every file the CLI wrote. That is how `diff` can say "you
changed this" instead of just "this differs". Commit it.

The registry is plain shadcn registry JSON, so `npx shadcn@latest add https://eoria.adamtrip.pt/r/button.json`
works too. You lose the hash tracking, `diff` and `extend`, but the files are identical.
The [CLI page](https://eoria.adamtrip.pt/start/cli/) covers every flag.

## Components

Each one has a page with simulator screenshots, props and usage.

| Group      | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout     | [Box](https://eoria.adamtrip.pt/components/box/), [Stack](https://eoria.adamtrip.pt/components/stack/), [Separator](https://eoria.adamtrip.pt/components/separator/), [Text](https://eoria.adamtrip.pt/components/text/)                                                                                                                                                                                                                                                                                                          |
| Forms      | [Button](https://eoria.adamtrip.pt/components/button/), [Input](https://eoria.adamtrip.pt/components/input/), [Textarea](https://eoria.adamtrip.pt/components/textarea/), [Field](https://eoria.adamtrip.pt/components/field/), [Label](https://eoria.adamtrip.pt/components/label/), [Checkbox](https://eoria.adamtrip.pt/components/checkbox/), [Switch](https://eoria.adamtrip.pt/components/switch/), [RadioGroup](https://eoria.adamtrip.pt/components/radio-group/), [Select](https://eoria.adamtrip.pt/components/select/) |
| Display    | [Card](https://eoria.adamtrip.pt/components/card/), [Badge](https://eoria.adamtrip.pt/components/badge/), [Avatar](https://eoria.adamtrip.pt/components/avatar/), [Progress](https://eoria.adamtrip.pt/components/progress/), [Skeleton](https://eoria.adamtrip.pt/components/skeleton/), [Accordion](https://eoria.adamtrip.pt/components/accordion/), [Tabs](https://eoria.adamtrip.pt/components/tabs/)                                                                                                                        |
| Overlays   | [Dialog](https://eoria.adamtrip.pt/components/dialog/), [Popover](https://eoria.adamtrip.pt/components/popover/), [Tooltip](https://eoria.adamtrip.pt/components/tooltip/), [DropdownMenu](https://eoria.adamtrip.pt/components/dropdown-menu/), [Toast](https://eoria.adamtrip.pt/components/toast/)                                                                                                                                                                                                                             |
| Primitives | [Portal](https://eoria.adamtrip.pt/components/portal/), [Popper](https://eoria.adamtrip.pt/components/popper/)                                                                                                                                                                                                                                                                                                                                                                                                                    |

## How it works

Every component is a slot recipe. A recipe names its parts (slots), the variants that change
them, and defaults. `useRecipe` turns it into one Unistyles stylesheet, so theme and
breakpoint changes are handled off the JS thread.

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

Recipes extend without touching the base. A derived component imports the local base recipe,
so edits to the base flow through automatically. This is what `eoria extend` generates:

```tsx
export const checkoutButtonRecipe = extendSlotRecipe(buttonRecipe, (theme) => ({
  slots: { root: { borderRadius: theme.radius.full } },
  variants: { variant: { brand: { root: { backgroundColor: '#7c3aed' } } } },
  defaultVariants: { variant: 'brand' },
}))

export const CheckoutButton = createButton(checkoutButtonRecipe)
```

Slots deep-merge per slot, variants deep-merge per name then per slot, compound variants
append, default variants override. Nothing inherited can be removed. The
[recipes page](https://eoria.adamtrip.pt/start/recipes/) has the full merge order.

## Look and themes

The look is native-first rather than shadcn. Tall full-bleed buttons with a press scale,
filled fields, surface-tinted cards without hairline borders, chip and segmented tabs, bottom
sheets with a grabber, dark pill toasts. Three surface steps carry most of it: `background`,
`surface` for cards and tiles, and `muted` for controls, so a control keeps its fill inside a
card.

`@eoria/core` ships one token scale and six colour presets: zinc (default), blue, green, rose,
violet and orange. Each preset is a light and a dark palette for the same semantic keys.

```ts
import { colorPresets, createThemes } from '@eoria/core'

configureUnistyles({ themes: createThemes(colorPresets.violet) })
```

To switch presets at runtime, update the registered themes in place so adaptive light/dark
keeps working:

```ts
UnistylesRuntime.updateTheme('light', (t) => ({ ...t, colors: colorPresets.rose.light }))
UnistylesRuntime.updateTheme('dark', (t) => ({ ...t, colors: colorPresets.rose.dark }))
```

Animations are timings of 120 to 150 ms. No springs. Reanimated defaults every animation to
`ReduceMotion.System`, so the OS reduce-motion setting makes transitions jump to their end
state and stops the Skeleton pulse.

## Testing your components

`@eoria/core/jest` mocks Unistyles with variant resolution, unlike the official mock which
strips variants. Add it to `setupFiles` in your Jest config.

## Using eoria with agents

Give your agent the docs site's `/llms.txt` URL to find setup guides and component references.
Every documentation page also has a Markdown version, such as `/components/select.md` and
`/start/recipes.md`. The docs build generates these from the same MDX used for the website,
including installation commands and component dependency information.

The [Eoria consumer skill](skills/eoria/SKILL.md) teaches agents to inspect the app's copied
components and `eoria.json`, follow the setup and recipe conventions, and preserve local edits
when updating. Copy the `skills/eoria` directory into your agent's supported skills directory.
The docs build also serves the file at `/skills/eoria/SKILL.md` for download. These instructions
are for consuming apps; repository contributors should follow [CONTRIBUTING.md](CONTRIBUTING.md).

The references describe the registry in that docs build. An app's edited or older copies may
have a different API, so the skill treats installed source as authoritative.

## This repository

| Path            | Purpose                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------- |
| `registry/ui`   | Component sources. The source of truth for what users copy.                                  |
| `packages/core` | `@eoria/core`: recipe engine, theme tokens, Jest mock.                                       |
| `packages/cli`  | `@eoria/cli`: the `eoria` binary.                                                            |
| `apps/docs`     | Astro docs site styled from the core tokens. Also serves the registry JSON under `/r/`.      |
| `apps/example`  | Expo app with a screen per component group, showcase screens, and the routes the docs shoot. |
| `registry/dist` | Static registry JSON. Built, not committed.                                                  |

```sh
pnpm install
pnpm build:registry   # registry/dist
pnpm typecheck        # all workspaces
pnpm test             # core and cli
pnpm sync:example     # copy registry/ui into the example app
pnpm dev:docs         # docs at http://localhost:4321
pnpm --filter docs previews   # screenshot every component on the booted iOS simulator
```

Run the example with `pnpm --filter example ios` after `npx expo prebuild`.

The docs site deploys to Cloudflare Pages from the release workflow, so it never documents a
package version that is not on npm. Green pushes to `main` deploy a preview instead.

[CONTRIBUTING.md](CONTRIBUTING.md) has the PR flow and review rules. [RELEASING.md](RELEASING.md)
covers release-please, npm provenance and the docs deploy.

## License

MIT

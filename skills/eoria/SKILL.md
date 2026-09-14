---
name: eoria
description: Add, use, customize, and update Eoria components in consuming React Native or Expo apps. Use for Eoria setup, local component APIs, Unistyles recipes, themes, and registry updates.
---

# Eoria

Eoria copies React Native component source into the app. The app owns those files; `@eoria/core` supplies the recipe engine and themes.

## Inspect the consuming app first

Read `eoria.json` for `components`, `alias`, `registry`, and `installed`. Resolve the alias against the app's TypeScript and bundler configuration. Read the actual component files, their imports, exported props, recipes, and factories before writing usage code. Local source is authoritative when upstream examples differ.

If `eoria.json` is absent, look for existing copied components and `components.json` before initializing. Files installed manually or through shadcn may exist without Eoria hash tracking. Do not assume `src/components/ui`, `@/components/ui`, or an `@eoria/core` component export.

## Read documentation as needed

Use [the documentation index](https://eoria.adamtrip.pt/llms.txt) to find relevant pages. Fetch only what the task needs:

- [Installation](https://eoria.adamtrip.pt/start/installation.md) for native setup.
- [CLI](https://eoria.adamtrip.pt/start/cli.md) for command behavior and registry configuration.
- [Recipes](https://eoria.adamtrip.pt/start/recipes.md) for slot overrides and extensions.
- [Theming](https://eoria.adamtrip.pt/start/theming.md) for tokens and theme configuration.
- `https://eoria.adamtrip.pt/components/{name}.md` for component examples and documented props.

Upstream registry source is at `{registry}/{name}.json`; the default registry is `https://eoria.adamtrip.pt/r`. The configured registry may instead be a local directory. If Markdown pages are unavailable, use the corresponding HTML documentation page, such as `/start/installation/`, or inspect registry source. Neither replaces inspection of installed files.

## Set up and add components

Run commands from the consuming app root. Use its package manager and existing CLI version when available. These examples use the published CLI:

```sh
npx @eoria/cli init
npx @eoria/cli add button portal toast
```

`init` writes `eoria.json`, creates missing Unistyles and Babel files, attempts to add the theme import and path alias, and installs the runtime and peers. It can seed the UI alias from `components.json`. Existing setup files need inspection; a successful command does not prove they contain every required setting. `--dir` and `--alias` select component paths. `--no-install` prints the dependency command while still writing setup files. `init --yes` permits rerunning initialization.

Verify Unistyles 3, the React Native New Architecture, and the native peer dependencies from the installation guide. Expo Go cannot run this setup; use the app's native development build workflow. Check that the theme configuration runs before component imports. Check both `react-native-unistyles/plugin` with the correct source root and `react-native-worklets/plugin` in the app's Babel configuration, preserving its existing preset and plugins.

`add` copies registry dependencies transitively, rewrites component aliases, and installs declared npm dependencies unless passed `--no-install`. Inspect its skipped-file and installation warnings. For overlays, mount one `PortalHost` after navigation content near the root. For toasts, add `toast` and mount one `Toaster` after the host. Import both from the configured local component paths.

## Customize and update

Use the component's existing variants and per-slot `styles` overrides when they cover the requested change. Read its recipe to identify valid slots and variant values. Use the app's theme tokens for changes that should follow its theme.

For a reusable derivative, inspect the base exports, then use:

```sh
npx @eoria/cli extend button checkout-button
```

This generates a file beside the installed base using `extendSlotRecipe`. It exports a component through the base's `create*` factory only when one exists; otherwise finish the rendering code yourself. Extensions inherit local base edits. Slots and variants merge, compound variants append, and defaults override; inherited entries cannot be removed through extension.

Before an upstream update, compare the installed source:

```sh
npx @eoria/cli diff button
```

Omit the name to compare all tracked components; use `--full` for whole-file output. `diff` reports differences without applying them. Preserve local edits and inspect dependent components before merging upstream changes. `add` keeps existing files by default; `add --overwrite` replaces them, including dependency files, and is not a merge operation.

The `installed` entries are content hashes recorded when files were copied. They help distinguish local edits from registry changes, but do not pin a release or retain the original source for a three-way merge. Preserve that history when changing paths, and do not infer an installed API version from a hash.

After changes, run the consuming app's relevant type checks and exercise the affected behavior. Native setup changes need a native build check; overlay and toast changes need a mounted-host check. Report any checks the environment could not run.

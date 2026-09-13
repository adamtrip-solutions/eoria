# Contributing

Use Node.js 22 or newer and the pnpm version pinned in `package.json`.

```sh
pnpm install
pnpm build:registry
pnpm --filter @eoria/core --filter @eoria/cli build
pnpm typecheck
pnpm test
pnpm format:check
```

The example app needs a development build. Expo Go cannot run Unistyles or Reanimated.

```sh
cd apps/example
npx expo prebuild
npx expo run:ios
```

## Where things live

| Path            | What                                                      |
| --------------- | --------------------------------------------------------- |
| `registry/ui`   | Component sources. Edit these, never the copies.          |
| `apps/example`  | Mirrors of the registry plus demo and showcase screens.   |
| `packages/core` | `@eoria/core`, the recipe engine and tokens.              |
| `packages/cli`  | `@eoria/cli`, the `eoria` binary.                         |
| `apps/docs`     | The docs site. Also serves the registry JSON under `/r/`. |

After editing a registry file run `pnpm sync:example` so the example app picks it up, and
`pnpm build:registry` so the CLI tests and the docs see the new JSON.

## Changing a component

Every component is a slot recipe. Keep the `root` slot, keep variants keyed variant name first,
and keep animations to short timings. No springs. Reduce motion has to keep working, which
Reanimated gives you for free as long as you do not override `ReduceMotion`.

Each component page in `apps/docs/src/content/docs/components` must match the code. If you add
a prop, a variant or change a default, update the page in the same PR. Screenshots on those
pages come from `apps/example/src/previews.tsx`; add or adjust the demo and run
`pnpm --filter docs previews` on a booted iOS simulator when the look changes.

## Changing the CLI

`packages/cli` has no runtime dependency on the rest of the repo. Its tests run against
`registry/dist`, so build the registry first. `eoria.json` semantics (hashes, skipped files)
are documented on the CLI page of the docs; keep the page and the code in step.

## Contribution and review process

Fork the repository, make changes on a branch in your fork, and open a pull request against
`main`. Outside-contributor workflows need maintainer approval before they run. Approving a
workflow run only lets the tests execute; it does not approve or merge the change. Fork PR
workflows run with read-only permissions and no secrets.

Merging needs a passing `CI passed` check, a passing `Conventional PR title` check, an
approving review from the code owner, and resolved conversations. New commits dismiss earlier
approvals. `.github/CODEOWNERS` names `@adamtrip` for every file, including itself and the
release workflows.

Auto-merge is off. Only `@adamtrip` can push to `main`. Release-please opens release PRs but
does not merge them; merging one starts the npm publication described in
[RELEASING.md](RELEASING.md).

Repository administrators keep GitHub's branch-protection override, which is what lets the
sole maintainer merge their own PRs. Tools authenticated as that administrator inherit it.
Routine work still goes through PRs.

## Pull requests

Use a Conventional Commit title, for example `feat(select): add size variants` or
`fix(cli): keep local edits on add`. Scopes are component names, `cli`, `core`, `docs`,
`example` or `registry`. Squash merging uses the PR title as the commit message, and
release-please reads that message to decide the next version.

State the behaviour change, whether it affects copied files in user projects, and what you ran.
Run `pnpm format` before the last push. Add a test when fixing a bug in `packages/core` or
`packages/cli`.

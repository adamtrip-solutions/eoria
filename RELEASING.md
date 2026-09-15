# Releasing

Two packages ship from this repository: `@eoria/core` from `packages/core` and `@eoria/cli` from
`packages/cli`. Components are not versioned; users copy them and `eoria diff` tells them when
the registry moved.

Release-please reads Conventional Commit titles on `main`, keeps one release PR per package,
and tags releases as `core-vX.Y.Z` and `cli-vX.Y.Z`. Merging a release PR creates the GitHub
release and dispatches `publish.yml` at that tag.

## Version policy

| Commit                              | Bump from 0.1.0  |
| ----------------------------------- | ---------------- |
| `fix(cli): keep local edits on add` | 0.1.1            |
| `feat(core): add createThemes`      | 0.2.0            |
| `feat(core)!: rename colour keys`   | 1.0.0            |
| `docs: rewrite theming page`        | No release alone |
| `feat(button): add icon-only size`  | No release alone |

Component scopes do not release anything, because components live in the registry, not on
npm. Only commits touching `packages/core` or `packages/cli` move a version. The pre-major
downgrade options are off, so a breaking change requests a major before 1.0 too.

## What the publish workflow checks

`publish.yml` refuses to run from a branch, a prerelease, a draft, a moved tag, or a commit
that is not on `main`. It checks that the package's `name`, `version` and `repository.url`
match the tag and this repository, then runs the full CI workflow at the release commit.

CI packs both packages after tests pass and uploads the tarballs. The publish job, in the
`npm` environment, downloads that artifact and publishes the one matching the tag with
`npm publish --provenance`. It does not rebuild.

The CLI is scoped because npm rejects the bare name `eoria` as too close to `ora`. The
binary is still `eoria`, so `npx @eoria/cli add button` and `pnpm eoria add button` both work. If npm already has that version, it skips.

## GitHub configuration

`scripts/setup-github.sh` applies these with the `gh` CLI and is safe to rerun:

- Squash merging only, PR title as the commit title, delete branches on merge.
- Branch protection on `main`: `CI passed` and `Conventional PR title` required and up to
  date, one approving code-owner review, stale reviews dismissed, conversations resolved,
  no force pushes or deletion, pushes restricted to `adamtrip`.
- A `Preserve release tags` ruleset that blocks updating or deleting `core-v*` and `cli-v*`.
- An `npm` environment restricted to those tags.
- A `cloudflare` environment allowed from `main` and those tags. It holds the two Cloudflare
  secrets and gets a deployment record per docs deploy.
- Actions: workflow approval for all outside contributors, default token read-only, Actions
  may create pull requests.

## npm trusted publishing

For each package, in npm settings add a GitHub Actions trusted publisher:

| Field             | Value                |
| ----------------- | -------------------- |
| Organization/user | `adamtrip-solutions` |
| Repository        | `eoria`              |
| Workflow filename | `publish.yml`        |
| Environment       | `npm`                |

The first publication of a new package cannot use trusted publishing, because the package
does not exist yet. Publish the first version by hand from a clean checkout with
`pnpm --filter <name> publish --access public`, then configure the trusted publisher, and let
the workflow handle every version after that. The `@eoria` scope must exist on npm first.

## Retry a failed publication

Fix the cause, then rerun at the same tag:

```sh
gh workflow run publish.yml --repo adamtrip-solutions/eoria --ref cli-v0.1.0
```

Never move a tag. If the workflow itself needs a fix, land it and release a new version.

## Optional token

Release PRs opened with `GITHUB_TOKEN` do not trigger CI on their own. A fine-grained
`RELEASE_PLEASE_TOKEN` secret with contents, issues and pull-requests write access avoids
having to close and reopen the release PR. Everything else works without it.

## Docs site

The docs site serves the registry JSON, so it deploys to production on every green push to
`main`: new components, docs fixes and example changes go live within minutes. The exception
is while `packages/core` or `packages/cli` differs from its last release tag. CI then holds the
deploy, and `publish.yml` deploys the site once the package is on npm, which keeps the published
pages and copied components in step with what `npm install` gives people. Merge the pending
release PR to unblock the site. The site lives at `eoria.adamtrip.pt`.

Set it up once:

1. Create the Pages project with `npx wrangler pages project create eoria --production-branch main`,
   then add `eoria.adamtrip.pt` as its custom domain in the Cloudflare dashboard.
2. Create an API token from the "Edit Cloudflare Workers" template, or a custom one with
   `Account > Cloudflare Pages > Edit`.
3. Store it as `CLOUDFLARE_API_TOKEN` and the account id as `CLOUDFLARE_ACCOUNT_ID` in the
   `cloudflare` environment of the GitHub repository. The environment, not repository secrets,
   so fork workflows never see them.

Redeploy by hand from `main` or from a release tag:

```sh
gh workflow run deploy-docs.yml --repo adamtrip-solutions/eoria --ref main
```

The workflow refuses any other ref. The CI deploy and the release deploy do not order
themselves by commit: a docs change merged minutes after a release PR can go live first and
then be overwritten by the slower release deploy of the older commit. If that happens, run the
command above once. Do not connect the repository through Cloudflare's Git integration as well,
or both will deploy.

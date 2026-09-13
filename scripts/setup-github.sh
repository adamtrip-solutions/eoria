#!/usr/bin/env bash
# Applies the repository settings described in RELEASING.md. Safe to rerun.
# Needs: gh authenticated as a repository admin, the repo already created and pushed.
set -euo pipefail

REPO="${REPO:-adamtrip-solutions/eoria}"
MAINTAINER="${MAINTAINER:-adamtrip}"

echo "› Repository settings"
gh api -X PATCH "repos/$REPO" \
  -f description='Native-first React Native components you copy into your app. Unistyles 3, Reanimated 4, slot recipes.' \
  -f homepage='https://eoria.adamtrip.pt' \
  -F has_issues=true -F has_wiki=false -F has_projects=false \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -f squash_merge_commit_title=PR_TITLE -f squash_merge_commit_message=PR_BODY \
  -F delete_branch_on_merge=true -F allow_auto_merge=false -F allow_update_branch=true \
  >/dev/null

echo "› Topics"
gh api -X PUT "repos/$REPO/topics" \
  -f 'names[]=react-native' -f 'names[]=expo' -f 'names[]=ui-components' \
  -f 'names[]=unistyles' -f 'names[]=reanimated' -f 'names[]=shadcn' >/dev/null

echo "› Actions permissions"
gh api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=all >/dev/null
gh api -X PUT "repos/$REPO/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true >/dev/null
# Require approval for workflows from every outside contributor, not just first-timers.
gh api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" \
  -f approval_policy=all_external_contributors >/dev/null || echo "  (fork approval policy endpoint unavailable; set it under Settings > Actions > General)"

echo "› Branch protection on main"
gh api -X PUT "repos/$REPO/branches/main/protection" --input - >/dev/null <<JSON
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "CI passed", "app_id": 15368 },
      { "context": "Conventional PR title", "app_id": 15368 }
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false,
    "dismissal_restrictions": { "users": ["$MAINTAINER"], "teams": [], "apps": [] }
  },
  "restrictions": { "users": ["$MAINTAINER"], "teams": [], "apps": [] },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON

echo "› Release tag ruleset"
existing=$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name == "Preserve release tags") | .id' || true)
ruleset='{
  "name": "Preserve release tags",
  "target": "tag",
  "enforcement": "active",
  "bypass_actors": [],
  "conditions": { "ref_name": { "include": ["refs/tags/core-v*", "refs/tags/cli-v*"], "exclude": [] } },
  "rules": [ { "type": "deletion" }, { "type": "update" } ]
}'
if [ -n "$existing" ]; then
  echo "$ruleset" | gh api -X PUT "repos/$REPO/rulesets/$existing" --input - >/dev/null
else
  echo "$ruleset" | gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null
fi

echo "› npm environment"
gh api -X PUT "repos/$REPO/environments/npm" --input - >/dev/null <<'JSON'
{ "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
JSON
for pattern in 'core-v*' 'cli-v*'; do
  gh api -X POST "repos/$REPO/environments/npm/deployment-branch-policies" \
    -f name="$pattern" -f type=tag >/dev/null 2>&1 || true
done

echo "› cloudflare environment"
gh api -X PUT "repos/$REPO/environments/cloudflare" --input - >/dev/null <<'JSON'
{ "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
JSON
gh api -X POST "repos/$REPO/environments/cloudflare/deployment-branch-policies" \
  -f name=main -f type=branch >/dev/null 2>&1 || true
for pattern in 'core-v*' 'cli-v*'; do
  gh api -X POST "repos/$REPO/environments/cloudflare/deployment-branch-policies" \
    -f name="$pattern" -f type=tag >/dev/null 2>&1 || true
done

echo "› Labels"
gh label create bug --color d73a4a --description "Something isn't working" -R "$REPO" --force >/dev/null
gh label create enhancement --color a2eeef --description "New feature or request" -R "$REPO" --force >/dev/null
gh label create documentation --color 0075ca --description "Docs site or component pages" -R "$REPO" --force >/dev/null
gh label create cli --color 5319e7 --description "packages/cli" -R "$REPO" --force >/dev/null
gh label create core --color 1d76db --description "packages/core" -R "$REPO" --force >/dev/null
gh label create registry --color 0e8a16 --description "Component sources" -R "$REPO" --force >/dev/null
gh label create "good first issue" --color 7057ff --description "Good for newcomers" -R "$REPO" --force >/dev/null

echo "› Security features"
gh api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON'
{ "security_and_analysis": { "secret_scanning": { "status": "enabled" }, "secret_scanning_push_protection": { "status": "enabled" } } }
JSON
gh api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null || true

echo "✓ Done. Remaining by hand: npm trusted publishers, Cloudflare Pages project and the cloudflare environment secrets (RELEASING.md)."

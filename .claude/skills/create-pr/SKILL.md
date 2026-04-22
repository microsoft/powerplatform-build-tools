---
name: create-pr
description: Stage, commit, push, and create GitHub PRs for the current branch — always main, then automatically cherry-picks to release/stable.
user-invocable: true
---

# Create PR

Assumes you are on the right branch with changes ready to commit (or already committed) and `npm run ci` has passed.

For **CLI version bumps** use `/pac-cli-update` — it handles dual PRs (main + release/stable) automatically.
For **reviewing** an existing PR use `/review <number>`.

---

## Step 1 — Stage and commit (skip if already committed)

Stage files explicitly — never `git add .`:

```bash
git add <specific files>
git status  # confirm nothing accidental staged
git commit -m "<type>: <description>"
```

Commit types: `fix:` `feat:` `chore:` `build:` `docs:`

---

## Step 2 — Push and create the main PR

```bash
git push -u origin HEAD 2>&1
```

Capture the current branch name and the SHA(s) to cherry-pick:

```bash
MAIN_BRANCH=$(git branch --show-current)
COMMITS=$(git log origin/main..HEAD --reverse --format="%H")
```

Pick the template matching what changed:

### Dependency update (`package.json` / `package-lock.json` only)

```bash
gh pr create \
  --base main \
  --title "chore: update dependencies" \
  --body "$(cat <<'EOF'
## Summary
- <what was updated and why>

## Dependencies updated

| Package | Before | After | Reason |
| ------- | ------ | ----- | ------ |
| ...     | ...    | ...   | ...    |

## Known limitations / follow-ups
- <accepted risks or deferred items>

## Test plan
- [ ] `npm install` clean
- [ ] `npm audit` — no new vulnerabilities introduced
- [ ] `npm run ci` passes (functional tests exempt)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### Feature / bug fix (`src/` or `gulp/` changes)

```bash
gh pr create \
  --base main \
  --title "<fix|feat>: <concise description under 70 chars>" \
  --body "$(cat <<'EOF'
## Summary
- <what changed and why>

## Tasks affected
<!-- List any Azure DevOps tasks whose behaviour changed -->

## Architecture impact
<!-- If any layer boundary changed: task.json input names, bundleDependencies,
     service connection schema, BuildToolsHost/RunnerParams interface -->

## Known limitations / follow-ups
- <anything accepted as risk or deferred>

## Test plan
- [ ] `npm run ci` passes (functional tests exempt)
- [ ] Manual pipeline run on DEV stage (if task behaviour changed)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Capture the main PR number/URL from the output — you'll reference it in the release PR.

---

## Step 3 — Cherry-pick to release/stable

Create a release branch off `release/stable`, cherry-pick all commits from the main branch, push, and open the paired PR.

```bash
RELEASE_BRANCH="${MAIN_BRANCH}-release"

git fetch origin release/stable 2>&1
git checkout -b "$RELEASE_BRANCH" origin/release/stable 2>&1

# Cherry-pick each commit from the main branch (in order)
for SHA in $COMMITS; do
  git cherry-pick "$SHA" 2>&1
done

git push -u origin "$RELEASE_BRANCH" 2>&1
```

Then open the release PR targeting `release/stable`:

```bash
gh pr create \
  --base release/stable \
  --title "<same title as main PR>" \
  --body "$(cat <<'EOF'
## Summary

Cherry-pick of #<main-pr-number> to `release/stable`.

- <one-line description of what changed>

## Paired main PR
#<main-pr-number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Step 4 — Wait for both PRs to merge, then queue the official build

After printing both PR URLs, poll until both are merged:

```bash
MAIN_PR=<main-pr-number>
RELEASE_PR=<release-pr-number>

echo "Waiting for both PRs to merge..."
while true; do
  MAIN_STATE=$(gh pr view $MAIN_PR --json state --jq .state)
  RELEASE_STATE=$(gh pr view $RELEASE_PR --json state --jq .state)

  echo "Main PR #$MAIN_PR: $MAIN_STATE | Release PR #$RELEASE_PR: $RELEASE_STATE"

  if [ "$MAIN_STATE" = "MERGED" ] && [ "$RELEASE_STATE" = "MERGED" ]; then
    echo "Both PRs merged. Queuing official build..."
    break
  fi

  sleep 60
done
```

Once both are merged, queue the official build pipeline:

```bash
az pipelines build queue \
  --definition-id 21491 \
  --org https://dev.azure.com/dynamicscrm \
  --project OneCRM \
  --output json 2>&1
```

**Note:** The pipeline requires secret variables (`GITHUB_TOKEN`, `AZ_DevOps_Read_PAT`, `isEsrpEnabled`) that must be set in the ADO web UI. If the queue command fails with a validation error, prompt the user:

```
The official build pipeline requires secret variables that can't be set via CLI.
Please queue it manually:
  https://dev.azure.com/dynamicscrm/OneCRM/_build?definitionId=21491

Set these variables when queuing:
  - GITHUB_TOKEN       (GitHub PAT with repo scope + SSO enabled for 'microsoft' org)
  - AZ_DevOps_Read_PAT (PAT to read from AzDO DPX-Tools-Upstream feed)
  - isEsrpEnabled      true
```

---

## Return all outputs

Print everything so the user has a complete summary:

```
Main PR:    https://github.com/microsoft/powerplatform-build-tools/pull/<n>
Release PR: https://github.com/microsoft/powerplatform-build-tools/pull/<m>
Build:      https://dev.azure.com/dynamicscrm/OneCRM/_build/results?buildId=<id>
            (or: queue manually at https://dev.azure.com/dynamicscrm/OneCRM/_build?definitionId=21491)
```

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

## Return both PR URLs

Print both URLs so the user can see them at a glance:

```
Main PR:    https://github.com/microsoft/powerplatform-build-tools/pull/<n>
Release PR: https://github.com/microsoft/powerplatform-build-tools/pull/<m>
```

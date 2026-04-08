---
name: create-pr
description: Stage, commit, push, and create a GitHub PR for the current branch. Assumes branch exists and build has passed.
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

## Step 2 — Push and create PR

```bash
git push -u origin HEAD 2>&1
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

### Feature / bug fix (`src/` changes)

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

Return the PR URL.

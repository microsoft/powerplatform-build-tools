---
name: create-pr
description: Create and push a PR for the current branch. Handles dependency updates and feature/bug fix templates.
user-invocable: true
---

# PR — Create and Push

Creates a PR for the current branch. For reviewing an existing PR, use `/review <number>`.

**For CLI version bumps**, use `/pac-cli-update <version>` — it handles the dual PR workflow (main + release/stable) automatically.

---

## Step 1 — Branch from latest main

```bash
git fetch origin 2>&1
git checkout main 2>&1
git merge origin/main --no-edit 2>&1
git checkout -b users/<alias>/<short-description> 2>&1
```

Use the alias `jbujula`. Branch name should be lowercase, hyphen-separated, and describe the change (e.g. `users/jbujula/fix-export-timeout`, `users/jbujula/update-dependencies-s360`).

---

## Step 2 — Build and verify

```bash
npm run ci 2>&1
```

`npm run ci` = clean → compile (32 tasks) → lint → restore → unitTest → pack (4 VSIX stages).
Functional tests fail locally (require `PA_BT_ORG_PASSWORD`) — expected, not a blocker.
If anything **other than** `functionalTest` fails, fix it before continuing.

---

## Step 3 — Stage and commit

Stage files explicitly (never `git add .`):

```bash
git add <specific files>
git status  # confirm nothing accidental is staged
git commit -m "<type>: <description>"
```

Commit types: `fix:` `feat:` `chore:` `build:` `docs:`

---

## Step 4 — Push and create PR

```bash
git push -u origin HEAD 2>&1
```

Choose the right PR template based on what changed:

### Dependency update (package.json / package-lock.json only)

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

### Feature / bug fix (src/ changes)

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

# PAC CLI Update — PAC CLI and cli-wrapper version bump

Handles the most common update in this repo: bumping the PAC CLI binary version and/or
the `@microsoft/powerplatform-cli-wrapper` npm package.

Invoke as:

- `/pac-cli-update <pac-version>` — e.g. `/pac-cli-update 1.53.2`
- `/pac-cli-update <pac-version> <wrapper-version>` — when cli-wrapper also has a new version

**Always produces two PRs:** one targeting `main`, one targeting `release/stable`.
This is the standard release pattern for this repo — never merge a CLI update to only one branch.

---

## Step 0 — Sync knowledge if stale

```bash
grep "## Last sync" memory/ado-knowledge.md 2>/dev/null | tail -1
```

If last sync was > 7 days ago or missing: run `/knowledge-sync` inline, then continue.

---

## Step 1 — Verify the new PAC CLI version exists on nuget.org

```bash
# Confirm the version is published before touching any files
curl -s "https://api.nuget.org/v3-flatcontainer/microsoft.powerapps.cli/index.json" \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.versions.slice(-5).join('\n'))" 2>&1

# Confirm the linux package also exists (both must be present)
curl -s "https://api.nuget.org/v3-flatcontainer/microsoft.powerapps.cli.core.linux-x64/index.json" \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.versions.includes('<pac-version>') ? 'linux: found' : 'linux: NOT FOUND')" 2>&1
```

If the version does not exist on nuget.org, stop and report — do not create a PR for a non-existent version.

---

## Step 2 — Sync with origin/main and create the main branch

```bash
git fetch origin 2>&1
git checkout main 2>&1
git merge origin/main --no-edit 2>&1
git checkout -b users/<alias>/cli-version-<pac-version> 2>&1
```

---

## Step 3 — Update nuget.json

Edit both packages to the new version:

```json
{
  "packages": [
    { "name": "Microsoft.PowerApps.CLI",              "version": "<pac-version>", ... },
    { "name": "Microsoft.PowerApps.CLI.Core.linux-x64", "version": "<pac-version>", ... }
  ]
}
```

Both packages must always use the same version. Never update only one.

---

## Step 4 — Update extension/overview.md

Add a new entry under `{{NextReleaseVersion}}:` (do not remove the placeholder — it stays):

```markdown
{{NextReleaseVersion}}:
- pac CLI <major.minor>, [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI/<pac-version>#releasenotes-body-tab)
```

If additional changes are in this update (new task, Node target bump, etc.), add bullet points below the pac CLI line.

---

## Step 5 — Update cli-wrapper npm package (if applicable)

Only do this if a `<wrapper-version>` argument was given OR if the cli-wrapper changelog
explicitly requires the new pac CLI version:

```bash
npm view @microsoft/powerplatform-cli-wrapper versions --json 2>&1 | tail -1
```

If updating, bump `"@microsoft/powerplatform-cli-wrapper"` in `package.json` dependencies
and run `npm install`.

---

## Step 6 — Verify

```bash
npm install 2>&1 | tail -5
npm run ci 2>&1
```

`npm run ci` runs: clean → compile → lint → restore (downloads the new pac CLI version) → unitTest → pack.
Functional tests will fail locally (require live credentials) — expected, not a blocker.

If restore fails (pac CLI version not found), the version does not exist — stop and report.

---

## Step 7 — Commit and push (main branch PR)

```bash
git add nuget.json extension/overview.md package.json package-lock.json
git status  # confirm only these files staged
git commit -m "chore: update pac CLI to <pac-version>"
git push -u origin HEAD 2>&1
```

Create the main-branch PR:

```bash
gh pr create \
  --base main \
  --title "Update pac CLI to <pac-version>" \
  --body "$(cat <<'EOF'
## Summary
- Bump PAC CLI from <old-version> to <pac-version>
- [Release Notes on nuget.org](https://www.nuget.org/packages/Microsoft.PowerApps.CLI/<pac-version>#releasenotes-body-tab)

## Changes
- `nuget.json`: both `Microsoft.PowerApps.CLI` and `Microsoft.PowerApps.CLI.Core.linux-x64` updated to `<pac-version>`
- `extension/overview.md`: release notes entry added

## Test plan
- [ ] `npm run ci` passes locally (restore downloads new pac CLI version successfully)
- [ ] Functional tests exempt (require live env credentials)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Step 8 — Create the release/stable branch PR

This is the production release. Create a second branch off `release/stable`:

```bash
git fetch origin 2>&1
git checkout release/stable 2>&1
git merge origin/release/stable --no-edit 2>&1
git checkout -b users/<alias>/cli-version-<pac-version>-release 2>&1
```

Cherry-pick the commit from Step 7:

```bash
git cherry-pick <commit-sha-from-step-7> 2>&1
git push -u origin HEAD 2>&1
```

Create the release PR:

```bash
gh pr create \
  --base release/stable \
  --title "[release] Update pac CLI to <pac-version>" \
  --body "$(cat <<'EOF'
## Summary
- Bump PAC CLI from <old-version> to <pac-version> on the release/stable branch
- Mirrors: <main-branch-pr-url>

## Changes
- `nuget.json`: both packages updated to `<pac-version>`
- `extension/overview.md`: release notes entry added

## Test plan
- [ ] Main-branch PR verified first
- [ ] Functional tests exempt

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Step 9 — Final summary

Print:

1. **PAC CLI:** old version → new version
2. **cli-wrapper:** old → new (or "not updated")
3. **Main PR:** URL
4. **Release PR:** URL
5. **Restore verified:** yes / no (did `gulp restore` download the new pac CLI successfully?)

---

## Hard rules

- Never update only one of the two `nuget.json` packages — both must match
- Never skip the release/stable PR — every CLI update needs both
- Never cherry-pick to release/stable without verifying the main PR CI passes first
- The `{{NextReleaseVersion}}` placeholder in `overview.md` must stay — add below it, never replace it
- If the Linux pac CLI package (`Microsoft.PowerApps.CLI.Core.linux-x64`) doesn't have the new version yet, wait — don't ship with mismatched versions

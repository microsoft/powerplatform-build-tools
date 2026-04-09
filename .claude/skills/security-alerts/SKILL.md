---
name: security-alerts
description: Fetch all open security alerts from S360/ADO, Dependabot, and npm audit, apply all fixes, verify, commit, and create a PR.
user-invocable: true
---

# Security Alerts

Fetch all open security alerts from S360/ADO, GitHub Dependabot, and npm audit. Merge into one fix plan, apply all fixes, verify build, commit, and create a PR. No user input required.

**S360 service name for this repo:** `Power Apps App Deployment`
**For local-only npm audit fixes without ADO/GitHub queries, use `/fix-dependencies` instead.**

---

## Step 1 — Gather alerts from all three sources (run in parallel)

### 1a — S360 / Component Governance ADO items

Run two queries in parallel — S360 alerts live in both area paths:

```bash
# Query 1 — PPBT Extensions area path
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.Tags],
         [Microsoft.VSTS.Common.Priority], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.State] NOT IN ('Closed', 'Resolved', 'Done')
    AND (
      [System.Tags] CONTAINS 'S360'
      OR [System.Tags] CONTAINS 'Component Governance'
      OR [System.Tags] CONTAINS 'SDL'
      OR [System.Title] CONTAINS 'CVE'
      OR [System.Title] CONTAINS 'GHSA'
    )
  ORDER BY [Microsoft.VSTS.Common.Priority] ASC
" --output json 2>&1

# Query 2 — Deployment Hub\Admin area path (where most S360 alerts are generated)
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.Tags],
         [Microsoft.VSTS.Common.Priority], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\Deployment Hub\Admin'
    AND [System.State] NOT IN ('Closed', 'Resolved', 'Done')
    AND (
      [System.Tags] CONTAINS 'S360'
      OR [System.Tags] CONTAINS 'Component Governance'
      OR [System.Tags] CONTAINS 'SDL'
      OR [System.Title] CONTAINS 'CVE'
      OR [System.Title] CONTAINS 'GHSA'
    )
  ORDER BY [Microsoft.VSTS.Common.Priority] ASC
" --output json 2>&1
```

Merge results from both queries, deduplicate by ID. Fetch full detail for each result to get required package version:

```bash
az boards work-item show --id <id> 2>&1
```

If ADO auth unavailable: note "S360 skipped — ADO auth unavailable" and continue.

S360 compliance versions take precedence over npm audit minimums — use the highest required version across all sources.

### 1b — GitHub Dependabot alerts

```bash
gh api repos/microsoft/powerplatform-build-tools/dependabot/alerts \
  --paginate \
  --jq '.[] | select(.state == "open") | {
    number: .number,
    severity: .security_advisory.severity,
    package: .dependency.package.name,
    vulnerable_range: .security_vulnerability.vulnerable_version_range,
    patched_version: .security_vulnerability.first_patched_version.identifier,
    manifest: .dependency.manifest_path,
    scope: .dependency.scope,
    ghsa: .security_advisory.ghsa_id
  }' 2>&1
```

If auth fails: run `gh auth login --hostname github.com --git-protocol https --web` (browser flow, no prompts) and retry once. If still fails, note "Dependabot skipped — GitHub auth unavailable" and continue.

### 1c — npm audit

```bash
npm audit --json 2>&1
```

---

## Step 2 — Build fix plan

Merge all three sources, deduplicate by package. Use the highest required version across sources.

Print the plan then immediately proceed to Step 3 — do not wait:

| Package | Current | Fix To | Strategy | Source | ADO Item |
| ------- | ------- | ------ | -------- | ------ | -------- |
| ...     | ...     | ...    | A/B/C/D  | S360/Dependabot/npm | #id or — |

Decision rules per vulnerability:

| Condition | Action |
| --------- | ------ |
| `patched_version` exists | Fix it — any semver jump acceptable |
| `inBundle: true`, parent upgradeable | Upgrade parent (Strategy B) |
| `inBundle: true`, no parent upgrade | Patch lock file (Strategy C) |
| `patched_version: null` | Accept risk, document |
| `scope: development` + low + no patch | Accept risk |

Known permanent accepted risk — skip: `elliptic` (GHSA-848j-6mx2-7j84) — dev-only, no patched version.

---

## Step 3 — Apply fixes

### Strategy A — npm override

```bash
npm view <pkg>@<version> version
# edit package.json overrides
npm install 2>&1
npm ls <pkg> 2>&1
```

Hard rules:

- Never add `"minimatch": "^3.x"` flat override — infinite npm loop
- `ajv` stays at `^6.x` — v8 breaks ESLint
- Do not change: `nanoid`, `electron-to-chromium`, `@types/node` overrides

### Strategy B — Direct dependency bump

Update `package.json` version, then `npm install`.

### Strategy C — Lock file patch (`inBundle: true`)

```bash
node -e "
const l = require('./package-lock.json');
console.log(
  Object.keys(l.packages)
    .filter(k => k.endsWith('/<pkg>'))
    .map(k => k + ' -> ' + l.packages[k].version + ' inBundle:' + l.packages[k].inBundle)
    .join('\n')
);"

npm view <pkg>@<patched-version> dist.tarball dist.integrity --json

node -e "
const fs = require('fs');
const l = require('./package-lock.json');
Object.keys(l.packages)
  .filter(k => k.endsWith('/<pkg>'))
  .forEach(k => {
    l.packages[k].version = '<patched-version>';
    l.packages[k].resolved = '<tarball-url>';
    l.packages[k].integrity = '<integrity>';
  });
fs.writeFileSync('./package-lock.json', JSON.stringify(l, null, 2) + '\n');
"
npm install 2>&1
```

---

## Step 4 — Verify

```bash
npm audit 2>&1
npm run ci 2>&1
```

Functional tests fail locally (require `PA_BT_ORG_PASSWORD`) — expected, not a blocker.
If any other step fails, fix it and re-run before continuing. Do not commit a broken build.

---

## Step 5 — Update ADO S360 items (only if Step 4 passes)

For each S360 ADO item whose package was fixed:

```bash
az boards work-item update --id <id> \
  --discussion "Fixed by upgrading <package> from <old> to <new>. npm audit clean." 2>&1

az boards work-item update --id <id> --state "Resolved" 2>&1
```

If the fix only partially satisfies S360 (e.g. patched CVE but higher version needed): add a comment, leave open, add to Follow-ups.

Skip if ADO auth unavailable.

---

## Step 6 — Commit and PR (only if Step 4 passes)

```bash
git add package.json package-lock.json
git status
git commit -m "chore: fix dependency vulnerabilities"
```

Then run `/create-pr` to create the pull request.

---

## Final Summary

- **Fixed:** package, old → new, strategy, source (S360/Dependabot/npm audit)
- **S360 items closed:** ADO ID, package, action taken
- **Accepted risk:** package, GHSA ID, reason
- **Follow-ups:** partial fixes, deferred items

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

### 1d — Map S360 CVE/GHSA ids to packages

Most `[S360]` items carry only a Component Governance `alertId` and no package name. The legacy
`_apis/governance/...` route returns 404, but the Component Governance API the portal itself uses
works with an Azure DevOps bearer token (`az account get-access-token --resource
499b84ac-1321-427f-aa17-267ca6975798`). Take the org, project, governed repository id and
`typeId` from the alert's portal URL:

```bash
# Alerts as S360 sees them: production state for one pipeline (typeId) on one branch.
# Use stateDetails.alertState - the repository-level /alerts list aggregates every pipeline and
# PR snapshot and reports far more "active" alerts than S360 does.
GET https://governance.dev.azure.com/<org>/<project-guid>/_apis/ComponentGovernance/GovernedRepositories/<repo-id>/Branches/<branch>/Alerts?snapshotTypeId=<typeId>&api-version=7.1-preview.1

# One alert, including the lock-file locations and root dependencies
GET .../GovernedRepositories/<repo-id>/Branches/<branch>/Alerts/<alertId>?pipelinesTrackingFilter=0&api-version=7.1-preview.1
```

Component Governance only clears an alert after the pipeline that detected it scans again, so a
merged fix shows up there (and in S360) after the next official build of that branch.

Resolve each advisory against the GitHub Advisory DB — this reliably yields the package, the
vulnerable range, and the real patched version:

```bash
# From a CVE id (as it appears in the S360 work item title)
gh api "/advisories?cve_id=CVE-2026-14257" \
  --jq '.[0] | "\(.ghsa_id) | \(.severity) | " + ([.vulnerabilities[]? | "\(.package.name) vuln=\(.vulnerable_version_range) patched=\(.first_patched_version)"] | join(" ;; "))'

# From a GHSA id
gh api /advisories/GHSA-5c6j-r48x-rmvq \
  --jq '"\(.severity) | " + ([.vulnerabilities[]? | "\(.package.name) patched=\(.first_patched_version)"] | join(" ;; "))'
```

Do this for every unmapped S360 item before declaring anything unresolvable.

---

## Step 1e — Run the resolver script first

`scripts/audit-overrides.js` already does steps 2 and 3 mechanically: it reads `npm audit`,
resolves every advisory against the Advisory DB, compares against each installed copy in the
lock file, and reports exactly which ranges need to move. With `--write` it also patches bundled
(`inBundle`) lock entries, which neither `npm update` nor `overrides` ever change.

```bash
node scripts/audit-overrides.js            # report only
node scripts/audit-overrides.js --write    # apply the safe override bumps and bundled lock patches
npm install
node scripts/audit-overrides.js --check    # every override must be reflected in the lock (CI runs this)
```

Use its output as the fix plan, then hand-fix only what it lists under **Needs a human**.

**Check the existing range before editing `package.json`.** Most alerts here are a stale lock
file, not a too-low range — e.g. `postcss` at `^8.5.15` already permits the patched `8.5.25`.
For those, `npm update` is the entire fix and `package.json` should not be touched.

**An override is not a fix until the lock file says so.** Overrides never reach bundled copies:
`npm ci` stays green and the old version still ships. `--check` catches that.

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

**"No published fix" may just be feed lag.** This machine resolves npm through the 1ES feed
mirror (`ms-feed-*.pkgs.visualstudio.com`), which can trail the public registry by days. Before
recording something as an accepted risk, cross-check against Dependabot — if Dependabot has
opened a PR for a version `npm view` says does not exist, the fix is real and the mirror is
simply behind. Say "not yet on our feed mirror", not "no fix exists", and let the Dependabot PR
land it.

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
- **Never add a flat override for a package installed across several major lines** — it
  rewrites every copy and silently downgrades the other lines. `brace-expansion` is installed
  on the 1.x, 2.x and 5.x lines simultaneously; each needs its own nested override.
- **Scope a nested override to the parent's major line** when the parent is itself installed on
  several lines: `"minimatch@^10": { "brace-expansion": "^5.0.12" }`, not `"minimatch": {...}`.
  The unscoped form also forced brace-expansion 5 under minimatch 5 and 9, which then threw
  `expand is not a function` on any `{a,b}` pattern.
- **Pin bundled packages that are also declared in `package.json` to an exact version** (both
  the dependency and the override, e.g. `adm-zip`). With a range, `npm ci` fails with EUSAGE
  as soon as a newer matching version is published.
- Forcing a production dependency onto another major line than its parent declares fails
  `--check` until it is added to `KNOWN_FORCED_MAJORS` in the script with the reason it is safe.

### Strategy B — Direct dependency bump

Update `package.json` version, then `npm install`.

### Strategy C — Lock file patch (`inBundle: true`)

`node scripts/audit-overrides.js --write` does this for you whenever the patched version stays
on the same major line and its own dependencies are already in the tree; it rebuilds the entry
from the registry manifest (version, resolved, integrity, dependencies, engines, ...) and keeps
the `inBundle` flag. Patch by hand only what it reports under **Needs a human**:

```bash
node -e "
const l = require('./package-lock.json');
console.log(
  Object.keys(l.packages)
    .filter(k => k.endsWith('/<pkg>'))
    .map(k => k + ' -> ' + l.packages[k].version + ' inBundle:' + l.packages[k].inBundle)
    .join('\n')
);"

npm view <pkg>@<patched-version> --json   # version, dist.tarball, dist.integrity, dependencies, engines
```

Update `version`, `resolved` and `integrity`, and also `dependencies` / `engines` / `license`
if they changed, keeping `inBundle`. Every new dependency must already resolve from that
location in the tree. A fix on another major line means the parent has to be upgraded instead.
Then run `npm install` and `node scripts/audit-overrides.js --check`.

---

## Step 4 — Verify

```bash
npm audit 2>&1
node scripts/audit-overrides.js --check 2>&1
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

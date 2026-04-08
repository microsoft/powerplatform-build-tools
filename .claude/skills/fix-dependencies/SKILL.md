---
name: fix-dependencies
description: Fix all vulnerabilities on the current branch using npm audit. Local branch only — no ADO/GitHub queries.
allowed-tools: Read, Write, Glob, Grep, Bash
user-invocable: true
---

# Fix Dependencies

Fix all vulnerabilities on the current branch using `npm audit`. No user input required.

**Scope:** local branch only — no origin sync, no ADO queries, no Dependabot. For S360 / ADO / GitHub alerts use `/security-alerts`.

---

## Step 1 — Audit

```bash
npm audit --json 2>&1
```

Build a fix list. For each vulnerability, apply the first matching rule:

| Condition | Action |
| --------- | ------ |
| `patched_version` exists | Fix it — patch/minor/major all acceptable for security |
| `inBundle: true`, parent has newer version | Upgrade parent (Strategy B) |
| `inBundle: true`, no parent upgrade | Patch lock file directly (Strategy C) |
| `patched_version: null` | Accept risk, document, move on |
| `scope: development` + low severity + no patch | Accept risk, move on |

Known permanent accepted risk — do not flag: `elliptic` (GHSA-848j-6mx2-7j84) via `rewiremock` — dev-only, no patched version.

---

## Step 2 — Fix (no pausing between fixes)

### Strategy A — npm override (non-bundled transitive dep)

Add/update the entry in `"overrides"` in `package.json`, then:

```bash
npm view <pkg>@<version> version   # confirm version exists
# edit package.json overrides
npm install 2>&1
npm ls <pkg> 2>&1                  # confirm version took effect
```

Hard rules:

- **Never add `"minimatch": "^3.x"` as a flat override** — infinite npm loop
- `ajv` override must stay at `^6.x` — v8 breaks ESLint
- Do not change intentionally-pinned overrides (`nanoid`, `electron-to-chromium`, `@types/node`) unless explicitly asked

### Strategy B — Direct dependency bump

Update the version in `dependencies` or `devDependencies` in `package.json`, then `npm install`.

### Strategy C — Lock file patch (for `inBundle: true` packages)

```bash
# Find all paths for the package
node -e "
const l = require('./package-lock.json');
console.log(
  Object.keys(l.packages)
    .filter(k => k.endsWith('/<pkg>'))
    .map(k => k + ' -> ' + l.packages[k].version + ' inBundle:' + l.packages[k].inBundle)
    .join('\n')
);"

# Get safe version metadata
npm view <pkg>@<patched-version> dist.tarball dist.integrity --json

# Patch all matching entries
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
console.log('Patched');
"
npm install 2>&1
```

### Strategy D — Accept risk

Document in final summary. Do not block or ask.

---

## Step 3 — Verify

```bash
npm audit 2>&1
npm run ci 2>&1
```

`npm run ci` functional tests will fail locally (require `PA_BT_ORG_PASSWORD`) — expected, not a blocker.

If `npm run ci` fails on a non-functional-test step (TypeScript error, lint, unit test), fix it and re-run before continuing. Do not commit a broken build.

---

## Step 4 — Commit and PR (only if Step 3 passes)

```bash
git add package.json package-lock.json
git status   # confirm nothing accidental staged
git commit -m "chore: fix dependency vulnerabilities"
```

Then run `/pr` to create the pull request.

---

## Final Summary

Print before handing off to `/pr`:

- **Fixed:** package, old → new version, strategy used
- **Accepted risk:** package, GHSA ID, reason

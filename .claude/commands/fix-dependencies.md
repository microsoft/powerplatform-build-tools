# Dependency Management

Single command for auditing, fixing vulnerabilities, and updating packages.
Runs in three phases: Audit → Fix → Verify. Always runs all three in order.

---

## Phase 1 — Audit (read-only, always run first)

```bash
npm audit --json 2>&1
npm outdated 2>&1
npm install 2>&1 | grep EBADENGINE
```

Produce a status table before touching anything:

| Package | Type | Severity | Current | Safe Version | Fix Strategy |
|---------|------|----------|---------|--------------|--------------|
| ...     | ...  | ...      | ...     | ...          | ...          |

---

## Phase 2 — Fix

Apply fixes in this order. Use the architecture knowledge below to pick the right strategy.

### Strategy A — Override (for non-bundled transitive deps)

Add or update the `"overrides"` block in package.json.
Verify the safe version exists first: `npm view <pkg> dist-tags.latest`

**HARD RULES — learned from this project:**
- **Never add a flat `"minimatch": "^3.x"` override.** It causes an infinite npm resolution loop because `readdir-glob` (pulled in by `release-it@19`) requires `minimatch@^5.x`. These conflict and npm loops at 50,000+ iterations.
- Nested overrides (`"pkg": { "dep": "version" }`) do NOT work for packages marked `inBundle: true` in package-lock.json — use Strategy C instead.
- After adding overrides, always run `npm install` before checking if they took effect.

### Strategy B — Direct dependency bump (for direct deps)

Update the version spec in `devDependencies` or `dependencies` in package.json, then `npm install`.
Only bump patch/minor without asking. Flag major version bumps to the user first.

**Do NOT update packages pinned in `overrides`** (e.g. `nanoid`, `electron-to-chromium`) unless explicitly asked — those are intentional pins.

### Strategy C — Lock file patch (for bundled deps with `inBundle: true`)

`npm audit fix` and overrides cannot reach bundled packages. Patch package-lock.json directly.

```bash
# 1. Confirm the package is bundled
node -e "const l=require('./package-lock.json'); const k='node_modules/<path>'; console.log(l.packages[k]?.inBundle, l.packages[k]?.version)"

# 2. Find all nested locations of the package
node -e "const l=require('./package-lock.json'); console.log(Object.keys(l.packages).filter(k=>k.endsWith('/<pkg>')))"

# 3. Get the safe version metadata
npm view <pkg>@<safe-version> dist.tarball dist.integrity --json

# 4. Patch package-lock.json: update version, resolved, integrity fields

# 5. Delete the old installed copy and reinstall
rm -rf node_modules/<path-to-nested-pkg>
npm install
```

**This project's bundled packages** (always use Strategy C for their nested deps):
- `azure-pipelines-task-lib@4.17.3` — nested `minimatch@3.0.5` (exact pin, vulnerable, no 4.x fix — needs v5 upgrade, flag to user)
- `@microsoft/powerplatform-cli-wrapper@0.1.135` — hosted on `npm.pkg.github.com`, requires GitHub PAT in `~/.npmrc`
- `fs-extra`, `semver` — no known issues

### Strategy D — Accept risk (document and skip)

Use when:
- Fix requires a **major version breaking change** (e.g. `azure-pipelines-task-lib` 4→5)
- Vulnerability is **low severity**, devDep only, and fix is a breaking downgrade (e.g. `rewiremock→elliptic` chain)
- No fix version exists upstream

Always document accepted risks in the summary.

---

## Phase 3 — Verify

```bash
npm install 2>&1
npm audit 2>&1
npm ls <changed-package> 2>&1   # confirm correct version is installed
```

For lock-file-patched packages, verify the physical install:
```bash
node -e "console.log(require('./node_modules/<nested-path>/package.json').version)"
```

For build impact, run:
```bash
npm run build 2>&1
npm test 2>&1
```

---

## GitHub Registry Auth (required for `@microsoft/*` packages)

The project `.npmrc` routes `@microsoft:registry` to `https://npm.pkg.github.com/`.
If `npm install` hangs after all npmjs.org packages resolve, check GitHub auth:

```bash
# Test auth
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token <your-token>" \
  "https://npm.pkg.github.com/@microsoft%2fpowerplatform-cli-wrapper"
# Must return 200

# Token goes in ~/.npmrc:
# //npm.pkg.github.com/:_authToken=<token>
# Token needs read:packages scope
```

---

## Engine Warnings (non-breaking, informational)

Current Node: v20.11.0

| Package | Requires | Status |
|---------|----------|--------|
| `release-it@19.2.4` | `^20.12.0 \|\| >=22.0.0` | One patch behind — non-breaking |
| `chokidar@5.0.0` | `>=20.19.0` | Minor version behind — non-breaking |
| `readdirp@5.0.0` | `>=20.19.0` | Minor version behind — non-breaking |

A Node upgrade to `>=20.19.0` clears all three. Not required for functionality.

---

## Final Output

Produce a summary with three sections:
1. **Fixed** — what was changed, before/after versions, strategy used
2. **Skipped** — what couldn't be fixed and why
3. **Recommended follow-ups** — e.g. Node upgrade, azure-pipelines-task-lib v5 migration

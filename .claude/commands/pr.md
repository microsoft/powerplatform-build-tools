# PR — Create, Push, and Review

Handles three modes depending on what you pass:

- `/pr` — create and push a PR for the current branch
- `/pr review <url-or-number>` — review an existing PR
- `/pr review` — review the current branch's open PR

---

## Mode 1: Create PR

### Step 1 — Pre-flight checks

```bash
git status 2>&1
git diff main...HEAD --stat 2>&1
git log main...HEAD --oneline 2>&1
npm install 2>&1 | tail -3          # must be clean
npm audit 2>&1 | tail -5            # note any remaining vulns
npm run build 2>&1 | tail -10       # must pass
```

If `npm run build` fails, stop and fix it before creating the PR.

### Step 2 — Commit any remaining changes

Stage files explicitly (never `git add .`):
```bash
git add <specific files>
git status  # confirm nothing accidental is staged
git commit -m "<type>: <description>"
```

Commit message types: `fix:`, `feat:`, `chore:`, `build:`, `docs:`

### Step 3 — Push

```bash
git push -u origin HEAD 2>&1
```

### Step 4 — Create PR

Branch naming convention: `users/<alias>/<description>` or `users/<alias>/<ticket-id>-<description>`
Target branch: `main`

```bash
gh pr create \
  --base main \
  --title "<type>: <concise description under 70 chars>" \
  --body "$(cat <<'EOF'
## Summary
- <what changed and why>

## Changes
<!-- Fill in relevant sections only -->

### Dependencies updated
| Package | Before | After | Reason |
|---------|--------|-------|--------|
| ...     | ...    | ...   | ...    |

### Tasks affected
<!-- List any Azure DevOps tasks whose behaviour changed -->

### Architecture impact
<!-- If any layer boundary changed (build-tools ↔ cli-wrapper interface,
     task.json input names, bundleDependencies, service connection schema) -->

## Known limitations / follow-ups
- <anything accepted as risk or deferred>

## Test plan
- [ ] `npm install` clean (no unexpected warnings)
- [ ] `npm audit` — no new vulnerabilities introduced
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] Manual pipeline run on DEV stage (if task behaviour changed)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL.

---

## Mode 2: Review PR

### Step 1 — Fetch PR details

```bash
gh pr view <number-or-url> 2>&1
gh pr diff <number-or-url> 2>&1
gh pr checks <number-or-url> 2>&1
```

### Step 2 — Understand the change in architecture context

Map every changed file to its layer and assess impact:

| Changed file pattern | Layer | Review focus |
|---------------------|-------|--------------|
| `src/tasks/*/index.ts` | build-tools | Correct input reading, error handling, cli-wrapper call signature |
| `src/tasks/*/task.json` | build-tools | Input name stability (breaking change for existing pipelines), correct types |
| `src/host/BuildToolsHost.ts` | build-tools | All 32 tasks affected — high blast radius |
| `src/params/auth/getCredentials.ts` | build-tools | Auth regression risk — all auth types must still work |
| `src/params/auth/getEnvironmentUrl.ts` | build-tools | 4-level fallback chain must be preserved |
| `package.json` overrides | dependencies | Check no flat minimatch@^3.x override added (causes infinite loop) |
| `package-lock.json` | dependencies | Check for unexpected version changes, verify inBundle patches are intentional |
| `extension/task-metadata.json` | packaging | GUID changes are breaking — LIVE GUIDs must never change |
| `extension/extension-manifest.json` | packaging | Publisher, ID changes are breaking |
| `gulp/pack.mjs` | build system | Stage logic, VSIX generation |
| `nuget.json` | build system | pac CLI version bump — verify compatibility |

### Step 3 — Check these things for every PR

**Security:**
- No secrets, tokens, or credentials committed
- `package.json` overrides don't introduce new vulnerabilities (run `npm audit` mentally against the diff)
- No `--no-verify` or bypassed hooks

**Dependencies:**
- New overrides: are they the minimum required? Is the override version safe?
- If `package-lock.json` changed: are the `inBundle` entries intentional? Were lock file patches needed?
- If a new direct dependency was added: should it be in `bundleDependencies`?

**Breaking changes:**
- `task.json` input names — renaming breaks existing customer pipelines
- `bundleDependencies` additions/removals change the VSIX package contents
- `extension/task-metadata.json` LIVE GUIDs — must never change
- `IHostAbstractions` or `RunnerParameters` interface changes — affect cli-wrapper compatibility

**Architecture alignment:**
- Azure DevOps pipeline logic stays in build-tools (not leaked into cli-wrapper interfaces)
- pac CLI argument logic stays in cli-wrapper (not duplicated in index.ts)
- Auth flow changes: all four auth types (UsernamePassword, SPN, ManagedIdentity, WorkloadIdentity) must still work

**Code quality:**
- Error propagation: errors must reach `tl.setResult(TaskResult.Failed, ...)` — not swallowed
- New tasks follow the existing pattern: IIFE → `isRunningOnAgent()` → `main()` → cli-wrapper action
- Tests cover the changed behaviour

### Step 4 — Leave review

Post a structured review comment:

```bash
gh pr review <number> --comment --body "$(cat <<'EOF'
## Review

### Architecture
<any layer boundary concerns>

### Security
<any credential/secret/vulnerability concerns>

### Breaking changes
<any task.json, GUID, or interface changes that affect customers>

### Suggestions
<non-blocking improvements>

### Verdict
Approve / Request changes — <one line reason>
EOF
)"

# To approve:
gh pr review <number> --approve

# To request changes:
gh pr review <number> --request-changes --body "<reason>"
```

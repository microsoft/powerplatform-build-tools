# Review Agent — Autonomous PR Review

Reads a PR diff, cross-references the full knowledge base, posts inline comments on specific
issues, and leaves an overall verdict. Zero user input required.

Invoke as:

- `/review <pr-number-or-url>` — review a specific PR
- `/review` — review the open PR on the current branch

For **creating** PRs use `/pr`. For **CLI version bumps** use `/pac-cli-update`.

---

## Core rule: never ask, always decide

| Condition | Action |
| --------- | ------ |
| Line-level issue (wrong pattern, bug risk, breaking change) | Post **inline comment** on that line |
| File-level concern (missing test, architecture violation) | Post **inline comment** on first line of file |
| Overall concern (security, missing checklist item) | Add to **overall review body** |
| No issues in a section | Skip the section — don't pad the review |

---

## Step 1 — Sync knowledge if stale

```bash
grep "## Last sync" memory/ado-knowledge.md 2>/dev/null | tail -1
```

If last sync was > 7 days ago or file missing: run `/knowledge-sync` inline, then continue.

---

## Step 2 — Resolve PR and classify type

```bash
# Resolve PR number, head SHA, base branch, changed files
gh pr view <number-or-url> --json number,title,body,headRefOid,baseRefName,author,url 2>&1
gh pr checks <number-or-url> 2>&1
gh pr view <number-or-url> --json baseRefName,files,author \
  --jq '{base:.baseRefName, author:.author.login, files:[.files[].path]}' 2>&1
```

Capture: `PR_NUMBER`, `HEAD_SHA`, `BASE_BRANCH`.

**Classify the PR type** — determines which checks run:

| Changed files | PR type | Checks |
| ------------- | -------- | ------ |
| `nuget.json` + `extension/overview.md` only | PAC CLI bump | Step 3a |
| `package.json` + `package-lock.json` only | npm dep update | Step 3b |
| `package.json` + ALL `task.json` files | Node target update | Step 3b + Step 5 |
| `src/tasks/*/index.ts` or selective `task.json` | Feature / new input | Step 5 (full) |
| Base = `release/stable` (any type) | Release branch PR | Step 3c first, then type check |

---

## Step 3 — Type-specific checks (run the section matching the PR type)

### Step 3a — PAC CLI bump checks (nuget.json changed)

```bash
# Verify both packages have the same version
node -e "
const n = require('./nuget.json');
const vers = n.packages.map(p => p.version);
console.log('versions:', [...new Set(vers)].join(', '));
console.log(vers.every(v => v === vers[0]) ? 'OK: match' : 'MISMATCH');
" 2>&1

# Verify the version exists on nuget.org
curl -s "https://api.nuget.org/v3-flatcontainer/microsoft.powerapps.cli/index.json" \
  | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
    const v=require('./nuget.json').packages[0].version; \
    console.log(d.versions.includes(v)?'nuget: found':'nuget: NOT FOUND')" 2>&1
```

Request changes immediately if:

- `nuget.json` packages have mismatched versions
- Version does not exist on nuget.org
- `overview.md` has no entry for the new version
- `{{NextReleaseVersion}}` placeholder was removed from `overview.md`

### Step 3b — npm dependency checks (package.json changed)

Check the diff for:

- No flat `minimatch@^3.x` override — causes infinite npm resolution loop
- `ajv` override stays at `^6.x` — v8 breaks ESLint
- New overrides are at minimum required version (not over-pinned)
- `inBundle: true` entries in `package-lock.json` changes are intentional (overrides can't reach them)
- No new direct dependency that should be in `bundleDependencies`

### Step 3c — Release/stable branch checks (base == release/stable)

Release PRs must be version bumps only. Request changes immediately if:

- Contains `.ts` logic changes (not just version string changes)
- Adds new dependencies not present in the corresponding `main` PR
- No corresponding merged `main` PR exists with the same changes

Verify the paired main PR exists:

```bash
gh search prs --repo microsoft/powerplatform-build-tools \
  --state merged --base main "<version-or-keyword>" 2>&1
```

---

## Step 4 — Research context

Run in parallel to inform the review:

```bash
# Find similar past PRs (2-3 keywords from PR title)
gh search prs --repo microsoft/powerplatform-build-tools \
  --state merged --limit 8 "<keyword1> <keyword2>" 2>&1

# For top matches, read the body:
gh pr view <past-pr-number> --json title,body,mergedAt 2>&1
```

Also check `memory/ado-knowledge.md` for related ADO work items.
Skip ADO query for pure PAC CLI or dependency PRs — rarely adds value.

---

## Step 5 — File-level review (feature/bug fix PRs, or any PR touching src/)

Fetch the full diff:

```bash
gh pr diff <PR_NUMBER> 2>&1
```

For each changed file apply:

| File pattern | What to check |
| ------------ | ------------- |
| `src/tasks/*/index.ts` | `tl.getInput()` used correctly; errors reach `tl.setResult(TaskResult.Failed, ...)`; no pac args assembled here |
| `src/tasks/*/task.json` | Input names unchanged (renaming breaks customer pipelines); `type` correct; `required` set correctly |
| `src/host/BuildToolsHost.ts` | ALL 32 tasks affected — flag blast radius |
| `src/params/auth/getCredentials.ts` | All four auth types still work: UsernamePassword, SPN, ManagedIdentity, WorkloadIdentity |
| `src/params/auth/getEnvironmentUrl.ts` | 4-level fallback preserved: task input → pipeline variable → connection → default |
| `extension/task-metadata.json` | LIVE GUIDs must **never** change |
| `extension/extension-manifest.json` | Publisher and extension ID must not change |
| `gulp/pack.mjs` | `tar` imported via `createRequire`, not ESM `import` |
| `test/unit-test/**` | New behaviour is tested; mocks use `rewiremock` |

**Security (every PR):**

- No secrets, tokens, or credentials committed
- No `--no-verify` or commit hook bypasses

**Architecture alignment:**

- Pipeline logic stays in build-tools; pac CLI arg construction stays in cli-wrapper
- New tasks follow IIFE → `isRunningOnAgent()` → `main()` → cli-wrapper pattern

**Known failure patterns from knowledge base:**

- WhoAmI locale failure (ADO #4846644): flag any change near `whoAmI` or locale handling
- AAD/OAuth authority (ADO #4863652): `resolveCloudInstance()` map must be preserved
- PVA import failure (IcM 604312672): pac CLI version bumps should reference changelog

---

## Step 6 — Post inline comments

```bash
HEAD_SHA=$(gh pr view <PR_NUMBER> --json headRefOid --jq .headRefOid)

gh api repos/microsoft/powerplatform-build-tools/pulls/<PR_NUMBER>/comments \
  --method POST \
  --field body="<comment>" \
  --field commit_id="$HEAD_SHA" \
  --field path="<file-path>" \
  --field line=<line-number> \
  --field side="RIGHT" 2>&1
```

Format: `⚠️ <risk>` / `🚨 Breaking: <impact>` / `💡 Suggestion:` / `❓ <question>`

Max 15 inline comments — consolidate minor points into the overall review body.

---

## Step 7 — Post overall review and verdict

```bash
gh pr review <PR_NUMBER> --comment --body "$(cat <<'EOF'
## Review

**Reviewed by:** Claude Code (autonomous review agent)
**PR type:** <PAC CLI bump / npm dep update / feature / release branch>
**Similar PRs:** <titles + numbers, or "none">
**ADO context:** <relevant items, or "none">

### Breaking changes
<task.json, GUID, or interface changes — or "None detected">

### Security
<!-- Omit if no findings -->

### Architecture
<!-- Omit if no findings -->

### Dependencies
<!-- Omit if package files unchanged -->

### Suggestions
<!-- Omit if none -->

### Verdict
**✅ Approve** / **🔄 Request changes** / **💬 Comment** — <one line reason>
EOF
)" 2>&1

# Then execute the verdict:
gh pr review <PR_NUMBER> --approve 2>&1
# or
gh pr review <PR_NUMBER> --request-changes --body "<blocker>" 2>&1
```

---

## Verdict decision table

| Condition | Verdict |
| --------- | ------- |
| LIVE GUID changed | Request changes — critical breaking |
| `task.json` input renamed | Request changes — breaks customer pipelines |
| Secret/credential in diff | Request changes — security |
| CI failing on non-functional-test step | Request changes |
| `release/stable` PR has logic changes | Request changes — version bumps only on release branch |
| `release/stable` PR missing paired `main` PR | Request changes |
| `nuget.json` package version mismatch | Request changes — CLI update incomplete |
| PAC CLI version not on nuget.org | Request changes — version doesn't exist |
| Only non-blocking suggestions | Approve with inline suggestions |
| PAC CLI bump verified clean | Approve |
| No findings | Approve |
| Intent unclear | Comment |

**Never:**

- Approve a PR with a LIVE GUID change, renamed input, or committed secret
- Block a PR because functional tests fail locally (expected — require live credentials)
- Re-flag `elliptic` LOW vuln (known accepted risk, no patch exists)

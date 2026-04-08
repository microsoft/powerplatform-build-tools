---
name: workitem
description: Read an ADO or GitHub work item, research similar past PRs, implement the fix, and leave the branch ready for /create-pr.
user-invocable: true
argument-hint: "<ado-id | github-issue-number | url>"
---

# Work Item — Read, Triage, and Implement

Use this skill to read an ADO or GitHub work item, understand its impact on this codebase,
research similar past PRs and work items, then implement and leave the branch ready for `/create-pr`.

Invoke as: `/workitem <url-or-id>`

**Zero user input required.** Research first, implement second — never skip the research phase.

---

## Step 0 — Sync knowledge if stale

Before researching or implementing, ensure the knowledge base is current.

```bash
grep "## Last sync" memory/ado-knowledge.md 2>/dev/null | tail -1
```

- If last sync was **≤ 7 days ago**: skip, proceed to Step 1
- If last sync was **> 7 days ago** or file missing: run `/knowledge-sync` inline now, then continue

This ensures known patterns, confirmed fixes, and accepted risks are up to date before
you base any implementation on them.

---

## Step 1 — Fetch the work item

**GitHub issue:**

```bash
gh issue view <number> 2>&1
gh issue view <number> --comments 2>&1
```

**ADO work item** (requires az CLI):

```bash
az boards work-item show --id <id> 2>&1
```

If only a URL is given, extract the ID and detect the type from the URL pattern:

- `github.com/.../issues/<n>` → GitHub issue
- `dev.azure.com/.../workitems/<n>` or `/_workitems/edit/<n>` → ADO work item

---

## Step 2 — Research similar past work (always before touching code)

Extract 2-4 keywords from the work item title/description, then run all three in parallel:

### 2a — Search merged PRs for similar fixes

```bash
gh search prs --repo microsoft/powerplatform-build-tools \
  --state merged \
  --limit 10 \
  "<keyword1> <keyword2>" 2>&1

# For the top 3 most relevant results, read the full body:
gh pr view <past-pr-number> --json title,body,mergedAt,files 2>&1
```

Look for: how the fix was structured, which files were changed, patterns used.

### 2b — Search ADO for similar resolved items

```bash
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.State] IN ('Closed', 'Resolved', 'Done')
    AND [System.Title] CONTAINS '<keyword>'
  ORDER BY [System.ChangedDate] DESC
" --output json 2>&1

# Fetch details for most relevant matches:
az boards work-item show --id <id> 2>&1
```

### 2c — Check local knowledge base

Read `memory/ado-knowledge.md` for any entry matching the work item topic.
Check `MEMORY.md` known customer issues and hard rules.

### Research summary (print before proceeding)

Before writing any code, print:

```text
Research findings:
- Similar PRs: <PR titles + numbers, or "none">
- Similar ADO items: <IDs + titles, or "none">
- Applicable hard rules: <from MEMORY.md, or "none">
- Reusable pattern: <describe how the fix should mirror a past fix, or "novel">
```

If a confirmed fix already exists for the exact same issue in a merged PR, reuse that
pattern directly rather than solving from scratch.

---

## Step 3 — Understand impact using architecture (read-only, before branching)

Before touching code, map the work item to the correct layer using the architecture below.
Read the relevant source files to understand the current behaviour.

**Layer map — where to look:**

| Work item topic | Layer | Key files to read |
| --------------- | ----- | ----------------- |
| Task input/output, pipeline variable, service connection | build-tools | `src/tasks/<name>/index.ts`, `src/params/auth/getCredentials.ts`, `src/params/auth/getEnvironmentUrl.ts` |
| pac CLI argument, action logic, auth flow | cli-wrapper | `node_modules/@microsoft/powerplatform-cli-wrapper/dist/actions/<action>.ts` |
| New/changed task definition | build-tools | `src/tasks/<name>/task.json`, `src/tasks/<name>/index.ts` |
| Build, packaging, VSIX, stage GUIDs | build system | `gulp/pack.mjs`, `extension/task-metadata.json`, `extension/extension-manifest.json` |
| Vulnerability / dependency | dependencies | `package.json` overrides, `package-lock.json` — use `/fix-dependencies` |
| Test failure | tests | `test/unit-test/`, `test/functional-test/` |

**Architecture call chain (for context):**

```text
Azure DevOps Pipeline
  → src/tasks/<name>/index.ts          (build-tools: reads inputs, calls cli-wrapper)
  → cli-wrapper: actions/<action>.ts   (assembles pac args, handles auth)
  → pac CLI binary (pac.exe)           (executes, spawned via child_process)
  → Power Platform API
```

**Key constraints:**

- All 32 tasks share the same host abstraction (`BuildToolsHost`, `BuildToolsRunnerParams`) — changes there affect every task
- `task.json` declares the Azure DevOps UI contract — changing input names is breaking for existing pipelines
- `bundleDependencies` packages (`azure-pipelines-task-lib`, `@microsoft/powerplatform-cli-wrapper`, `fs-extra`, `semver`) ship inside the VSIX — their interfaces are the extension's API surface
- Four release stages (LIVE / BETA / DEV / EXPERIMENTAL) each have unique task GUIDs in `task-metadata.json`

---

## Step 4 — Sync with origin and create a branch

Always fetch the latest main before branching:

```bash
git fetch origin 2>&1
git checkout main 2>&1
git merge origin/main --no-edit 2>&1
```

Then create the branch following the project naming convention:

```bash
git checkout -b users/<your-alias>/<short-description>
# e.g. users/jbujula/fix-export-solution-timeout
```

Reference the work item ID in the branch name if it's a tracked ticket:

```bash
git checkout -b users/<alias>/<id>-<short-description>
```

---

## Step 5 — Implement

Make the minimal change that resolves the work item. Follow existing patterns:

- **New task input**: add to `task.json` inputs array AND handle in `index.ts` via `parameterMap`
- **Auth issue**: check `getCredentials.ts` and the `cloudInstance` resolution map
- **Environment URL not found**: check the 4-level fallback chain in `getEnvironmentUrl.ts`
- **pac CLI arg change**: this is in cli-wrapper, not this repo — raise issue upstream; workaround via `BuildToolsRunnerParams` if urgent
- **Build/pack issue**: check `gulp/pack.mjs` and `webpack.config.js`
- **Dependency vulnerability**: use `/fix-dependencies`

After implementing, always run:

```bash
npm run build 2>&1   # must pass before committing
npm test 2>&1        # must pass before committing
```

---

## Step 6 — Commit

Stage relevant files only (never `git add .`):

```bash
git add src/tasks/<name>/... package.json package-lock.json  # etc.
git commit -m "fix: <short description> (#<work-item-id>)"
```

---

## Step 7 — Hand off to `/create-pr`

Leave the branch in a clean, pushed state and note:

- Work item URL
- What was changed and why
- Any follow-up items or known limitations

Then run `/create-pr` to create the pull request.

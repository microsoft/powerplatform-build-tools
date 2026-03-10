# Work Item — Read, Triage, and Implement

Use this skill to read an ADO or GitHub work item, understand its impact on this codebase,
create a branch, implement the fix or feature, and leave the branch ready for `/pr`.

Invoke as: `/workitem <url-or-id>`

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

## Step 2 — Understand impact using architecture

Before touching code, map the work item to the correct layer using the architecture below.
Read the relevant source files to understand the current behaviour.

**Layer map — where to look:**

| Work item topic | Layer | Key files to read |
|----------------|-------|-------------------|
| Task input/output, pipeline variable, service connection | build-tools | `src/tasks/<name>/index.ts`, `src/params/auth/getCredentials.ts`, `src/params/auth/getEnvironmentUrl.ts` |
| pac CLI argument, action logic, auth flow | cli-wrapper | `node_modules/@microsoft/powerplatform-cli-wrapper/dist/actions/<action>.ts` |
| New/changed task definition | build-tools | `src/tasks/<name>/task.json`, `src/tasks/<name>/index.ts` |
| Build, packaging, VSIX, stage GUIDs | build system | `gulp/pack.mjs`, `extension/task-metadata.json`, `extension/extension-manifest.json` |
| Vulnerability / dependency | dependencies | `package.json` overrides, `package-lock.json` — use `/deps` skill |
| Test failure | tests | `test/unit-test/`, `test/functional-test/` |

**Architecture call chain (for context):**
```
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

## Step 3 — Create a branch

Follow the project naming convention:
```bash
git checkout -b users/<your-alias>/<short-description>
# e.g. users/jbujula/fix-export-solution-timeout
```

Reference the work item ID in the branch name if it's a tracked ticket:
```bash
git checkout -b users/<alias>/<id>-<short-description>
```

---

## Step 4 — Implement

Make the minimal change that resolves the work item. Follow existing patterns:

- **New task input**: add to `task.json` inputs array AND handle in `index.ts` via `parameterMap`
- **Auth issue**: check `getCredentials.ts` and the `cloudInstance` resolution map
- **Environment URL not found**: check the 4-level fallback chain in `getEnvironmentUrl.ts`
- **pac CLI arg change**: this is in cli-wrapper, not this repo — raise issue upstream; workaround via `BuildToolsRunnerParams` if urgent
- **Build/pack issue**: check `gulp/pack.mjs` and `webpack.config.js`
- **Dependency vulnerability**: use `/deps` skill

After implementing, always run:
```bash
npm run build 2>&1   # must pass before committing
npm test 2>&1        # must pass before committing
```

---

## Step 5 — Commit

Stage relevant files only (never `git add .`):
```bash
git add src/tasks/<name>/... package.json package-lock.json  # etc.
git commit -m "fix: <short description> (#<work-item-id>)"
```

---

## Step 6 — Hand off to `/pr`

Leave the branch in a clean, pushed state and note:
- Work item URL
- What was changed and why
- Any follow-up items or known limitations

Then run `/pr` to create the pull request.

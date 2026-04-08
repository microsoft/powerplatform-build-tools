# Debug Agent

Diagnose a pipeline failure or customer issue end-to-end.
Accepts a log file path, pasted error text, ADO work item ID, or GitHub issue URL.
Determines ownership, resolves if PPBT-owned, or produces a precise triage package for the right team.

Invoke as: `/debug-pipeline <log-file-path | error-text | issue-url | ado-id>`

**Works autonomously through all steps. One exception: pauses to request pipeline logs if they are referenced in an ICM/work item but not yet provided — log evidence is required before classifying the failure layer.**

---

## Step 0 — Ingest the input

Determine input type:

- **File path** (`.txt`, `.log`, or similar): read it with the `Read` tool
- **ADO work item** (`dev.azure.com/...` URL or bare integer): `az boards work-item show --id <id> 2>&1`
- **GitHub issue** (`github.com/.../issues/<n>`): `gh issue view <n> --comments 2>&1`
- **Pasted text**: use as-is

Extract and print:
```text
Input summary:
- Type: <file | ado | github | text>
- Task/tool identified: <name from log header, or "unknown">
- Error snippet: <first clear error line, or "none found">
- Timestamp range: <start → end>
- Deployment result: <SUCCESS | FAILED | unknown>
```

### Step 0b — Check for missing logs

If input is an ICM or ADO work item AND any of the following are true:
- Custom field `LogsAttached` = `"Yes"`
- Description mentions "logs attached" or "see attachment"
- Issue cannot be diagnosed from text alone (no error snippet, no pac CLI output visible)

AND no log file path or log content was provided by the user:

→ **STOP. Prompt the user:**
```
Pipeline logs are attached to this ICM/work item but aren't accessible via API.
Please download the logs from the portal and provide the folder path.
Example: C:\Users\<you>\Downloads\

Once you share the path, I'll read the logs and continue the analysis from Step 1.
```

**Do not proceed to Step 1 until log content is available. Do NOT classify the failure layer, assign ownership, or draw conclusions based solely on the ICM title or description — log evidence is mandatory.**
If the user confirms no logs exist or they are unavailable, continue with `Confidence: low` noted throughout.

---

## Step 1 — Verify PPBT is involved

### ADO (Azure DevOps) — PPBT task identifiers

Every PPBT v2 task follows the pattern: `microsoft-IsvExpTools.PowerPlatform-BuildTools.<task-id>.<TaskClass>@2`

| Display Name | Task ID (in YAML/log) | Task Class |
|---|---|---|
| Power Platform Tool Installer | `tool-installer` | `PowerPlatformToolInstaller@2` |
| Power Platform WhoAmI | `whoami` | `PowerPlatformWhoAmi@2` |
| Power Platform Checker | `checker` | `PowerPlatformChecker@2` |
| Power Platform Import Solution | `import-solution` | `PowerPlatformImportSolution@2` |
| Power Platform Export Solution | `export-solution` | `PowerPlatformExportSolution@2` |
| Power Platform Unpack Solution | `unpack-solution` | `PowerPlatformUnpackSolution@2` |
| Power Platform Pack Solution | `pack-solution` | `PowerPlatformPackSolution@2` |
| Power Platform Delete Solution | `delete-solution` | `PowerPlatformDeleteSolution@2` |
| Power Platform Add Solution Component | `add-solution-component` | `PowerPlatformAddSolutionComponent@2` |
| Power Platform Apply Solution Upgrade | `apply-solution-upgrade` | `PowerPlatformApplySolutionUpgrade@2` |
| Power Platform Publish Customizations | `publish-customizations` | `PowerPlatformPublishCustomizations@2` |
| Power Platform Set Solution Version | `set-solution-version` | `PowerPlatformSetSolutionVersion@2` |
| Power Platform Set Connection Variables | `set-connection-variables` | `PowerPlatformSetConnectionVariables@2` |
| Power Platform Deploy Package | `deploy-package` | `PowerPlatformDeployPackage@2` |
| Power Platform Create Environment | `create-environment` | `PowerPlatformCreateEnvironment@2` |
| Power Platform Delete Environment | `delete-environment` | `PowerPlatformDeleteEnvironment@2` |
| Power Platform Assign User | `assign-user` | `PowerPlatformAssignUser@2` |
| Power Platform Reset Environment | `reset-environment` | `PowerPlatformResetEnvironment@2` |
| Power Platform Backup Environment | `backup-environment` | `PowerPlatformBackupEnvironment@2` |
| Power Platform Copy Environment | `copy-environment` | `PowerPlatformCopyEnvironment@2` |
| Power Platform Restore Environment | `restore-environment` | `PowerPlatformRestoreEnvironment@2` |
| Export Dataverse Data | `export-data` | `PowerPlatformExportData@2` |
| Import Dataverse Data | `import-data` | `PowerPlatformImportData@2` |
| Power Platform Download PAPortal | `download-paportal` | `PowerPlatformDownloadPaportal@2` |
| Power Platform Upload PAPortal | `upload-paportal` | `PowerPlatformUploadPaportal@2` |

**PPBT signals** (any one is sufficient):
- Task class matches any entry in the table above
- Author is `Microsoft` (not `Wael Hamze` or other community authors)
- Log contains `POWERPLATFORMTOOLS_PACCLIPATH` or `PP_TOOLS_AUTOMATION_AGENT`
- pac CLI invoked: lines containing `pac solution`, `pac auth`, `pac env`, `pac admin`, `pac package`
- `BuildTools.EnvironmentUrl` pipeline variable present

### GitHub Actions — PPBT action identifiers

All PPBT GitHub Actions use: `microsoft/powerplatform-actions/<action-name>@v1`

| Action | `uses:` value |
|---|---|
| Install Power Platform Tools | `microsoft/powerplatform-actions/actions-install@v1` |
| WhoAmI | `microsoft/powerplatform-actions/whoAmI@v1` |
| Import Solution | `microsoft/powerplatform-actions/import-solution@v1` |
| Export Solution | `microsoft/powerplatform-actions/export-solution@v1` |
| Unpack Solution | `microsoft/powerplatform-actions/unpack-solution@v1` |
| Pack Solution | `microsoft/powerplatform-actions/pack-solution@v1` |
| Publish Customizations | `microsoft/powerplatform-actions/publish-solution@v1` |
| Clone Solution | `microsoft/powerplatform-actions/clone-solution@v1` |
| Check Solution | `microsoft/powerplatform-actions/check-solution@v1` |
| Upgrade Solution | `microsoft/powerplatform-actions/upgrade-solution@v1` |
| Deploy Package | `microsoft/powerplatform-actions/deploy-package@v1` |
| Upload PAPortal | `microsoft/powerplatform-actions/upload-paportal@v1` |
| Catalog Install | `microsoft/powerplatform-actions/install@v1` |
| Catalog Submit | `microsoft/powerplatform-actions/submit@v1` |
| Catalog Status | `microsoft/powerplatform-actions/status@v1` |

**Not-PPBT signals — deflect immediately:**
- Author: `Wael Hamze` → CRM Build Tools (community)
- `Microsoft.Xrm.Tooling.*` PowerShell → old XRM Tooling
- `PackageDeployer` PowerShell task (v12.x) → Wael Hamze legacy tooling
- Task version `@v1` **and** no `microsoft/powerplatform-actions` prefix → unrelated action

If **not PPBT**: skip to Step 5 (non-PPBT triage) immediately.

---

## Step 2 — Identify the failing task and classify the layer

### 2a — Map the failing task to its inputs

Use the tables below to check whether required inputs are present in the log or YAML.

#### Helper tasks

**Tool Installer** (`tool-installer`) — must be FIRST task in every pipeline/workflow
- No required inputs beyond defaults
- Critical: if missing → all other tasks fail with "pac.exe not found" or `POWERPLATFORMTOOLS_PACCLIPATH not set`
- Optional: `AddToolsToPath: true` (adds pac to PATH for script tasks)

**WhoAmI** (`whoami` / `whoAmI`)
- Required: `authenticationType` + one of `PowerPlatformEnvironment` or `PowerPlatformSPN`
- GitHub: `environment-url` + auth credentials (`user-name`/`password-secret` OR `app-id`/`client-secret`/`tenant-id`)
- Use: connectivity check early in pipeline — failure here = auth or network issue, not solution issue

#### Quality check

**Checker** (`checker` / `check-solution`)
- Required: `PowerPlatformSPN` (SPN only — username/password NOT supported for checker)
- Required: `RuleSet` GUID
- Optional: `UseDefaultPACheckerEndpoint` (default true) — if false, must set `CustomPACheckerEndpoint`
- Output: SARIF file as pipeline artifact (`ArtifactDestinationName`)
- Common issue: checker fails for username/password connections — SPN required

#### Solution tasks

**Import Solution** (`import-solution`)
- Required: service connection + `SolutionInputFile`
- Key options: `AsyncOperation: true` (recommended for large solutions — avoids 4-min timeout), `HoldingSolution` (for upgrade pattern), `UseDeploymentSettingsFile` (for connection references + env vars)
- Common issue: sync import times out on large solutions → set `AsyncOperation: true`, `MaxAsyncWaitTime: 60`
- Common issue: connection references not set → use `DeploymentSettingsFile`

**Export Solution** (`export-solution`)
- Required: service connection + `SolutionName` + `SolutionOutputFile`
- Note: use solution *Name* not *Display Name*
- `Managed: true` exports as managed

**Apply Solution Upgrade** (`apply-solution-upgrade`)
- Required: service connection + `SolutionName`
- Use after Import with `HoldingSolution: true`

**Pack / Unpack Solution** — local operations, no service connection needed
- `SolutionType`: Managed | Unmanaged | Both

**Set Solution Version** (`set-solution-version`)
- Required: service connection + `SolutionName` + `SolutionVersionNumber`
- Tip: use `$(Build.BuildId)` as version number

**Set Connection Variables** (`set-connection-variables`)
- Sets pipeline variables: `BuildTools.TenantId`, `BuildTools.ApplicationId`, `BuildTools.ClientSecret`, `BuildTools.DataverseConnectionString`
- Username/password auth also requires `ApplicationId` and `RedirectUri`

**Deploy Package** (`deploy-package`)
- Required: service connection + `PackageFile` (.dll)
- GitHub Actions: Windows runner only (`runs-on: windows-latest`)

#### Environment management tasks

**Create Environment** (`create-environment`)
- Required: `DisplayName`, `LocationName`, `EnvironmentSku`, `CurrencyName`, `LanguageName`, `DomainName`
- Side effect: sets `BuildTools.EnvironmentUrl` pipeline variable — subsequent tasks use this automatically
- Note: `BuildTools.EnvironmentUrl` overrides any service connection URL for downstream tasks

**Copy Environment** (`copy-environment`)
- Required: `TargetEnvironmentUrl`
- `CopyType`: FullCopy (data + metadata) or MinimalCopy (metadata only)

**Restore Environment** (`restore-environment`)
- `RestoreLatestBackup: true` OR provide `RestoreTimeStamp` in `mm/dd/yyyy hh:mm` format

**Export/Import Dataverse Data**
- Schema file created via Configuration Migration tool
- Import accepts zip file or folder with `data-schema.xml` + `data.xml`

#### Power Pages tasks
- `download-paportal` / `upload-paportal`: requires `WebsiteId` GUID, optional `ModelVersion` (1=standard, 2=enhanced data model)

### 2b — When is it a PPBT bug (this repo)?

PPBT owns exactly the boundary between the ADO/GitHub pipeline and cli-wrapper.
A bug is PPBT's if the **wrong value reaches cli-wrapper** or **no value reaches cli-wrapper** when the user configured the pipeline correctly.

**PPBT owns it — fix in this repo — when:**

| Symptom | Root cause | File to fix |
|---------|-----------|------------|
| Task input exists in task.json but is silently ignored / not passed to pac | `index.ts` doesn't read it via `parameterMap` | `src/tasks/<name>/index.ts` |
| Task input works on Windows but breaks on Linux (path, binary location) | `CliLocator.ts` platform logic | `src/host/CliLocator.ts` |
| Wrong cloud instance sent to pac for a valid service connection | `resolveCloudInstance()` missing a cloud mapping | `src/params/auth/getCredentials.ts` |
| `BuildTools.EnvironmentUrl` not set after `create-environment` runs | `index.ts` not calling `tl.setVariable` | `src/tasks/create-environment/index.ts` |
| Service connection field (e.g. `tenantId`) extracted as null/undefined | `getCredentials.ts` reading wrong endpoint field | `src/params/auth/getCredentials.ts` |
| Environment URL fallback chain skips a valid source | `getEnvironmentUrl.ts` fallback order wrong | `src/params/auth/getEnvironmentUrl.ts` |
| Tasks appear in wrong pipeline stage / wrong task GUIDs | GUID substitution bug in pack step | `gulp/pack.mjs`, `extension/task-metadata.json` |
| Tool installer fails to download pac or set `POWERPLATFORMTOOLS_PACCLIPATH` | Installer task logic | `src/tasks/tool-installer/index.ts` |
| New task input added to `task.json` but not wired through to pac | `index.ts` `parameterMap` not updated | `src/tasks/<name>/index.ts` |
| Task breaks after cli-wrapper version bump (interface mismatch) | `BuildToolsHost` or `BuildToolsRunnerParams` out of sync | `src/host/BuildToolsHost.ts`, `src/host/BuildToolsRunnerParams.ts` |
| Error message from task is unhelpful / missing context | Better error surfacing needed | `src/tasks/<name>/index.ts` |

**PPBT does NOT own it — do not fix in this repo — when:**

| Symptom | Actual owner |
|---------|-------------|
| User forgot to add tool-installer to pipeline | User/pipeline config — document the fix, no code change |
| User passed solution display name instead of unique name | User error |
| cli-wrapper assembles wrong pac args (but PPBT passed the right values to it) | cli-wrapper repo |
| pac CLI crashes or returns a wrong result | pac CLI / admin-tools |
| Dataverse operation fails (solution import engine, HTTP 5xx) | CDS / Solution Framework |
| Auth fails because service connection credentials are wrong/expired | User / service connection admin |
| MFA required on username/password connection | User — must switch to SPN |

**The test:** ask "If the user configured the pipeline exactly right, would this still fail?" If yes → PPBT bug. If no → user error or downstream team.

### 2c — Classify the failure layer

```
Azure DevOps / GitHub Actions pipeline
  → [L1] user/pipeline config error (task ordering, missing inputs, wrong auth type)
  → [L2] PPBT code bug  (src/tasks/<name>/index.ts, getCredentials.ts, CliLocator.ts, etc.)
  → [L3] cli-wrapper bug  (@microsoft/powerplatform-cli-wrapper/dist/actions/)
  → [L4] pac CLI binary  (pac.exe / pac)
       └─ [L4-admin]  pac env/admin commands → admin-tools team
       └─ [L4-pac]    pac CLI crash / .NET exception → pac CLI team
       └─ [L4→L5]     pac correctly relays Dataverse error → CDS team
  → [L5] Power Platform API  (Dataverse / crm.dynamics.com)
```

| Symptom | Layer | Owner |
|---------|-------|-------|
| `pac.exe not found` / `POWERPLATFORMTOOLS_PACCLIPATH not set` | L1 | User — tool-installer step missing |
| `BuildTools.EnvironmentUrl` targets wrong env | L1 | User — task ordering side effect |
| Required input missing because user left it blank | L1 | User — pipeline config |
| Checker fails with username/password | L1 | User — SPN required for checker |
| Import times out (~4 min) on large solution | L1 | User — set `AsyncOperation: true` |
| Input exists in task.json but is ignored / not passed to pac | L2 | **PPBT bug** — `index.ts` parameterMap |
| `resolveCloudInstance()` returns wrong cloud for valid endpoint | L2 | **PPBT bug** — `getCredentials.ts` |
| Service connection field extracted as null despite being set | L2 | **PPBT bug** — `getCredentials.ts` |
| `BuildTools.EnvironmentUrl` not set after create-environment | L2 | **PPBT bug** — `index.ts` missing `setVariable` |
| Task breaks on Linux but works on Windows | L2 | **PPBT bug** — `CliLocator.ts` |
| Wrong task GUIDs / tasks conflict in marketplace | L2 | **PPBT bug** — `pack.mjs` / `task-metadata.json` |
| `auth create failed` after correct args passed | L3 | cli-wrapper auth bug |
| `Cannot resolve AAD authority` / wrong AAD endpoint | L3 | cli-wrapper `resolveCloudInstance()` |
| `WhoAmI` fails on non-English agent | L3 | cli-wrapper (known ADO #4846644) |
| pac CLI crashes / .NET exception inside pac | L4-pac | pac CLI team |
| `pac env create/delete/backup/restore/copy` fails | L4-admin | admin-tools team |
| `pac admin *` command fails | L4-admin | admin-tools team |
| `pac auth create` crashes after correct args | L4-pac | pac CLI team |
| `pac solution import/export/publish` + Dataverse HTTP error | L4→L5 | CDS / Solution Framework |
| `pac solution check` / checker API error | L4→L5 | Power Apps Checker team |
| `pac package deploy` + Dataverse-side error | L4→L5 | CDS / Solution Framework |
| HTTP 4xx/5xx from `crm.dynamics.com` | L5 | CDS / Solution Framework |
| Solution component errors / missing dependencies | L5 | CDS / Solution Framework |
| PVA component import failure | L5 | pac CLI team (known IcM 604312672) |

### 2c — pac command → owning team (the critical split)

When pac CLI exits non-zero, the owning team depends on **which pac command ran** AND **where the error originates**:

```
pac command                    → Error origin               → Owner
─────────────────────────────────────────────────────────────────────────────
pac auth create/clear          → pac crashes / token error  → pac CLI (admin-tools)
pac auth create/clear          → wrong args from wrapper    → cli-wrapper (L3)

pac env create/delete/         → any pac-side failure       → admin-tools
  backup/restore/copy/reset

pac admin *                    → any failure                → admin-tools

pac solution import            → pac crashes / bad args     → pac CLI (admin-tools)
pac solution import            → Dataverse API error        → CDS / Solution Framework
pac solution import            → PVA component error        → pac CLI (IcM 604312672)

pac solution export            → pac crashes / bad args     → pac CLI (admin-tools)
pac solution export            → Dataverse API error        → CDS / Solution Framework

pac solution publish           → Dataverse API error        → CDS / Solution Framework

pac solution check             → checker service error      → Power Apps Checker team

pac package deploy             → pac crashes               → pac CLI (admin-tools)
pac package deploy             → Dataverse-side error       → CDS / Solution Framework
```

**How to tell pac crash vs Dataverse error:**
- **pac crash / pac team**: `System.Exception`, `NullReferenceException`, `Unhandled exception`, pac process exits with code 1 and no HTTP status in the message, `InnerException` in .NET stack trace
- **Dataverse error / CDS team**: HTTP status code in error (`400`, `403`, `404`, `500`), `OrganizationServiceFault`, `ErrorCode:`, `Microsoft.Crm.*` in the message, `ImportJobId`, solution operation GUID, `The import of solution` messages
- **Auth error / admin-tools or cli-wrapper**: Azure AD / MSAL errors, `AADSTS*` error codes, `interaction_required`, token acquisition errors

Print:
```text
Failing task: <task name>
pac command: <exact pac subcommand, e.g. "pac solution import">
Layer: <L1 | L2 | L3 | L4-pac | L4-admin | L4→L5>
Owner: <PPBT | cli-wrapper | pac-CLI/admin-tools | CDS/solution-framework | pipeline-config>
Error origin signal: <pac crash | Dataverse HTTP error | auth/AAD error | pipeline config>
Confidence: <high | medium | low>
Reasoning: <one sentence>
```

### 2d — pac CLI telemetry (L4-pac and L4→L5 only)

**Run this step if and only if the layer is L4-pac or L4→L5.**

pac CLI sends telemetry to PPUX Analytics via OneCollector. If the error output contains a Session ID like:

```
Sorry, the app encountered a non recoverable error and will need to terminate.
Session Id: 57f79894-80fb-4f44-8c94-8f800fc13e63,
Exception Type: System.ServiceModel.CommunicationException
```

Extract the Session ID and run the following Kusto query in [PPUX Analytics](https://aka.ms/ppux-analytics) to pull all telemetry events for that session:

```kusto
EventAll
| where data_appName == "ppdevtools-pac"
| where data_clientSessionId == "<session-id-from-error>"
```

**Additional useful queries:**

Get the exact commands executed in the session:
```kusto
EventAll
| where data_appName == "ppdevtools-pac"
| where data_clientSessionId == "<session-id-from-error>"
| where data_eventModifier == "Complete"
| extend eventInfo = parse_json(data_eventInfo)
| project eventInfo.command, timestamp
```

Get all errors in the session:
```kusto
EventAll
| where data_appName == "ppdevtools-pac"
| where data_clientSessionId == "<session-id-from-error>"
| where data_eventModifier == "Failed" or data_severity >= 3
| project timestamp, data_eventName, data_eventInfo
```

**If no Session ID is present in the log:** note it and proceed — telemetry lookup not possible without it.

Print telemetry findings before continuing to Step 3.

---

## Step 3 — Search for known issues (run all in parallel)

Extract 2–3 keywords from the error.

### 3a — GitHub issues
```bash
gh search issues --repo microsoft/powerplatform-build-tools \
  --state open --limit 10 "<keyword1> <keyword2>" 2>&1
gh search issues --repo microsoft/powerplatform-build-tools \
  --state closed --limit 5 "<keyword1> <keyword2>" 2>&1
```

### 3b — Merged PRs
```bash
gh search prs --repo microsoft/powerplatform-build-tools \
  --state merged --limit 5 "<keyword1> <keyword2>" 2>&1
```

### 3c — ADO work items
```bash
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.Title] CONTAINS '<keyword1>'
  ORDER BY [System.ChangedDate] DESC
" --output json 2>&1
```

### 3d — Local knowledge base
Read `memory/ado-knowledge.md` and check `MEMORY.md` known customer issues section.

### Research summary (print before acting)
```text
Known issue match: <issue/PR/ADO ID + title, or "none">
Accepted risk: <yes — <reason>, or "no">
Fix already shipped: <yes — in PR #<n> / pac version <v>, or "no">
Recommended action: <resolve | triage | deflect | update-pac | pipeline-fix>
```

If a confirmed fix already exists in a merged PR or shipped pac CLI version, report it and stop here.

---

## Step 4 — Resolve (L1 pipeline config or L2 build-tools code)

### L1 — Pipeline configuration fix (no code change)

Produce a precise fix instruction:

```text
Pipeline fix required:
- Issue: <what's wrong>
- Fix: <exact YAML or UI step>
- Reference: <task name + parameter from Step 2 tables>
```

Common L1 fixes:
- Missing tool-installer → add `PowerPlatformToolInstaller@2` as first step
- Import timeout → add `AsyncOperation: true` and `MaxAsyncWaitTime: 60`
- Wrong environment targeted → check `BuildTools.EnvironmentUrl` side effect from create-environment
- Checker with username/password → switch service connection to SPN
- Connection references missing → add `UseDeploymentSettingsFile: true` + provide `DeploymentSettingsFile`
- GitHub Actions: timeout installing pac CLI → add `actions-install@v1` before other actions

### L2 — Build-tools code fix (this repo)

1. Read the relevant `src/tasks/<name>/index.ts` and `task.json`
2. Make the minimal fix
3. `npm run build 2>&1` — must pass
4. `npm test 2>&1` — must pass (functional test failures are expected locally — not a blocker)
5. `git commit -m "fix: <description> (#<work-item-id-if-known>)"`
6. Hand off to `/create-pr`

---

## Step 5 — Triage package (L3–L5 and non-PPBT)

### Routing table

| Layer / Signal | Route to | Contact / Repo |
|---|---|---|
| L3 — cli-wrapper arg assembly or auth arg bug | **cli-wrapper repo** | GH issue on `microsoft/powerplatform-cli-wrapper` |
| L4-pac — pac CLI crash, .NET exception in pac | **pac CLI / admin-tools** | ADO: `OneCRM\Client\UnifiedClient\AppLifeCycle\Deployment Hub\Admin` |
| L4-admin — `pac env *` or `pac admin *` failure | **admin-tools** | ADO: `OneCRM\Client\UnifiedClient\AppLifeCycle\Deployment Hub\Admin` |
| L4→L5 — `pac solution import/export/publish` + Dataverse HTTP error | **CDS / Solution Framework** | ADO: `OneCRM\CDS` (use pac team as router if area unclear) |
| L4→L5 — `pac solution check` / checker API | **Power Apps Checker service** | Route via PAC team or CDS |
| L5 — PVA component import failure | **pac CLI team** (known IcM 604312672) | ADO: `Deployment Hub\Admin` |
| L5 — pure Dataverse API error, no pac involvement | **CDS / Solution Framework** | ADO: `OneCRM\CDS` |
| Non-PPBT (Wael Hamze, XRM Tooling) | **Deflect** | Community tool — not Microsoft PPBT |
| ADO Server 2020 on-prem | **Deflect** | Not supported — cloud or Server 2022+ only |

### Triage package

**This is mandatory output for ALL L3–L5 and non-PPBT cases. You MUST produce this block — do not skip it, summarize it, or replace it with prose.**

For **non-PPBT deflects** (Wael Hamze, XRM Tooling, ADO Server 2020), fill in:
- `Route to: Deflect to CSS / community tool owner`
- `ADO area path: N/A`
- `PPBT is not the root cause because:` — cite the exact log signal that proves it (author, task class, tool name, absence of PPBT signals)

```text
═══════════════════════════════════════════════════════
TRIAGE PACKAGE
═══════════════════════════════════════════════════════
Route to:        <team name | "Deflect — community tool">
ADO area path:   <path, or N/A>
GitHub repo:     <repo, or N/A>

Issue summary:
  <2–3 sentence plain-English description of what failed and where>

Reproduction evidence:
  Platform:      <ADO | GitHub Actions>
  Task/Action:   <name + version>
  pac CLI ver:   <version from log, or unknown>
  Auth type:     <SPN | Username/Password | Workload Identity Federation>
  Environment:   <cloud / region if visible>
  Error line:    <exact log line that proves the failure>
  Timestamp:     <ISO timestamp>

PPBT is not the root cause because:
  <one sentence — e.g. "pac CLI exited with code 1 after a Dataverse HTTP 500 on the import endpoint">

Suggested next steps for the receiving team:
  1. <action>
  2. <action>

Related known issues:
  <ADO ID / GH issue / IcM, or "none found">

Log file / evidence:
  <file path, or "pasted text — see conversation">
═══════════════════════════════════════════════════════
```

---

## Step 6 — Outcome summary

Always end with a plain-English paragraph covering:
- What failed and where in the call chain
- Whether PPBT owns it
- What was done (fix applied / triage package / deflected)
- Any follow-up needed from the user

---

## Quick-reference: authentication types

| ADO `authenticationType` | GitHub secrets | pac CLI args | MFA support |
|---|---|---|---|
| `PowerPlatformSPN` (recommended) | `app-id` + `client-secret` + `tenant-id` | `--applicationId --clientSecret --tenant` | Yes |
| `PowerPlatformEnvironment` (user/pass) | `user-name` + `password-secret` | `--username --password` | No |
| Workload Identity Federation | ADO service connection only | `--azureDevOpsFederated` | Yes |
| Managed Identity | ADO service connection only | `--managedIdentity` | Yes |

## Quick-reference: task ordering rules

```
tool-installer / actions-install     ← MUST run first (sets POWERPLATFORMTOOLS_PACCLIPATH)
      │
      ├── whoAmI                     ← optional connectivity check
      │
      ├── create-environment         → sets BuildTools.EnvironmentUrl (auto-used by downstream tasks)
      │         │
      │         ├── import-solution  ← use AsyncOperation:true for large solutions
      │         ├── apply-solution-upgrade  ← only after import with HoldingSolution:true
      │         ├── export-solution
      │         ├── pack-solution / unpack-solution  (local, no connection needed)
      │         ├── publish-customizations
      │         ├── set-solution-version
      │         ├── checker          ← SPN only, no username/password
      │         └── deploy-package   ← Windows runner only (GitHub Actions)
      │
      ├── backup-environment → restore-environment
      ├── copy-environment
      └── delete-environment
```

## Quick-reference: common error → fix mapping

| Error message / symptom | Likely cause | Fix |
|---|---|---|
| `pac.exe not found` / `POWERPLATFORMTOOLS_PACCLIPATH not set` | tool-installer not run first | Add `PowerPlatformToolInstaller@2` as first pipeline step |
| Task times out at 4 minutes (import) | Sync import of large solution | Add `AsyncOperation: true` |
| `auth create failed` | Wrong credentials or cloud instance | Check service connection; verify `cloudInstance` via `resolveCloudInstance()` |
| `Cannot resolve AAD authority` | Wrong cloud / blocked AAD endpoint | Check `cloudInstance`, check network/proxy on agent |
| `WhoAmI failed` on non-English agent | cli-wrapper locale bug (ADO #4846644) | Set `LANG=en_US.UTF-8` on agent; workaround only |
| Connection references not configured | `DeploymentSettingsFile` not provided | Set `UseDeploymentSettingsFile: true` and provide settings file |
| Checker fails with username/password | Checker only supports SPN | Switch service connection to SPN |
| `deploy-package` fails on Linux | Windows-only task | Use `runs-on: windows-latest` (GitHub Actions) |
| PVA component import fails | pac CLI issue (IcM 604312672) | Update pac CLI version in `nuget.json`; escalate to pac team if persists |
| `BuildTools.EnvironmentUrl` wrong env | Create-environment side effect overriding | Explicitly set `Environment` input on subsequent tasks to override |
| Timeout installing pac (GitHub Actions) | pac CLI install race condition | Add `actions-install@v1` before other actions |
| Old v1 tasks used with v2 tasks | Cannot mix task versions | Upgrade all tasks to `@v2` |

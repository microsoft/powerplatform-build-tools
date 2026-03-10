# Architecture & Debug Guide

Use this skill to understand the codebase architecture, trace issues across repos, or debug failures.
If given a specific error or symptom, use the architecture map below to identify which layer is failing
and follow the targeted debug steps for that layer.

---

## Repo Dependency Map

```
powerplatform-build-tools  (THIS REPO — Azure DevOps Extension)
        │
        │  npm import (bundled)
        ▼
@microsoft/powerplatform-cli-wrapper  (TypeScript action library)
        │
        │  child_process.spawn()
        ▼
pac CLI binary  (pac.exe / pac — .NET, downloaded from NuGet at build time)
        │
        │  HTTPS REST
        ▼
Power Platform API  (Dataverse / crm.dynamics.com)
```

---

## Layer Responsibilities

| Layer | Owns | Does NOT own |
|-------|------|--------------|
| **build-tools** | Azure DevOps task inputs, service connections, pipeline variables, artifact upload, task.json | Power Platform logic, pac CLI args |
| **cli-wrapper** | pac CLI argument assembly, auth flow, subprocess spawn/capture | Azure DevOps APIs, pipeline variables |
| **pac CLI** | Power Platform REST APIs, auth token management, all pac command semantics | Node.js, npm, Azure DevOps |
| **Power Platform API** | Dataverse operations, solution lifecycle | Everything above |

---

## Full Call Chain (export-solution as example)

```
Azure DevOps Pipeline
  │  task inputs: SolutionName, SolutionOutputFile, authenticationType, Environment
  ▼
src/tasks/export-solution/export-solution-v2/index.ts
  ├── TaskParser.getHostParameterEntries(taskDefinitionData)
  │     └── reads task.json → Record<string, HostParameterEntry>
  ├── getCredentials()
  │     ├── tl.getInput("authenticationType")  → "PowerPlatformSPN" | "PowerPlatformEnvironment"
  │     ├── tl.getEndpointAuthorization(endpointName)
  │     └── returns AuthCredentials { appId, clientSecret, tenantId, cloudInstance }
  ├── getEnvironmentUrl()
  │     └── checks (in order): task input → pipeline variable → env var → service connection URL
  │
  └── exportSolution(params, new BuildToolsRunnerParams(), new BuildToolsHost())
        │           ↑                    ↑
        │    runnersDir from          getInput() wraps
        │    POWERPLATFORMTOOLS_      tl.getInput()
        │    PACCLIPATH env var
        ▼
cli-wrapper: src/actions/exportSolution.ts
  ├── createPacRunner(runnerParams)   → CommandRunner (spawn wrapper)
  ├── authenticateEnvironment(pac, credentials, environmentUrl)
  │     └── pac("auth", "create", "--environment", url, "--applicationId", id,
  │               "--clientSecret", base64secret, "--tenant", tenantId, "--cloud", "Public")
  ├── InputValidator.pushInput(args, "--name", params.name)       → host.getInput(entry)
  ├── InputValidator.pushInput(args, "--path", params.path, resolveFolder)
  ├── InputValidator.pushInput(args, "--managed", params.managed)
  │   ... (assembles full arg list)
  │
  ├── pac("solution", "export", "--name", "MySolution", "--path", "/out/sol.zip", ...)
  │     ▼
  │   CommandRunner.ts: child_process.spawn("pac.exe", args, { env: { PP_TOOLS_AUTOMATION_AGENT: ... } })
  │     ├── stdout lines → logger.log()   → Azure DevOps build log
  │     ├── stderr lines → logger.error() → Azure DevOps build log
  │     └── exit 0 → resolve() | exit ≠ 0 → reject(RunnerError) → task fails
  │
  └── clearAuthentication(pac)
        └── pac("auth", "clear")
```

---

## Key Files by Layer

### build-tools (this repo)
| File | Purpose |
|------|---------|
| `src/tasks/<name>/<name>-v2/index.ts` | Task entry point — reads inputs, calls cli-wrapper action |
| `src/tasks/<name>/<name>-v2/task.json` | Declares all task inputs, metadata, execution config |
| `src/host/BuildToolsHost.ts` | Implements `IHostAbstractions` — wraps `tl.getInput()`, artifact store |
| `src/host/BuildToolsRunnerParams.ts` | Implements `RunnerParameters` — pac path, logger, agent string |
| `src/host/CliLocator.ts` | Finds pac.exe/pac binary path by platform (win32 vs linux) |
| `src/params/auth/getCredentials.ts` | Extracts auth from service connection (SPN / UserPass / WorkloadIdentity) |
| `src/params/auth/getEnvironmentUrl.ts` | Resolves target environment URL (4-level fallback chain) |
| `src/parser/TaskParser.ts` | Converts task.json inputs array → `Record<string, HostParameterEntry>` |
| `extension/extension-manifest.json` | Azure DevOps extension metadata |
| `extension/task-metadata.json` | Task GUIDs per stage (LIVE / BETA / DEV / EXPERIMENTAL) |
| `extension/service-connections.json` | Power Platform SPN endpoint definition |
| `nuget.json` | pac CLI version pinned here — update to upgrade pac |
| `webpack.config.js` | Finds all task index.ts files, compiles each to dist/tasks/*/index.js |
| `gulp/pack.mjs` | Stages artifacts, injects task IDs per stage, runs tfx-cli to create VSIX |

### cli-wrapper (inside node_modules/@microsoft/powerplatform-cli-wrapper)
| File | Purpose |
|------|---------|
| `dist/actions/exportSolution.ts` | Assembles pac args, calls pac, handles auth |
| `dist/actions/importSolution.ts` | Same pattern for import |
| `dist/actions/*.ts` | One file per pac command |
| `dist/pac/createPacRunner.ts` | Resolves pac.exe path, returns `CommandRunner` |
| `dist/pac/auth/authenticate.ts` | Builds `pac auth create` / `pac auth clear` calls |
| `dist/CommandRunner.ts` | `child_process.spawn()` wrapper — stdout/stderr capture, exit code handling |
| `dist/host/InputValidator.ts` | Pulls values through `IHostAbstractions`, normalizes, pushes to arg array |

---

## Authentication Types & Environment Variable Map

| Auth Type | Service Connection Scheme | Credentials Passed to pac |
|-----------|--------------------------|--------------------------|
| Username/Password | `PowerPlatformEnvironment` | `--username` `--password` (base64) |
| Service Principal | `PowerPlatformSPN` | `--applicationId` `--clientSecret` (base64) `--tenant` |
| Managed Identity | `PowerPlatformSPN` (MSI scheme) | `--managedIdentity` |
| Workload Identity Federation | `WorkloadIdentityFederation` | `--applicationId` `--tenant` `--azureDevOpsFederated` |

**Environment variables used by tasks:**
| Variable | Set by | Used by |
|----------|--------|---------|
| `POWERPLATFORMTOOLS_PACCLIPATH` | tool-installer task | All other tasks (to find pac.exe) |
| `BuildTools.EnvironmentUrl` | create-environment task | All other tasks (fallback env URL) |
| `agent.diagnostic` | Azure DevOps agent | All tasks (enables `--log-to-console` on pac) |
| `PP_TOOLS_AUTOMATION_AGENT` | CommandRunner.ts | pac CLI (user-agent telemetry) |

---

## Bundled Dependency Notes (affects vulnerability fixes)

These packages are in `bundleDependencies` — they ship inside the VSIX and their
nested transitive deps are marked `inBundle: true` in package-lock.json.
**npm overrides cannot reach them. Lock file must be patched directly.**

| Bundled Package | Key nested dep | Known issue |
|-----------------|---------------|-------------|
| `azure-pipelines-task-lib@5.2.8` | — | No known issues (upgraded from 4.x which had minimatch@3.0.5 ReDoS) |
| `@microsoft/powerplatform-cli-wrapper@0.1.135` | `minimatch@10.x` via glob@11 | Patched to 10.2.4 in lock file |
| `fs-extra` | — | No known issues |
| `semver` | — | No known issues |

---

## Debug Runbook by Symptom

### `npm install` hangs indefinitely
**Cause:** npm re-resolves the full dependency tree when a new uncached package version is introduced.
During re-resolution it hits `npm.pkg.github.com` for `@microsoft/*` packages.
1. Check `~/.npmrc` has a valid GitHub token: `//npm.pkg.github.com/:_authToken=<token>`
2. Test auth: `curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token <token>" https://npm.pkg.github.com/@microsoft%2fpowerplatform-cli-wrapper`  → should return 200
3. Run with verbose to find where it hangs: `npm install --verbose 2>&1`
4. Check npm debug log: `cat C:/.tools/.npm/_logs/<latest>-debug-0.log | tail -100`
5. **If log shows 50,000+ `placeDep ROOT minimatch` lines** → infinite loop from a conflicting flat minimatch override. Remove it.

### `npm install` errors with registry auth
**Cause:** GitHub PAT expired or missing scopes.
1. Token needs `read:packages` scope on `github.com`
2. Token goes in `~/.npmrc` as `//npm.pkg.github.com/:_authToken=<token>`
3. The project `.npmrc` sets `@microsoft:registry=https://npm.pkg.github.com/` and `always-auth=true`

### Task fails: "pac.exe not found" or "POWERPLATFORMTOOLS_PACCLIPATH not set"
**Cause:** `tool-installer` task did not run before this task, or failed silently.
- All tasks require `tool-installer` to run first — it sets `POWERPLATFORMTOOLS_PACCLIPATH`
- Check `CliLocator.ts` for the exact path resolution logic
- On Linux: pac binary needs execute permissions — `CliLocator.ts` sets them via `chmod`

### Task fails: "auth create failed" or authentication errors
**Layer:** cli-wrapper `authenticate.ts` or pac CLI auth
1. Check service connection credentials in Azure DevOps (Pipelines → Service Connections)
2. Verify the auth type: SPN vs Username/Password vs Workload Identity
3. Check `cloudInstance` — wrong cloud (e.g. sending to `Public` when env is `UsGov`) causes auth failure
4. Check `getCredentials.ts` — `resolveCloudInstance()` maps the endpoint URL hostname to cloud name
5. Enable diagnostics: set `agent.diagnostic=true` variable in pipeline → adds `--log-to-console` to pac

### Task fails: "Solution not found" or pac CLI errors
**Layer:** pac CLI → Power Platform API
1. Enable `--log-to-console`: set `system.debug=true` in pipeline variables
2. Check the exact pac command being run in the build log (each arg is logged)
3. The error is from pac.exe — check Power Platform documentation for that specific pac command
4. Verify environment URL: `getEnvironmentUrl.ts` has a 4-level fallback — add explicit `Environment` input to the task to override

### Build fails: TypeScript errors after upgrading packages
**Layer:** build-tools compile step
1. `npm run build` → webpack + ts-loader
2. TypeScript target is ES5, module is CommonJS (`tsconfig.json`)
3. `gulp-typescript` is on `^6.0.0-alpha.1` — type errors may surface after TS version upgrades
4. cli-wrapper interface changes break at compile time here — check `IHostAbstractions` and `RunnerParameters`

### VSIX package has wrong task GUIDs / tasks conflict in marketplace
**Layer:** gulp/pack.mjs
1. Task GUIDs per stage are in `extension/task-metadata.json`
2. LIVE uses the canonical GUIDs; BETA/DEV/EXPERIMENTAL get unique GUIDs so they don't conflict
3. `pack.mjs` substitutes GUIDs at pack time — verify the substitution logic if tasks show up under wrong IDs

### Task fails: "Can't resolve AAD/OAuth authority"

**Source:** IcM recurring pattern (ADO #4863652)
**Layer:** pac CLI auth → Power Platform API

1. Usually caused by incorrect `cloudInstance` value — check `getCredentials.ts` → `resolveCloudInstance()`
2. Verify the service connection URL matches the actual cloud (Public vs USGov vs China)
3. Check if the tenant's AAD authority endpoint is reachable from the build agent (network/proxy issues)
4. Enable diagnostics: set `agent.diagnostic=true` in pipeline variables for verbose pac auth logging

### Task fails: WhoAmI error in non-English build agent context

**Source:** ADO #4846644 (long-term, no code fix yet)
**Cause:** `whoAmI.ts` in cli-wrapper parses localized pac CLI output to extract the environment ID. Fails when the build agent OS locale is non-English.
**Workaround:** Ensure build agent uses English locale (`en-US`). Set `LANG=en_US.UTF-8` on Linux agents.
**Layer:** cli-wrapper `src/actions/whoAmI.ts` ~line 40 — fix must go upstream to cli-wrapper repo.

### Import solution fails with PVA (Power Virtual Agents) components

**Source:** IcM 604312672, ADO #4896777
**Symptom:** `import-solution` task fails when solution contains PVA components.
**Layer:** pac CLI → Power Platform API (not a build-tools code issue)
**Workaround:** Check pac CLI version — update `nuget.json` to latest pac CLI. If persists, raise with PAC CLI team.

### Extension not working on Azure DevOps Server 2020 (on-prem)

**Source:** ADO #5130362
**Official stance:** Extension is **not supported** on Azure DevOps Server 2020 on-prem.
**Action:** Deflect IcM tickets. Direct customers to Azure DevOps Services (cloud) or Server 2022+.

### New pac CLI version needed
1. Update version in `nuget.json`
2. The `pac` version is also referenced in `package.json` for documentation — keep in sync
3. Run `gulp restore` (or `npm run prepare-pack`) to download the new binary to `bin/`
4. Test with `bin/pac/pac.exe --version`

### Vulnerability in a bundled dependency
**Cause:** Packages in `bundleDependencies` have `inBundle: true` in lock file. `npm audit fix` and `overrides` cannot touch them.
**Fix procedure:**
```bash
# 1. Get safe version metadata
npm view <package>@<safe-version> dist.tarball dist.integrity --json

# 2. Find the exact key in package-lock.json
#    (may be nested: node_modules/foo/node_modules/bar)
node -e "const l=require('./package-lock.json'); console.log(Object.keys(l.packages).filter(k=>k.includes('<package>')))"

# 3. Patch the lock file entry: update version, resolved URL, integrity hash

# 4. Apply
npm install
npm audit  # verify resolved
```

---

## Task Pipeline Dependency Order

```
tool-installer          ← MUST run first (sets POWERPLATFORMTOOLS_PACCLIPATH)
      │
      ├── create-environment  → sets BuildTools.EnvironmentUrl pipeline variable
      │         │
      │         ├── import-solution
      │         ├── export-solution
      │         ├── pack-solution / unpack-solution
      │         ├── publish-customizations
      │         ├── set-solution-version
      │         └── deploy-package
      │
      ├── backup-environment → restore-environment
      ├── copy-environment
      └── delete-environment
```

---

## Build Output Structure

```
npm run build
  └── webpack → dist/tasks/<task-name>/<task-name>-v2/index.js  (32 bundles)

npm run prepare-pack
  ├── webpack (above)
  └── gulp restore → bin/pac/pac.exe + bin/pac_linux/pac

npm run pack
  └── gulp pack
        ├── npm pack → out/npm-package/
        ├── stages to out/staging/ (dist/ + bin/ + extension/)
        ├── injects GUIDs from task-metadata.json (4 stages)
        └── tfx-cli → out/packages/
              ├── PowerPlatform-BuildTools-<ver>-LIVE.vsix
              ├── PowerPlatform-BuildTools-<ver>-BETA.vsix
              ├── PowerPlatform-BuildTools-<ver>-DEV.vsix
              └── PowerPlatform-BuildTools-<ver>-EXPERIMENTAL.vsix
```

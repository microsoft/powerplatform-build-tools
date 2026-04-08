---
name: knowledge-sync
description: Sync ADO work items and ICM incidents to the persistent knowledge log. Invoked automatically by /review, /workitem, and /pac-cli-update when knowledge is stale.
allowed-tools: Read, Write, Glob, Grep, Bash
user-invocable: true
---

# Knowledge Sync — ADO Work Items + ICM Incidents

Reads ADO work items and ICM incidents for the PPBT area, extracts patterns and fixes,
and **appends** them to a persistent knowledge log. Each run only fetches items newer than
the last sync — knowledge accumulates over time rather than being overwritten.

Invoke as: `/knowledge-sync`

Also invoked automatically (inline) by `/review`, `/workitem`, and `/fix-dependencies`
when the knowledge base is more than 7 days old. No manual scheduling needed.

---

## How the knowledge base works

All persistent knowledge lives in two files in the memory directory:

- `memory/ado-knowledge.md` — append-only log of every work item and incident processed,
  grouped by run date. Never overwrite — only append new entries.
- `memory/MEMORY.md` — the live distilled summary: hard rules, patterns, and skill inventory.
  Update this with confirmed facts extracted from `ado-knowledge.md`.

The sync tracks progress via a `## Last sync` header in `ado-knowledge.md`. Each run reads
that date, queries only items changed **after** that date, appends new findings, then updates
the header. On the very first run (no `ado-knowledge.md` exists), query the past 90 days as
the bootstrap window.

---

## Step 1 — Read last sync date

```bash
# Check if knowledge log exists and find last sync date
cat memory/ado-knowledge.md 2>/dev/null | grep "## Last sync" | tail -1
```

- If found: use that date as `@since` in WIQL queries below
- If not found: use `@Today - 90` as `@since` (first-run bootstrap)

---

## Step 2 — Configure ADO org (once per session)

```bash
az devops configure \
  --defaults organization=https://dev.azure.com/dynamicscrm project=OneCRM 2>&1

az devops configure --list 2>&1
```

If `az login` is needed (browser flow — no username/password):

```bash
az login --use-device-code
```

---

## Step 3 — Query ADO for items changed since last sync

```bash
# Active items (all — re-read on every sync to catch state changes)
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
         [System.Tags], [Microsoft.VSTS.Common.Priority], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.State] NOT IN ('Closed', 'Resolved', 'Done')
  ORDER BY [Microsoft.VSTS.Common.Priority] ASC, [System.ChangedDate] DESC
" --output json 2>&1

# Items resolved/closed since last sync (only NEW ones)
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType],
         [System.Tags], [Microsoft.VSTS.Common.Resolution], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.State] IN ('Closed', 'Resolved', 'Done')
    AND [System.ChangedDate] > '<last-sync-date>'
  ORDER BY [System.ChangedDate] DESC
" --output json 2>&1
```

For each returned item, fetch full detail (description, repro steps, resolution, comments).
Cap at 30 full-detail fetches per run — summarise the rest by title + state only:

```bash
az boards work-item show --id <id> --output json 2>&1
```

---

## Step 4 — Query ICM incidents

```bash
# Check if icm CLI is available
icm --version 2>&1 || echo "icm CLI not available — falling back to ADO cross-references"

# If available
icm query \
  --owning-service "Power Platform Build Tools" \
  --status "Active,Resolved" \
  --modified-after "<last-sync-date>" \
  --top 50 \
  --output json 2>&1

# Fallback: find IcM references in ADO work items
az boards query --wiql "
  SELECT [System.Id], [System.Title], [System.Description], [System.ChangedDate]
  FROM WorkItems
  WHERE [System.AreaPath] UNDER 'OneCRM\Client\UnifiedClient\AppLifeCycle\PPBT Extensions'
    AND [System.Description] CONTAINS 'IcM'
    AND [System.ChangedDate] > '<last-sync-date>'
  ORDER BY [System.ChangedDate] DESC
" --output json 2>&1
```

---

## Step 5 — Classify findings

For each new item, assign one or more categories:

| Category | Where it goes |
| -------- | ------------- |
| Recurring bug / root cause | `ado-knowledge.md` log + `skills/architecture/SKILL.md` debug runbook |
| Known workaround | `ado-knowledge.md` log + `skills/architecture/SKILL.md` debug runbook |
| Architecture decision | `ado-knowledge.md` log + `skills/architecture/SKILL.md` layer notes |
| Dependency conflict / vuln pattern | `ado-knowledge.md` log + `skills/fix-dependencies/SKILL.md` hard rules |
| Task contract change (input name, GUID) | `ado-knowledge.md` log + `skills/pr/SKILL.md` review checklist |
| ICM mitigation / guidance | `ado-knowledge.md` log + `skills/architecture/SKILL.md` debug runbook |

Only add facts explicitly stated in resolutions or ICM mitigations — no speculation.

---

## Step 6 — Append to `memory/ado-knowledge.md`

Append a new dated section. Never delete or overwrite previous sections.

```markdown
## Sync <YYYY-MM-DD>
**Last sync:** <YYYY-MM-DD>

### Active items (<N> total)
- <ID>: <title> [<priority>] [<type>]
- ...

### Newly resolved since last sync (<N> items)

#### <ID> — <title>
- **Type:** Bug / Task / Feature
- **Resolution:** <verbatim resolution text>
- **Root cause:** <extracted from description>
- **Fix:** <what was changed>
- **Category:** <from classification above>

### ICM incidents
- <IcM-ID>: <title> — <mitigation summary>

### Patterns extracted this run
- <any new hard rule, workaround, or architecture fact>
```

---

## Step 7 — Update skills with new confirmed facts

Update only files where new facts apply. Skip files with no relevant new findings.

### `skills/architecture/SKILL.md`

- Append to **Debug Runbook by Symptom** for any new recurring issue with a confirmed fix
- Update auth table or bundled dep notes if changed

### `skills/fix-dependencies/SKILL.md`

- Add new package conflict patterns to Strategy A hard rules
- Add new formally risk-accepted vulnerabilities to the known accepted risks list

### `skills/pr/SKILL.md`

- Add to review checklist any new breaking-change patterns from resolved work items

### `skills/workitem/SKILL.md`

- Add recurring fix patterns so future similar work items resolve faster

### `memory/MEMORY.md`

- Update the **Key architecture facts** and **Dependency hard rules** sections with any new confirmed facts
- Do NOT add speculation — only confirmed fixes from resolved items

---

## Step 8 — Update last sync date

After all appends and skill updates are complete, update the `## Last sync` line at the top of `ado-knowledge.md`:

```bash
# The sync date is updated by the append in Step 6 — confirm it is correct
grep "## Last sync" memory/ado-knowledge.md | tail -1
```

---

## Final report

Print:

1. **Sync window:** `<last-sync-date>` → `<today>`
2. **Items processed:** N active, N newly resolved, N ICM incidents
3. **New facts extracted:** list each pattern/rule added
4. **Skills updated:** list each file and what section changed
5. **Nothing changed:** if no new items found since last sync, say so and exit cleanly

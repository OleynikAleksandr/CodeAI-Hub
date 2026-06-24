# Capture Workbench UI — Architecture

**Status:** Draft rev4 (UI vehicle planning-doc, child of Provider Native Request Capture Workbench)
**Created:** 2026-05-02
**Updated:** 2026-05-02 — rev2 закрыл review comments: reasoning transport ownership (§5), snapshot storage as UI-side index over immutable artifacts (§3), removed-provider disabled-placeholder UX (§2.1), explicit captured-artifact schema (§4), Open Questions 1-3 promoted to fixed decisions. rev3 закрыл follow-up review: Core-owned `workbench:state:*` transport for index + sticky selection (§3), index rebuild from `capture_start` JSONL records instead of filename parsing plus explicit `mode` field on `capture_start` (§3, §5.2), `Provider-home / Auth` section deferred to parent Phase 4 (§4.2). rev4 закрыл follow-up review: single canonical home `~/.codeai-hub/settings/` for both `workbench-index.json` and `capture-workbench.json` (§3), strict `SlotEntryRecord` schema (`markdownPath`, `jsonlPath`, `artifactId`, `capturedAt`, `releaseVersion`) shared by UI/persistence/rebuild (§3), migration summary lists all four Phase 1 extensions explicitly (§6).
**Owner:** Oleksandr + Codex
**Scope:** UX shell, snapshot storage layout, semantic diff contract, and Phase 1 MVP migration plan for the detached `Capture Workbench` window. The transport, capture-and-abort proxy, provider adapters, and Vanilla bridge contracts remain owned by the parent plan.

**Parent plan:** `Plans/Backlog/Provider_Native_Request_Capture_Workbench_Architecture.md` (rev5). This document is the UI specification referenced by parent §3.3 and Phase 3.
**Supersession note:** child rev2 explicitly supersedes parent §3.4 run-history-list framing and parent §3.5 "all three providers in the first iteration" wording for Phase 1 only. Parent rev5 carries matching forward-pointers in those sections. For any disagreement on Phase 1 UI scope, the child plan wins; for the underlying transport, capture-and-abort proxy, provider adapters, Vanilla bridge, and parent Phase boundaries, the parent plan remains authoritative.
**Prototype:** `doc/tmp/prototypes/capture-workbench.html` (rev2, approved).

---

## 1. Product Goal

The Workbench is a **focused tuning surface for a single agent invocation** — one workflow step, one provider, one model, one reasoning level at a time. It is not a multi-provider monitoring dashboard. The user picks a combination, captures the Vanilla baseline (rare), captures the Managed snapshot (often), reads a semantic diff, discusses changes with the assistant, the assistant edits the code-owned instructions, the user rebuilds and re-captures Managed to validate the change.

Over time the Step selector grows to cover Development Tree branch agents (Product Part / Cluster / Module specifications), so the UI must scale to a long, structured list of steps without becoming wider.

---

## 2. UX Model

### 2.1 Selection bar (single row, sticky)

Four inline button-dropdowns:

- **Step** — flat list grouped by section: `Trunk Workflow` (Description / Virtual Simulation / Diagram Modules), `Translation`, `Development Tree (future, disabled placeholders)`. Long lists must support filter/search before Development Tree lands.
- **Provider** — Claude / Codex enabled in Phase 1. Removed-provider placeholders are not rendered; adding another provider requires a fresh planning/todo cycle and a live provider module. Phase 1 capture transport (`NativeRequestCaptureProviderId = "claude" | "codex"`) is unchanged. Tinted with active provider corporate tokens (warm peach / cyan).
- **Model** — provider-specific list (Claude aliases / Codex models).
- **Reasoning** — provider-specific level (`thinking off|low|medium|high|xhigh|max` for Claude; `low|medium|high` for Codex). See §5.1 for the Phase 1 transport contract — the selector is sticky and folder-keying, but the actual reasoning value applied to the capture is resolved Core-side from persisted settings until the transport is extended.

Selection is **sticky between sessions** — last picked combination persists across reopen and restart, because the loop is iterative. Default on first launch: `Description + Claude + Sonnet + thinking high`.

### 2.2 Snapshot cards (two cards side-by-side)

For the active combination the UI renders two cards: **Vanilla snapshot** (amber accent) and **Managed snapshot** (green accent). Each card shows:

- mode label and short tag (`SDK defaults · no overrides` / `workflow + applied turn config`);
- current capture metadata: timestamp, release version, request size;
- previous capture metadata (one entry, with `open prev` action);
- file action buttons: `vanilla.md` / `vanilla.jsonl` / `managed.md` / `managed.jsonl` open the actual file directly in VS Code via the host bridge;
- a single `Re-capture Vanilla` / `Re-capture Managed` button.

If a snapshot has never been captured for the combination, the card shows an empty state with the same `Re-capture` button as the only action.

### 2.3 Diff area (main surface)

Three diff modes via a tab strip:

- **Managed vs Vanilla** (default) — shows what the managed pipeline adds on top of the bare SDK call.
- **Managed: current vs previous** — shows what changed in our overrides between two captures (typical post-rebuild verification).
- **Vanilla: current vs previous** — rare, used when the SDK or the model itself shipped a change.

For each mode the toolbar prints the resolved comparison line (`Managed · 2026-05-02 14:32 · v1.2.123` vs `Vanilla · 2026-04-28 11:14 · v1.2.118`) and a summary (`5 changed · 2 added · 0 removed · 4 equal`).

The diff is **semantic by section**, not line-by-line over the whole file. Sections are a fixed taxonomy resolved per provider from the captured `.jsonl` payload:

- System Prompt
- Tools (enabled tool list and their declarations)
- Settings Sources / SDK isolation flags
- User Prompt (workflow body)
- Model & Reasoning
- Permission & Approval
- Provider-home / Auth
- Endpoint
- Project Doc Reference / Workflow context lines
- Output Schema

Each section row has a colored dot (added / removed / changed / equal), title, status string. Equal sections are collapsed to a one-line row by default. Expanded sections show a two-pane side-by-side body with `+/−` line highlights and the version stamp on each side.

Toolbar provides `Collapse all equal` / `Expand all` actions and a legend.

### 2.4 Header & footer

Header carries the workbench title, current workspace slug, and two utility actions: `Open Snapshots Folder` and `Help`.

Footer carries Core bridge status, the active combination's snapshot directory path (with the dynamic part highlighted), and the prototype/build revision tag.

---

## 3. Storage Model — UI-side Index over Immutable Artifacts

The parent plan §3.4 owns the underlying capture writer and its naming contract: the writer emits **immutable timestamped artifacts** keyed by correlation id (`<timestamp>-<provider>-<scenario>-<correlation>-managed.{jsonl,md}` / `-vanilla.{jsonl,md}`) into one flat directory `~/.codeai-hub/logs/native-request-capture/`. This stays unchanged. The Workbench does not rename, move, mutate, or overwrite captured artifacts.

The Workbench `current + previous` model is implemented as an **index file living next to the persistence handler**, not in the logs directory. Two canonical files under `~/.codeai-hub/settings/`:

- `~/.codeai-hub/settings/workbench-index.json` — UI-owned slot index, points at absolute paths inside the logs directory.
- `~/.codeai-hub/settings/capture-workbench.json` — sticky selection (separate concern, separate file).

```
~/.codeai-hub/
├── settings/
│   ├── workbench-index.json                                              # UI-owned slot index
│   └── capture-workbench.json                                            # sticky selection
└── logs/native-request-capture/
    ├── 2026-05-02T14-32-08-claude-description-a3f8b2-managed.{md,jsonl}  # writer-owned
    ├── 2026-05-02T11-08-45-claude-description-91d20c-managed.{md,jsonl}  # writer-owned
    └── …
```

`workbench-index.json` is a flat list of slot entries. Each slot's `managed` and `vanilla` carry typed `current` and `previous` records (or `null`) with absolute artifact paths verbatim — no stem reconstruction at any callsite:

```jsonc
{
  "version": 1,
  "slots": [
    {
      "step": "description",
      "provider": "claude",
      "model": "sonnet",
      "reasoning": "thinking-high",
      "managed": {
        "current":  { "markdownPath": "/Users/.../logs/native-request-capture/2026-05-02T14-32-08-claude-description-a3f8b2-managed.md",  "jsonlPath": "/Users/.../2026-05-02T14-32-08-claude-description-a3f8b2-managed.jsonl",  "artifactId": "2026-05-02T14-32-08-claude-description-a3f8b2-managed", "capturedAt": "2026-05-02T14:32:08.000Z", "releaseVersion": "1.2.123" },
        "previous": { "markdownPath": "/Users/.../logs/native-request-capture/2026-05-02T11-08-45-claude-description-91d20c-managed.md", "jsonlPath": "/Users/.../2026-05-02T11-08-45-claude-description-91d20c-managed.jsonl", "artifactId": "2026-05-02T11-08-45-claude-description-91d20c-managed", "capturedAt": "2026-05-02T11:08:45.000Z", "releaseVersion": "1.2.123" }
      },
      "vanilla": { "current": null, "previous": null }
    }
  ]
}
```

The `SlotEntryRecord` shape (`{ markdownPath, jsonlPath, artifactId, capturedAt, releaseVersion }`) is the strict TS type shared by UI consumers, persistence validator, capture-result merge logic, and lazy rebuild output. UI file-open buttons read `markdownPath` / `jsonlPath` directly; the diff panel header reads `capturedAt` and `releaseVersion`; `artifactId` is used only by rebuild to deduplicate when the same artifact is observed twice during scan.

Backend ownership: `workbench-index.json` and the sticky-selection state file are **filesystem-owned by Core**, not by PM/CEF. Browser-side code cannot write to home directory. Phase 1 introduces one Core-owned remote-bridge persistence pair shared by both files:

- `workbench:state:load` request → `workbench:state:loaded` event with `{ kind: "index" | "selection", payload: ... | null }`.
- `workbench:state:save` request with `{ kind: "index" | "selection", payload: ... }` → `workbench:state:saved` event with `{ kind, ok: true }` or `workbench:state:save-error` with `{ kind, error }`.

The handler lives in `packages/core/src/remote-bridge/handlers/` next to the existing settings persistence cluster, reuses `mkdir + writeFile` from `node:fs/promises` (same primitives as `settings-persistence-snapshot.ts:403`), serializes both files under one canonical directory `~/.codeai-hub/settings/` (`kind: "index"` → `workbench-index.json`, `kind: "selection"` → `capture-workbench.json`), and validates payload shape via `incoming-message-validator.ts`. The logs directory `~/.codeai-hub/logs/native-request-capture/` continues to hold only writer-owned immutable artifacts; no UI-owned state lives there. The Settings save/reset/load flow is not touched. PM-side runner and Workbench UI consume this transport through the same websocket bridge as other PM commands.

Slot resolution:
- The Workbench identifies the active slot by the four selector values (`step + provider + model + reasoning`) and reads/writes the matching entry in `workbench-index.json` via the persistence transport above.
- `Re-capture Managed` runs the existing capture transport (which produces a fresh timestamped artifact pair via the parent writer). The capture result already returns absolute `markdownPath` and `jsonlPath` to the caller; the Workbench builds a `SlotEntryRecord` from those paths plus `capturedAt` (the capture timestamp) and `releaseVersion` (taken from the `capture_start` record per §4.1) and stores it verbatim. After the result arrives, the slot's `managed.previous` is replaced by the previous `managed.current`, and `managed.current` is replaced by the new record. **The artifacts on disk are not renamed or deleted.**
- `previous` retention is two generations as user-visible state. Older artifact pairs remain on disk under their original timestamped names; pruning is out of scope for this plan and remains owned by whatever retention policy the parent plan eventually chooses.
- File open buttons in the UI forward `markdownPath` / `jsonlPath` from the slot entry to the PM host bridge `openProjectManagerFileLink()` (no path reconstruction at the callsite).
- If `workbench-index.json` is missing or corrupted, the Workbench rebuilds it lazily by **scanning `capture_start` JSONL records**, not by parsing filenames. Each artifact pair's `.jsonl` first line is `{ "type": "capture_start", "appliedTurnConfig": {...}, "scenarioMetadata": {...}, "releaseVersion": "...", "mode": "managed" | "vanilla" }`; the rebuild reads `appliedTurnConfig.providerId`, `appliedTurnConfig.modelId`, `appliedTurnConfig.reasoning`, `scenarioMetadata.scenarioId`, and the explicit `mode` field to assign each pair to its slot, then materializes a `SlotEntryRecord` per pair using the pair's absolute paths and `capture_start` timestamp/release. The current writer artifact stem (`${timestamp}-${providerId}-native-request`) does not encode scenario/mode/correlation in the filename, so filename parsing is explicitly **not** the rebuild path. Phase 1 does not migrate the writer's filename contract.

Reasoning slug normalization for slot keys (UI-side only, never reaches the writer):
- Claude: `thinking-off|thinking-low|thinking-medium|thinking-high|thinking-xhigh|thinking-max`
- Codex: `reasoning-low|reasoning-medium|reasoning-high`

Release version stamping is **writer-owned** (see §4) — the Workbench reads it from the artifact's `capture_start` record, not from the `.md` filename or frontmatter that the Workbench itself writes.

---

## 4. Captured Artifact Schema and Semantic Diff Contract

### 4.1 Two-layer artifact schema

The diff exists because a captured artifact contains **two layers**, separately addressable:

1. **Wire payload** — the actual upstream HTTP/WebSocket request body that the proxy intercepted. For Claude this is the `POST /v1/messages` JSON (`system`, `tools`, `messages`, `model`, `thinking`, `metadata`). For Codex this is the WebSocket `turn/start` frame (`instructions`, `input`, `tools`, `model`, `reasoning`). This is what the upstream provider would have processed.
2. **Applied input envelope** — the bridge-side options the provider adapter passed *into* its SDK/process before the SDK constructed the wire payload. For Claude these are SDK `query(...)` options (`settingSources`, `permissionMode`, `cwd`, `pathToClaudeCodeExecutable`, env). For Codex these are App Server startup flags, `processProfileKey`, `approvalPolicy`, `sandbox`, `persistExtendedHistory`, and provider-home overrides. These do **not** appear in the wire payload — they shape it.

Today's writer (`packages/core/src/provider-network-capture/native-request-capture-writer.ts`) already records `capture_start` with `appliedTurnConfig` and `scenarioMetadata`, plus the raw provider request frames. The Workbench Phase 1 requires **one explicit `applied_input_envelope` record** per capture, but the data needed for that record does not live in the writer — it is constructed inside provider diagnostic services. Specifically:

- Claude builds its SDK `query(...)` options locally in `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts` (`settingSources: []`, `permissionMode: "bypassPermissions"`, `systemPrompt`, `tools`, `cwd`).
- Codex resolves `processProfileKey` plus `approvalPolicy`, `sandbox`, `persistExtendedHistory` inside `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` (the resolved values are then handed off to the App Server process factory, but they are not present in the `turn/start` wire frame).

The writer cannot derive these values on its own. The implementation scope is therefore **provider-service-side + writer/schema-side**, not writer-only:

1. Extend the writer's `appendCaptureRecord` API and provider-facing helper signature so each provider diagnostic service can hand it a typed `applied_input_envelope` payload at capture time.
2. Extend each provider diagnostic service (`claude-native-request-capture-service.ts`, `codex-native-request-capture-service.ts`) so that, right before it invokes the SDK / process, it serializes its applied options into the envelope and forwards them to the writer. Existing service tests gain a new assertion on the emitted envelope shape.
3. Add the corresponding TS types in `packages/core/src/provider-network-capture/native-request-capture-types.ts` (or wherever the `kind`-tagged record union currently lives — verify before slicing).
4. Markdown summarizer (`native-request-capture-markdown.ts`) gains a small section that prints the envelope fields under a fixed heading so the `.md` artifact stays readable without the JSONL.

Provider-specific envelope shape:

- **Claude:** `{ kind: "applied_input_envelope", provider: "claude", queryOptions: { model, thinking, settingSources, permissionMode, cwd, allowDangerouslySkipPermissions, hasSystemPrompt, toolCount } }` (full system text and tool definitions stay in the wire payload — the envelope only mirrors the SDK control surface).
- **Codex:** `{ kind: "applied_input_envelope", provider: "codex", processProfileKey, approvalPolicy, sandbox, persistExtendedHistory, providerHomeOverrides, modelReasoningSummary }`.

This whole bundle (writer schema + provider services + types + markdown summarizer + tests) is a **pre-Phase-1 blocker for the Workbench** and lands as the first stream of the upcoming todo-plan, before any Workbench UI work. Without `applied_input_envelope` the diff cannot show isolation flags, sandbox/approval overrides, or processProfile differences, which are precisely the contracts that distinguish Managed from Vanilla.

Release version (`semver` from `package.json` at capture time) is added to the same `capture_start` record as `releaseVersion: string` so the Workbench reads it from one canonical place.

### 4.2 Diff section taxonomy

Sections are a fixed UI-side taxonomy resolved per provider from the two layers:

- **System Prompt** — wire payload (`system` for Claude, `instructions` for Codex).
- **Tools** — wire payload (`tools[]`).
- **User Prompt (workflow body)** — wire payload (`messages[]` for Claude, `input` for Codex).
- **Model & Reasoning** — wire payload (`model`, `thinking` / `reasoning`).
- **Output Schema** — wire payload (`response_format` / `output_schema` if present).
- **Endpoint** — derived from request URL captured by proxy.
- **SDK Isolation (Claude)** — applied input envelope (`settingSources`, `permissionMode`, `allowDangerouslySkipPermissions`, `hasSystemPrompt`, `toolCount` cross-checked against wire `tools[].length`).
- **Process Profile / Sandbox (Codex)** — applied input envelope (`processProfileKey`, `approvalPolicy`, `sandbox`, `persistExtendedHistory`, `modelReasoningSummary`).
- **Project Doc Reference / Workflow context** — derived from `scenarioMetadata` (scenario id, target path, prompt source, `[artifact not present in workspace]` marker).

Phase 1 ships these sections for Claude and Codex. Section rows that have no data (e.g. Codex `Process Profile` for a Claude snapshot) are not rendered for that provider.

**Provider-home / Auth section deferred.** The previous prototype sketched a `Provider-home / Auth` row, but the data needed for it (the resolved `~/.codeai-hub/providers/<id>/home` path and a redacted summary of credential filenames) is not present in `appliedTurnConfig` today and not added by §4.1 either. Adding it requires a redaction contract (filenames yes, credentials no) plus a new envelope field per provider, which is closer to Vanilla territory because the diff between Managed and Vanilla provider-home setup only matters once Vanilla exists. Phase 1 does not render the section. It re-enters the taxonomy in parent Phase 4, when Vanilla bridge work also defines the redacted summary shape.

A section is `equal` if the normalized content matches byte-for-byte. `added` means present only in the right-side snapshot, `removed` only in the left, `changed` when both exist but differ. The renderer collapses `equal` sections by default to keep the typical `Managed vs Vanilla` view scannable on a single screen.

Translation scenario quirk: when `step = Translation`, the `User Prompt (workflow body)` section is always `equal` (fixed sample), and the diff focus shifts to `System Prompt`, `Tools`, `Process Profile / Sandbox`. No UI special case is needed — the section taxonomy already covers it.

---

## 5. Phase 1 MVP Scope

Phase 1 ships the Workbench shell as a **drop-in replacement** for the current `Provider Native Request Capture` card in Settings → General, with **only Managed capture wired up**. Vanilla capture is deferred to parent Phase 4; removed-provider support is withdrawn from this backlog.

### 5.1 Reasoning selector transport ownership (Phase 1 decision)

The current transport (`packages/core/src/remote-bridge/types.ts`, `settings:native-request-capture` payload) carries `providerId`, `modelId`, `scenarioId`, and scenario prompt fields. **It does not carry `reasoning` / `thinking`** — Core resolves those from the persisted Settings snapshot through `resolveAppliedTurnConfig`. Phase 1 closes this gap **inside Phase 1 scope**, not as deferred work, because diff-by-reasoning requires per-reasoning artifacts:

- Extend the transport payload with `reasoning?: string | null` (Claude `thinking off|low|medium|high|xhigh|max`; Codex `low|medium|high`).
- Extend the Core facade input (`NativeRequestCaptureCommand`) and the applied-turn-config resolver so that, when the payload supplies an explicit reasoning value, it overrides the persisted Settings snapshot for the duration of the capture only. Persisted settings are never written.
- Extend the existing `ProviderNativeRequestCaptureAppliedTurnConfig` type so the override is observable in `applied_input_envelope` and `capture_start` records.
- Extend incoming-message validators and tests in lockstep.

If this transport extension proves bigger than expected during todo-plan slicing, the fallback is to **disable the Reasoning selector in Phase 1** (read-only display of the persisted Settings value) and ship reasoning override as the first follow-up. Sticky-folder-keying without override would silently mislead users — that path is explicitly rejected.

### 5.2 In scope

- Detached CEF popup at `?mode=detached-capture` (parent §3.3); Settings → General card collapses to one launcher button `Open Capture Workbench`.
- Selection bar with Step / Provider / Model / Reasoning dropdowns; sticky last selection persisted in `~/.codeai-hub/settings/capture-workbench.json` via the Core-owned `workbench:state:load` / `workbench:state:save` transport defined in §3 (separate file, out of band of canonical `settings.json`, so Settings save/reset/load paths are untouched).
- Snapshot cards for Managed only. Vanilla card is rendered with the `Re-capture Vanilla` button disabled and a tooltip `Vanilla baseline arrives with parent Phase 4`. Vanilla file action buttons render as empty placeholders.
- UI-side index over immutable artifacts per §3 (`workbench-index.json`, two-generation slot rotation).
- File open: clicking `managed.md` / `managed.jsonl` reuses the existing PM-side host bridge `openProjectManagerFileLink()` from `src/client/project-manager/services/project-manager-file-link-opener.ts`, which already posts `pm:file-link:open` to the webview bridge, falls back to launcher `openInVsCodeFile`, and finally to `vscode://file` URI handoff. This is a host-side UI action and must **not** introduce a new Core remote-bridge intent.
- Diff panel with the **`Managed: current vs previous`** mode wired up first; the `Managed vs Vanilla` and `Vanilla: current vs previous` modes render an empty-state placeholder until Vanilla is implemented in parent Phase 4.
- Semantic section extractor for Claude and Codex over the two-layer schema in §4.1.
- Writer additions per §4.1: `applied_input_envelope` record for Claude and Codex, `releaseVersion` field on `capture_start`, plus an explicit `mode: "managed" | "vanilla"` field on `capture_start` so the lazy index rebuild can identify the artifact mode without filename parsing (Phase 1 always emits `mode: "managed"`; Vanilla wires the same field in parent Phase 4). These are the **first stream** of the upcoming todo-plan because the diff and the index rebuild cannot ship without them.
- Core remote-bridge persistence transport per §3: `workbench:state:load` / `workbench:state:save` / `workbench:state:loaded` / `workbench:state:saved` / `workbench:state:save-error`. Lands as a stream after the writer additions and before any UI work that depends on persisted index/selection.
- Reasoning transport extension per §5.1.
- Re-use of the existing PM-side `bypassUpstreamGuard` flag from release `1.2.123` so the Workbench keeps working on empty workspaces.
- Removed-provider placeholder is not rendered per §2.1.

### 5.3 Out of scope (deferred to other phases)

- **Vanilla capture** — parent Phase 4 (requires the pre-flight spike from parent §4 Phase 4).
- **Additional provider support** — requires a live provider module plus fresh planning/todo slicing; removed-provider support is not a deferred implementation path.
- **Development Tree steps** — disabled placeholders only; activation depends on the Development Tree feature itself landing.
- **Search/filter in Step dropdown** — added when the step list grows past ~10 entries.
- **Code reference navigation** ("open the file that defines this Managed system prompt"). Out of scope for now; the assistant edits code based on the diff conversation, not via a UI navigator.
- **Editable envelope** — explicitly out of scope per parent §2.
- **Index pruning / artifact retention policy** — the Workbench tracks two generations per slot but does not delete older artifacts on disk; retention policy stays parent-owned.

### 5.4 Pre-flight prerequisites

Before Phase 1 implementation, the parent §4 Phase 3 pre-flight spike for **detached transport & localization bootstrap** must complete and append §3.7 to the parent plan. Without that spike, the detached window cannot reliably reach Core for capture commands. This planning-doc does not duplicate the spike scope.

---

## 6. Migration Path from the Existing Card

The current Settings → General `Provider Native Request Capture` card already implements: Claude/Codex provider selection, model selection, scenario selection, the Managed capture button, status surface, and artifact path display. The migration is additive — the Workbench **reuses the same capture path** (`settings:native-request-capture` → Core facade → `captureNativeRequest` → provider diagnostic services → writer) but adds the four Phase 1 streams enumerated in §5.2 in full:

1. Transport: `reasoning?: string | null` override on the `settings:native-request-capture` payload, threaded through Core command and applied-config resolver (§5.1).
2. Writer + provider services: `applied_input_envelope` record per provider plus `releaseVersion` and explicit `mode: "managed" | "vanilla"` fields on `capture_start` (§4.1).
3. Core persistence transport: `workbench:state:load` / `workbench:state:save` / `workbench:state:loaded` / `workbench:state:saved` / `workbench:state:save-error` for `workbench-index.json` and `capture-workbench.json` (§3, §5.2).
4. Parent §4 Phase 3 spike (detached transport + localization bootstrap) closed in parent plan before Phase 1 implementation starts.

Beyond these four streams the underlying capture path is unchanged.

- Reuse the existing capture path; do not duplicate the runner, the facade, the proxy, the writer, or the provider diagnostic services.
- Replace the multi-row "all-providers-on-one-card" layout with the single-row selection bar.
- Replace the single capture button + paragraph status with the snapshot card model (timestamp, version, file links, re-capture button).
- Add the diff panel as a new surface. The Settings card never had one.
- Settings → General card itself shrinks to a launcher button + one-line description; no functional capture controls remain there.

Existing tests for the PM-side scenario prompt resolver and the runner stay valid (`bypassUpstreamGuard` contract is unchanged). New tests cover: the reasoning-override transport extension (§5.1), the `applied_input_envelope` shape per provider plus the new `releaseVersion` and `mode` fields on `capture_start` (§4.1), the `SlotEntryRecord` schema (`{ markdownPath, jsonlPath, artifactId, capturedAt, releaseVersion }`) and `workbench-index.json` slot rotation (current → previous, §3), the `workbench:state:*` Core persistence handler and validator (§3), lazy index rebuild from `capture_start` JSONL records (§3), section extractor for Claude and Codex over the two-layer schema (§4), sticky selection persistence, and the launcher button reaching the detached window.

---

## 7. Open Questions (resolve during Phase 1 implementation)

1. **Translation card layout** — when `step = Translation`, the User Prompt section is fixed sample; consider whether the snapshot card should show a small `fixed sample` badge to set expectations, or leave it identical to other steps.
2. **Empty-state UX for combinations never captured** — both snapshot cards empty, diff panel shows a single CTA `Capture Managed first`. Validate the wording with the user during Phase 1 implementation.
3. **Reasoning override fallback path** — if §5.1 transport extension blows past the 3-files-per-microtask budget during todo-plan slicing, fall back to a read-only Reasoning display tied to persisted Settings, and split the override into a follow-up cycle. Decision point sits at the start of the todo-plan, not at runtime.

Decisions previously logged here as Open Questions 1-3 (sticky persistence file path, `open in VS Code` bridge intent, release version stamping) are now fixed in §5.2 and §4.1.

---

## 8. References

- `doc/tmp/prototypes/capture-workbench.html` — approved UI prototype rev2 (this plan's visual contract).
- `doc/SolidWorks-WorkFlow/Plans/Backlog/Provider_Native_Request_Capture_Workbench_Architecture.md` — parent plan; §2 Product Goal, §3.3 Detached UI, §3.4 Paired artifacts, §3.6 Translation contract, §4 Phase boundaries.
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §33 — Settings ownership invariant; Workbench is **not** Settings (no save/reset/persistence path), so it does not violate the §33 detached-settings precedent.
- `src/client/ui/src/components/settings/native-request-capture-card.tsx` — current card to be shrunk to launcher.
- `src/client/project-manager/services/native-request-capture-scenario-prompt.ts` — existing `bypassUpstreamGuard` contract from release `1.2.123`.
- `src/client/project-manager/components/settings/native-request-capture-runner.ts` — existing runner that the new Workbench must reuse, not duplicate.
- `src/client/project-manager/services/project-manager-file-link-opener.ts` — PM host-side file opener (`pm:file-link:open` → launcher `openInVsCodeFile` → `vscode://file` fallback) that the Workbench file-link buttons reuse.
- `packages/core/src/provider-network-capture/native-request-capture-facade.ts` — Core entry; transport payload gains `reasoning?: string | null` per §5.1; the rest of the capture path is reused as-is.
- `packages/core/src/provider-network-capture/native-request-capture-writer.ts` — writer; gains `applied_input_envelope` record handling and `releaseVersion` field per §4.1.
- `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts` — Claude diagnostic service; gains `applied_input_envelope` emission per §4.1.
- `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts` — Codex diagnostic service; gains `applied_input_envelope` emission per §4.1.
- `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts` — pattern for the new Core-owned `workbench:state:*` persistence handler per §3 (same `mkdir` + `writeFile` primitives, separate transport intent, separate JSON file under `~/.codeai-hub/settings/`).
- `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts` — gains validators for the four new `workbench:state:*` payload shapes.
- `src/client/project-manager/components/diagram-editor/detached-diagram-view.tsx` — pattern for `?mode=detached-*` entry; reuse for `?mode=detached-capture`.

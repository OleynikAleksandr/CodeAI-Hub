# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

## [1.1.690] - 2026-02-26
### Fixed
- Project Manager: layout-level `workspace-scope-sync` now stores incoming `workspace:snapshot` payloads in `workspaceSnapshotStore` independently from runtime session view mount timing.
- Project Manager: Virtual Simulation no longer gets stuck with `Agent is working...` on late tab open after reload when the turn is already idle and waiting for user input.
- Session UI: `total` timer is restored on late mount because the latest snapshot is retained even when `workspace:snapshot` arrived before the tab subscribed.

## [1.1.689] - 2026-02-26
### Fixed
- Project Manager: on runtime hydrate, the UI now reapplies the latest stored `workspace:snapshot` from `workspaceSnapshotStore`, preventing stale default `running` lock when snapshot arrives before `core:state`.
- Project Manager: Virtual Simulation restart/reopen path now keeps input unlocked and task timer state aligned with the latest snapshot after reconnect/reload.

## [1.1.688] - 2026-02-26
### Fixed
- Core: cold-start recovery now normalizes stale `running` runtime sessions to `idle` on workspace selection when turn completion is already known and no bootstrap continuity lock is active.
- Core: persisted task timer totals are restored even when runtime sessions hydrate before the first `workspace select` call.
- Docs (SSOT): synchronized input lock and task timer contracts for the `Virtual Simulation` cold-start recovery rules.

## [1.1.687] - 2026-02-26
### Fixed
- Project Manager: Session EmptyState no longer tells users to start from “buttons above”; it now explains the actual Description flow (`Artifacts` questionnaire → `Submit questionnaire` → provider picker).
- Project Manager: Description questionnaire CTA labels are now English (`Submit questionnaire`, `Close`) to match PM UI terminology.
- Project Manager: stage panel “Fix with agent” callbacks are type-aligned with `WorkflowStepStartService`, restoring green `npm run typecheck:webview`.

## [1.1.685] - 2026-02-26
### Fixed
- Project Manager: false "Creating session…" spinner no longer appears when a stale dialog intent is restored from `localStorage` (e.g. on the Description tab in a fresh workspace). The pending indicator is now driven exclusively by the `pendingSessionCreate` flag (`emptyStatePending`), not by the mere presence of a dialog intent.

## [1.1.684] - 2026-02-26
### Fixed
- Project Manager: all side-effects for gated toolbar buttons (Virtual Simulation, Diagram Modules, Diagram Facades) — `setActiveTool`, `setPendingSessionCreate`, `dispatchStageActivated`, `pm:dialog:open` — are now deferred until the async gating check passes. Clicking these buttons when the upstream artifact is missing produces zero UI changes.

## [1.1.683] - 2026-02-26
### Added
- Project Manager: new **Diagram Modules** workflow step — toolbar click launches an agent session that produces `modules-diagram.mmd`; artifact panel with mermaid validation (`%% Modules Diagram` header + `subgraph`) and "Fix with agent" recovery.
- Project Manager: new **Diagram Facades** workflow step — toolbar click launches an agent session that produces `facades-graph.mmd`; artifact panel with mermaid validation (`%% Facades Graph` header + edge syntax) and "Fix with agent" recovery.
- Project Manager: artifact availability polling hooks for both diagram stages (10 s interval, `maxBytes: "1"` probe).
- Project Manager: Workspace tree branch nodes for Diagram Modules / Facades (session child + artifact child), with gated progression (Diagram Modules requires VS done; Diagram Facades requires Diagram Modules done).
- Project Manager: table-driven toolbar handler (`DIAGRAM_STAGE_MAP`) for diagram clicks; `renderStagePanel()` helper eliminates duplicate workspace-check pattern in `main-area.tsx`.

## [1.1.681] - 2026-02-26
### Added
- Implementation of Diagram Modules & Diagram Facades workflow steps (code only; see `1.1.682` for the doc-synced release).

## [1.1.680] - 2026-02-26
### Added
- Project Manager: every click that says "I want stage X" (toolbar buttons, tree parent labels, tree child nodes) now syncs both artifact and session panels together via `resolveStageSyncPayload()` and the `pm:stage:activated` event.
- Project Manager: auto-select the latest workflow step (Virtual Simulation or Description) when opening a workspace.

### Fixed
- Project Manager: clear stale artifact when the VS session has no artifact file yet.

## [1.1.676] - 2026-02-26
### Changed
- Core: task timer storage is now per-workspace (stored in `<workspaceRoot>/.codeai-hub/state/task-timers.json`); legacy global file is cleaned up on startup.

## [1.1.675] - 2026-02-25
### Fixed
- Project Manager: remove the confusing Back button from the artifact viewer.

## [1.1.674] - 2026-02-25
### Fixed
- Project Manager: show `virtual-simulation.md` in the Workspace tree only after the artifact exists (avoids 404 when clicking).

## [1.1.673] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation reuses the provider selected for Description (prevents accidental provider switches).
- Session UI: workflow tabs use stage labels for non-description stages (e.g., `Virtual Simulation`) instead of showing `Reviewer`.
- Project Manager: Workspace tree now shows the `virtual-simulation.md` artifact as a child node under Virtual Simulation.

## [1.1.672] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation now immediately switches the Sessions panel into a pending state and auto-opens the stage dialog once it becomes available.
- Project Manager: Workspace tree shows the Virtual Simulation session (collapsible stage node with a session child).

## [1.1.671] - 2026-02-25
### Fixed
- Project Manager: Virtual Simulation toolbar now opens the stage session (and reveals the hint panel) instead of acting like a dead click.
- Project Manager: bridge config derives missing `httpUrl` from `wsUrl` (prevents workflow API calls from silently failing).

## [1.1.670] - 2026-02-25
### Added
- Workflow: new `Virtual Simulation` step with bundled prompt+template (file-first from `Final_Description.md`).
- Project Manager: start Virtual Simulation from the toolbar, show a hint panel until the artifact exists, and offer “Fix with agent” when validation fails.

### Changed
- Workflow state: record watcher events and compute deterministic gating + `OUTDATED` propagation.

## [1.1.669] - 2026-02-24
### Fixed
- Reviewer sessions: Stop → Play no longer resets task timer total (BUG-2026-02-24-04).

## [1.1.668] - 2026-02-24
### Fixed
- Project Manager (one-shot Description): after ↻ Restart attempt, auto-focus the newly created session (no manual click in the tree) (BUG-2026-02-24-03).

## [1.1.667] - 2026-02-24
### Changed
- Rebuild of `1.1.666` to avoid the `666` version number; no functional differences.

## [1.1.666] - 2026-02-24
### Changed
- One-shot Description: ↻ Restart attempt confirmation now uses an inline Apply/Cancel bar (Session UI + `questionnaire.md` header), instead of a 2-step arm/confirm click.

## [1.1.665] - 2026-02-24
### Fixed
- Standalone Project Manager (CEF): avoid crash when confirming ↻ Restart attempt in one-shot Description (replaced native `window.confirm` with a 2-step arm/confirm UX).

### Changed
- Session UI: ↻ Restart icon is now 1.6× larger.

## [1.1.664] - 2026-02-24
### Added
- One-shot Description: ↻ Restart attempt recovery to re-submit the questionnaire and start a fresh attempt when the original attempt hangs mid-turn.

## [1.1.663] - 2026-02-23
### Fixed
- Session UI: Stop (■) icon is now ~10% smaller for better visual balance.

## [1.1.662] - 2026-02-23
### Fixed
- Standalone Project Manager (CEF): after Stop (■), the next Enter/▶ now starts Core again via the Launcher bridge (instead of getting stuck with Core stopped).

## [1.1.661] - 2026-02-23
### Fixed
- Session UI: ■ now reliably stops Core by calling the shutdown endpoint (`POST /api/v1/shutdown`) and no longer leaves the “Agent is working…” placeholder visible after Stop.

## [1.1.660] - 2026-02-23
### Changed
- Session UI: the input Play/Stop button now stops Core on ■ (instead of a quick restart), then resumes on the next send (▶ / Enter starts Core and submits after reconnect).
- Session UI: refined the Stop icon visuals (larger ■, clearer red background, better vertical alignment).

## [1.1.659] - 2026-02-23
### Added
- Session UI: added a Play/Stop button next to the input (▶ sends like Enter; ■ restarts Core to abort the active turn and immediately unlock input for a new request).

## [1.1.658] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 20% to 40% every 1000ms (provider color).

## [1.1.657] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 50% every 1000ms (provider color).

## [1.1.656] - 2026-02-23
### Fixed
- Session UI: locked input “please wait” placeholders now actually pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.655] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now pulse opacity from 5% to 80% every 500ms (provider color).

## [1.1.654] - 2026-02-23
### Changed
- Session UI: locked input “please wait” placeholders now use the provider wait color (matching the live turn timer) at 80% opacity.

## [1.1.653] - 2026-02-23
### Fixed
- Session timers: one-shot Description sessions (`resumeMode="no_resume"`) now show the live turn timer while running, without accumulating total time.

## [1.1.652] - 2026-02-22
### Changed
- Session timers: moved SSOT to Core and deliver via workspace snapshots so totals stay consistent across multi-workspace/multi-tab Project Manager usage and Project Manager reloads.

## [1.1.651] - 2026-02-22
### Changed
- Session UI: aligned footer `total:` label typography with timer digits (same font-size/family) for consistent visual weight.
- Session UI: aligned turn/total timers to a shared right anchor so upper and lower values are horizontally aligned.

## [1.1.650] - 2026-02-22
### Changed
- Session UI: total timer in footer is now static during lock/working state (always gray), then updates by jump when the turn completes; footer copy now shows `total:  00h 00m 00s`.
- Session UI: live turn timer in the input area is shown without background badge/pill (plain overlay text on the input field).

## [1.1.649] - 2026-02-22
### Fixed
- Session UI: task timers now match the contract semantics — total is always visible in the footer while input is locked; per-turn timer resets each new turn.
- Session UI: removed legacy manual force unlock toggle (no longer needed after continuity lock fixes).

### Changed
- Session UI: timer display format is now text-only `00h 00m 00s` (no flip animation).

## [1.1.648] - 2026-02-22
### Added
- Session UI: persistent task execution timer (HH:MM:SS) with 3D flip digits — shows live time while the agent is working and keeps an accumulated total per workflow-agent across continuity rollovers and Core restarts.

## [1.1.647] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Продолжай” continues the interrupted turn.

### Changed
- Docs: update release notes (`README.md`, `CHANGELOG.md`) before packaging.
- Note: `1.1.647` is a doc-synced rebuild of `1.1.646` artifacts (no additional code changes).

## [1.1.646] - 2026-02-22
### Fixed
- Project Manager / Session UI (BUG-2026-02-22-01): avoid stuck “resuming/blocked” on cold start — unlock input when `workspace:snapshot` reports `turnState=idle` and `continuityLockActive=false`, even if `continuityLockReason` is missing.
- Core / Workspace snapshots: normalize idle resume-in-place sessions to emit an explicit unlock hint `continuityLockReason="no_rollover_needed"` (defense-in-depth; reason is never a hard unlock gate).
- Crash/restart resilience: after Core restarts mid-turn, input unblocks automatically when the snapshot is `idle/unlocked`; sending “Продолжай” continues the interrupted turn.

### Changed
- Release notes: `1.1.646` artifacts were packaged before the docs were updated; use `1.1.647` for the doc-synced release.

## [1.1.643] - 2026-02-21
### Fixed
- Claude / Recovery hints: corrected provider-home auth command in user-facing errors to `HOME=~/.codeai-hub/providers/claude/home claude /login`.

## [1.1.642] - 2026-02-20
### Changed
- Release maintenance rebuild: regenerated unified local artifacts (providers/core/UI/launcher) and VSIX for clean install validation.

## [1.1.641] - 2026-02-19
### Fixed
- Core / Codex Session Continuity: prevent duplicate rollover / double session separators when report generation is slow (no timeout-based retries; ignore rollover triggers from stale continuity segments).

## [1.1.640] - 2026-02-19
### Fixed
- Extension / UI: fix UI bundle installation (extract tarballs without an extra top-level folder) so VS Code Settings and Launcher UI can load from `~/.codeai-hub/packages/ui/*/current/*` without `ERR_FILE_NOT_FOUND`.

## [1.1.639] - 2026-02-19
### Fixed
- UI / Sessions: show “resuming session…” placeholder during continuity rollover locks (avoid misleading “agent working” copy while switching/bootstraping a new workflow session).

## [1.1.638] - 2026-02-18
### Fixed
- UI / Sessions: show “resuming session…” placeholder during session binding (avoid misleading “agent working” copy while switching/hydrating a new workflow session).

## [1.1.637] - 2026-02-18
### Fixed
- Core / Templates: bundle and install `reviewer-template.md`, and pass its absolute path into Reviewer instructions (so the agent uses the template instead of searching for a missing file).

## [1.1.636] - 2026-02-18
### Fixed
- Claude / Session Continuity: compute context remaining % from the real `/context` snapshot (provider JSONL) and avoid incorrect rollovers caused by `modelUsage`/cache token totals.

## [1.1.635] - 2026-02-18
### Fixed
- Project Manager / Dialog sessions: prevent stuck-locked input by replaying the latest `workspace:snapshot` after dialog session hydration / rollover.

## [1.1.634] - 2026-02-18
### Fixed
- Core / Workspace snapshots: preserve session lock fields during partial updates (fixes missed unlock after continuity rollover).

## [1.1.626] - 2026-02-17
### Fixed
- Project Manager / Session UI: token usage now refreshes reliably after turns (including dialog sessions that hydrate snapshots after stream events).

## [1.1.625] - 2026-02-17
### Fixed
- Project Manager: auto-open the `Reviewer` dialog after live `Description → Reviewer` handoff (mirrors workflow tree click via `pm:dialog:open`).

## [1.1.624] - 2026-02-17
### Fixed
- Project Manager: fix live `Description → Reviewer` auto-handoff by resolving the reviewer runtime session deterministically (prevents hiding the reviewer before binding is ready).

## [1.1.623] - 2026-02-17
### Fixed
- Project Manager: live auto-handoff now focuses `Reviewer` session after one-shot `Description` completes (without manual click in workflow tree).
- Guardrail: reviewer auto-focus is scoped to `description/collector` transition to avoid stealing focus from unrelated active sessions.

## [1.1.622] - 2026-02-17
### Fixed
- Project Manager / Session UI: show a spinner in the left session area while a workflow session is being created (so the UI does not look frozen).

### Docs
- SolidWorks-Flow: archive non-contract drafts, clarify SSOT boundaries, and normalize doc statuses/metadata.
- Knowledge base: model selection/aliases are documented as SSOT-in-code (see `src/types/*-model-registry.ts`).

## Previous releases (summary)
Earlier releases in the `1.1.57x–1.1.62x` series focused on SSOT routing (dialog vs runtime), snapshot-first lock/usage authority, and continuity/resume reliability across providers. For the full history, use `git log` / tags.

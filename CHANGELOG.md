# Changelog

This project evolves quickly during active FLOW development. We keep the changelog intentionally short and treat the code + docs as the primary source of truth.

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

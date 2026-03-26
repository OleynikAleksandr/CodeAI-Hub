# Session 159 — Provider/Model Switch MVP planning, TODO reset, and zero-context handoff

**Date:** 2026-03-26 08:30–08:52 (CET)
**Branch:** main
**Version:** 1.1.803

---

# 1. Work Done in This Session

## Work summary

### Architecture planning for BUG-2026-03-25-01 and generic provider switch
- Created a new architecture document: `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`
- The document now covers:
  - provider failure classification
  - turn lifecycle invariants
  - bounded retry budget
  - `pending user intent` TTL = 60s
  - same-provider retry and `switch_model`
  - cross-provider `switch_provider`
  - PM as second health checkpoint when Core is unavailable
  - provider-neutral transfer package for takeover
  - plain dialog transcript for the new provider (`User:` / `Assistant:`), not provider-native JSONL
  - compatibility requirements with `MultiProvider_Orchestration_Scenarios.md`

### Alignment with multi-provider planning
- Re-read and aligned the new provider-switch architecture with `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md`
- Fixed the document so that `dialog:switch:*` and provider-neutral continuity transfer act as low-level primitives for future multi-provider orchestration
- Explicitly prohibited coupling to Gemini/Claude/Codex-specific storage formats

### MVP assumptions fixed explicitly
- The following decisions were locked for MVP and should not be reopened without a blocker:
  - no separate stage-specific artifact resolver in MVP
  - no persistent session-scoped model override in MVP
  - `pendingSwitchIntent` is PM in-memory only in MVP
- Important product decision fixed in `todo-plan.md`: **all Phase 67-71 together are the MVP**; there is no separate reduced variant inside this plan

### TODO plan reset
- Archived the previous plan:
  - `doc/TODO/todo-plan.md` → `doc/TODO/Archive/todo-plan-up-to-phase66-2026-03-26.md`
- Created a new `doc/TODO/todo-plan.md` for the new MVP
- The new plan is structured into:
  - Phase 67: Core resilience invariants
  - Phase 68: same-provider recovery and `switch_model`
  - Phase 69: cross-provider switch and provider-neutral transfer package
  - Phase 70: PM health guardian and switch UX
  - Phase 71: documentation synchronization and release build

### TODO plan hardening
- Added explicit targeted build steps to the plan:
  - Core streams: `npm run build --workspace=@codeai-hub/core`
  - PM/UI streams: `npm run build:webview` + `npm run typecheck:webview`
- Marked `packages/core/src/remote-bridge/handlers/session-request-handler.ts` as a hotspot file
- Added explicit smoke-check expectations after implementation steps, not only at test-stream boundaries

### Verification and repo state
- Created one documentation commit for the planning package
- Pre-commit gates passed on that commit:
  - `npm test` (project placeholder)
  - architecture check
  - duplication check
  - lint placeholder
  - `ts-prune` (existing noise remained, commit still passed)
- No release build was run in this session
- No implementation work for Phase 67+ started yet

## Git commits
- `c3f57da2 docs: add provider switch MVP planning and archive previous todo plan`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/Sessions/Session158.md`
3. `doc/Sessions/Session159.md` (THIS REPORT)
4. `doc/BugRegistry.md` — focus on `BUG-2026-03-25-01`
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
7. `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`
8. `doc/SolidWorks-WorkFlow/Plans/MultiProvider_Orchestration_Scenarios.md`
9. `doc/TODO/todo-plan.md`

## Optional audit context
- `doc/TODO/Archive/todo-plan-up-to-phase66-2026-03-26.md` — previous completed plan, useful only if you need historical continuity of planning

## Zero-context restart summary

### What is already decided
- The product scope for the next implementation cycle is fixed:
  - resilience bugfix for provider failure cascade
  - generic provider/model switch
  - PM health guardian
- This is **one MVP**, not a split between “mini-MVP” and “full MVP”
- The provider switch design must remain provider-neutral and compatible with future multi-provider orchestration

### What the new provider must receive
- Do **not** send provider-native JSONL, rollout logs, SDK event envelopes, or raw previous provider bootstrap
- The takeover payload must be:
  - `provider-switch-handoff.md`
  - `unified-dialog.prompt.md`
  - canonical artifact paths
  - latest unresolved user intent
- `unified-dialog.prompt.md` is plain dialog text:
  - `User:`
  - `Assistant:`

### Core vs PM responsibility split
- If Core is alive:
  - Core classifies failure
  - Core chooses target
  - Core performs switch/recovery
- If Core is dead:
  - PM does **not** pretend to perform continuity transfer
  - PM only warns user, attempts reconnect/restart, and offers retry after Core returns

### MVP assumptions that are locked
- No separate stage-specific artifact resolver in MVP
- No persistent session-scoped model override in MVP
- `pendingSwitchIntent` is in-memory only in MVP

### Hotspot warning
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` is the highest-risk file in this scope
- After every micro-task touching it, run:
  - `npm run build --workspace=@codeai-hub/core`

## Exact starting point for the next session

### Start from Phase 67
- Open `doc/TODO/todo-plan.md`
- Begin with:
  - `Phase 67`
  - `Stream: Failure classification and bounded retry`

### First implementation target
- Introduce `ProviderFailureClassifier`
- Integrate it before destructive teardown
- Ensure transient errors do not automatically degrade the whole provider or destroy binding

### Execution discipline for the first stream
- If the first micro-task grows too large in `session-request-handler.ts`, split it immediately instead of forcing the original scope
- After each Core micro-task:
  - run `npm run build --workspace=@codeai-hub/core`
  - do a short smoke-check of the affected path

## Practical implementation order to preserve momentum
1. Phase 67 — classifier, retry budget, TTL, no-silent-drop
2. Phase 68 — same-provider retry and `switch_model`
3. Phase 69 — cross-provider switch and transfer package
4. Phase 70 — PM health guardian and user-facing switch UX
5. Phase 71 — document sync first, release build second

## What must not be forgotten
- Any logic change in Core/PM must be reflected in `doc/` before commit
- The final stream in the current plan is not implementation, but:
  - documentation synchronization
  - release build according to repo instructions
- Keep the implementation aligned with:
  - `ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`
  - `MultiProvider_Orchestration_Scenarios.md`

## Known current state at end of this session
- Current branch: `main`
- Current version: `1.1.803`
- Current `todo-plan.md` already targets the new MVP
- No Phase 67 implementation has started yet

# Session 161 — Recovery Pipeline Wiring + Working Switch Buttons + Bugfixes

**Date:** 2026-03-26 10:00–12:30 (CET)
**Branch:** main
**Version:** 1.1.809 (started at 1.1.805)

---

# 1. Work Done in This Session

## Work summary

### Testing release 1.1.805 (from Session 160)
- Discovered BUG-2026-03-26-01: provider timeout/capacity error → no recovery offer shown, only silent input unlock
- Root cause: entire recovery chain (classifier → bridge → banner) was designed in Session 160 but layers were not connected

### Phase 72 — Wire failure→recovery-offer pipeline (BUG-2026-03-26-01)
- Created `failure-recovery-bridge.ts` — translates ProviderFailureClassification into DialogSwitchOfferPayload
- Wired `buildSwitchOfferPayload()` into `handleProviderFailure()` in session-request-handler.ts
- Created `use-dialog-switch-offer.ts` hook for PM-side event listening
- Wired `SwitchRecoveryBanner` into session-view.tsx via `SwitchOfferBanner` wrapper
- **Tested: banner appeared on Gemini capacity error with correct options**

### Phase 73 — Working switch buttons + watchdog timeout
- **Watchdog timeout**: Added 180s idle watchdog in Gemini `sendMessage()` — aborts if no SDK events for 180s
- **Idle-based reset**: Converted watchdog from absolute timer to per-event reset (BUG-2026-03-26-02 fix)
- **Working buttons**: Full end-to-end `dialog:switch:request` pipeline:
  - PM: `sendSwitchRequest` in dialog-api, `acceptRetryInPlace`/`acceptSwitchTarget` callbacks
  - Core: `dialog:switch:request` routing in RemoteBridge + `handleSwitchRequest` in SessionRequestHandler
  - Gemini: `setModelOverride` on adapter + `pendingModelOverride` consumed in sendMessage
- **Tested: switch to gemini-3-flash-preview worked, model changed, agent responded**

### Universal runtime model label sync (BUG-2026-03-26-03)
- New `session:model:update` BridgeEvent type — Core broadcasts when provider reports model_info
- Added `case "system"` to handleTypedProviderEvent (was silently dropped before)
- `broadcastRuntimeModelUpdate()` detects `data.model` in system events
- New `use-runtime-model-sync.ts` hook — listens for `session:model:update`, updates snapshot `status.models`
- Universal for all providers, not just Gemini

### ThoughtTranslator fixes
- `gemini-2.0-flash-lite` → `gemini-2.5-flash-lite` (old model removed by Google, 404 error)
- Hardened prompt: multi-turn with system instruction + model acknowledgment to suppress chain-of-thought
- `extractFinalTranslation()` — takes only last paragraph if model still includes reasoning
- Timeout increased from 8s to 15s

### Releases built
- 1.1.806: recovery offer pipeline
- 1.1.807: working buttons + watchdog + ThoughtTranslator model fix
- 1.1.808: idle watchdog + model label sync
- 1.1.809: ThoughtTranslator prompt hardening

## Git commits
- `b80ba0c4 feat(core): add failure-recovery-bridge for switch offer resolution`
- `0f9f3e78 fix(core): emit dialog:switch:offer on recoverable provider failure`
- `ac41f705 feat(pm): handle dialog:switch:offer in session event dispatcher`
- `c8270d60 feat(ui): wire SwitchRecoveryBanner into session view`
- `75028470 docs: sync Phase 72 recovery pipeline wiring and BUG-2026-03-26-01`
- `52014bb4 chore(release): bump version to 1.1.806`
- `b0f38a15 fix(gemini): update ThoughtTranslator model to gemini-2.5-flash-lite`
- `27ac310f fix(gemini): add 180s watchdog timeout to sendMessage`
- `4bafe517 feat(core): implement working retry/switch-model buttons end-to-end`
- `d48b89c8 chore(release): bump version to 1.1.807`
- `936729f2 fix(gemini): convert watchdog to idle-based timer reset on each SDK event`
- `eeb322f8 feat(core): broadcast session:model:update for runtime model label sync`
- `40d3176e chore(release): bump version to 1.1.808`
- `6317b5e2 fix(gemini): harden ThoughtTranslator prompt and increase timeout`
- `753d3b7a chore(release): bump version to 1.1.809`

## New files created
- `packages/core/src/recovery/failure-recovery-bridge.ts`
- `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts`
- `src/client/project-manager/components/sessions/use-runtime-model-sync.ts`

## Bug Registry updates
- BUG-2026-03-26-01: FIXED (1.1.806) — recovery offer pipeline
- BUG-2026-03-26-02: FIXED (1.1.808) — idle watchdog false-positive
- BUG-2026-03-26-03: FIXED (1.1.808) — model label not updated after switch

## Verification status
- All quality gates green (architecture 0 violations, duplication 2.23%)
- Core, Gemini module, webview, typecheck — all pass
- VSIX 1.1.809 (1.5MB) successfully packaged
- **Live testing partially completed (details below)**

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/Sessions/Archive/Session161.md` (THIS REPORT)
3. `doc/TODO/todo-plan.md`
4. `doc/BugRegistry.md` — especially BUG-2026-03-26-01/02/03 entries
5. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
6. `doc/SolidWorks-WorkFlow/Plans/ProviderFailure_Recovery_And_CoreDriven_ProviderSwitch_Architecture.md`

## Key files changed in this session (for context recovery via git show)
- `packages/core/src/recovery/failure-recovery-bridge.ts` — new file, switch offer builder
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — handleProviderFailure emit offer, handleSwitchRequest, broadcastRuntimeModelUpdate, system event handling
- `packages/core/src/remote-bridge/index.ts` — dialog:switch:request routing
- `packages/core/src/remote-bridge/types.ts` — session:model:update event type
- `packages/Gemini_Module/src/session/gemini-session-manager.ts` — idle watchdog, pendingModelOverride
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` — setModelOverride
- `packages/Gemini_Module/src/messaging/thought-translator-service.ts` — model change, prompt, timeout, extractFinalTranslation
- `src/client/ui/src/session/session-view.tsx` — SwitchOfferBanner, onRetry/onSelect props
- `src/client/project-manager/components/sessions/use-dialog-switch-offer.ts` — switch offer hook with working actions
- `src/client/project-manager/components/sessions/use-runtime-model-sync.ts` — runtime model label sync
- `src/client/project-manager/services/dialog-api.ts` — sendSwitchRequest
- `src/client/project-manager/core-stream-message-types.ts` — DialogSwitchRequestPayload

## Plans for next session

### Priority 1: Test release 1.1.809
Install VSIX and verify:
1. **Recovery banner on timeout/capacity error** — banner should appear with retry/switch options
2. **Idle watchdog** — should NOT trigger false-positive during active tool-call chains (was fixed from absolute to idle-based)
3. **Switch to flash button** — should switch model and resend, agent responds on new model
4. **Retry in place button** — should resend last message on same model
5. **Model label in StatusPanel** — should update to show actual runtime model after switch (e.g., "Gemini 3 Flash Preview" instead of "Gemini 3.1 Pro Preview")
6. **ThoughtTranslator** — thinking events should show concise Russian translations, NOT verbose chain-of-thought reasoning
7. **Cross-provider switch buttons** (Switch to codexCli / claudeCodeCli) — NOT yet implemented, buttons will dismiss banner only

### Priority 2: Known issues to address
- **Cross-provider switch** (`switch_provider` mode) — buttons exist but not wired to actual provider switch. Requires creating new session on different provider.
- **ThoughtTranslator quality** — prompt was hardened but needs live testing. `gemini-2.5-flash-lite` may still be slow or verbose.
- **todo-plan.md** needs Phase 73 added and Phase 72 updated with new commits

### Priority 3: Workflow testing
- Continue Virtual Simulation workflow testing (was interrupted by capacity errors)
- Test "Исправить с агентом" button for virtual-simulation.md scenario validation errors

### Known state at end of session
- Branch: `main`
- Version: `1.1.809`
- VSIX ready for testing at project root
- All Phase 72 tasks DONE, Phase 73 (watchdog + buttons + model sync) done but not in todo-plan yet
- BugRegistry updated with 3 new entries (all FIXED)
- Gemini 3.1 Pro Preview has persistent capacity issues on Google side

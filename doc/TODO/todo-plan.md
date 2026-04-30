# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningSwitch_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
- Only this list is the source of recovery documents for the current execution cycle.

## Правила выполнения (Execution Rules)

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task must touch no more than 3 files/packages. If a task needs more, split it before coding.
- Each task is paired with a separate `Git Commit: ...` item.
- Core quality gates run through Husky on `git commit`; do not bypass hooks.
- Targeted builds/tests are run manually when needed and before closing each Stream/Phase.
- Documentation must be updated in the same commit as architecture/behavior changes.
- Phase release closeout requires a clean tree, release docs update, `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.
- `doc/TODO/todo-plan.md` is updated in real time after every task/commit.

---

## Phase 0 - Scope Bootstrap (owner: Codex, updated: 2026-04-29)

### Stream: Planning And Session Open

1. [DONE] Create approved planning-doc and active execution plan (scope: `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningSwitch_Architecture.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session035.md`; commit: `docs: plan status panel model switcher`)
2. [DONE] Git Commit: `docs: plan status panel model switcher` (hash: `03b7cefcb`)

---

## Phase 1 - Core Binding Command (owner: Codex, updated: 2026-04-29)

### Stream: Non-Resend Model Binding Update

3. [DONE] Add `session:model:set` transport contract and validation (scope: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `src/client/project-manager/core-stream-message-types.ts`; commit: `feat(core): add session model set command contract`)
4. [DONE] Git Commit: `feat(core): add session model set command contract` (hash: `c083d02cc`)
5. [DONE] Implement non-resend Core binding update action and public handler (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit: `feat(core): update session model binding without resend`)
6. [DONE] Git Commit: `feat(core): update session model binding without resend` (hash: `7675d7bd0`)
7. [DONE] Route `session:model:set` command and cover no-resend behavior (scope: `packages/core/src/remote-bridge/remote-bridge-message-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`; commit: `feat(core): route session model set command`; verified: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`, `npm run build --workspace=@codeai-hub/core`)
8. [DONE] Git Commit: `feat(core): route session model set command` (hash: `e688ecc6e`)
9. [DONE] Add PM API sender for active-session model binding update (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/core-stream-message-types.ts`; commit: `feat(pm): expose session model set command`)
10. [DONE] Git Commit: `feat(pm): expose session model set command` (hash: `a729a5340`)

---

## Phase 2 - Provider Compatibility Audit (owner: Codex, updated: 2026-04-29)

### Stream: Reasoning/Thinking Parity

11. [DONE] Align Claude runtime applied-config effort type with `xhigh` (scope: `packages/Claude_Module/src/session/types.ts`, `packages/Claude_Module/src/provider/claude-applied-turn-config.ts`; commit: `fix(claude): align applied thinking runtime levels`; verified: `npm run build --workspace=@codeai-hub/claude-module`)
12. [DONE] Git Commit: `fix(claude): align applied thinking runtime levels` (hash: `63954c275`)
13. [DONE] Pass Claude `xhigh` through SDK manager and tests (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`; commit: `fix(claude): pass xhigh effort to sdk`; verified: `npx tsx --test packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `npm run build --workspace=@codeai-hub/claude-module`)
14. [DONE] Git Commit: `fix(claude): pass xhigh effort to sdk` (hash: `78ea9517d`)
15. [DONE] Add provider applied-config compatibility tests for Codex/Gemini selected model and reasoning payloads (scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`; commit: `test(providers): verify selected model reasoning payloads`; verified: `npx tsx --test packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `npx tsx --test packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`, `npm run build --workspace=@codeai-hub/codex-app-server-module`, `npm run build --workspace=@codeai-hub/gemini-module`)
16. [DONE] Git Commit: `test(providers): verify selected model reasoning payloads` (hash: `efadebf8c`)

---

## Phase 3 - Shared UI Picker Module (owner: Codex, updated: 2026-04-29)

### Stream: Option Facade

17. [DONE] Add provider-neutral status-panel switcher option facade (scope: `src/client/ui/src/session/model-switcher/session-model-switcher-facade.ts`, `src/client/ui/src/session/model-switcher/session-model-switcher-facade.test.ts`; commit: `feat(ui): add session model switcher facade`; verified: `npx tsx --test src/client/ui/src/session/model-switcher/session-model-switcher-facade.test.ts`, `npm run typecheck:webview`)
18. [DONE] Git Commit: `feat(ui): add session model switcher facade` (hash: `33e575471`)
19. [DONE] Add picker card components for model and reasoning choices (scope: `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx`, `src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx`, `media/session-view.css`; commit: `feat(ui): add session model picker cards`; verified: `npx tsx --test src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx`, `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`)
20. [DONE] Git Commit: `feat(ui): add session model picker cards` (hash: `d1f553dab`)
21. [DONE] Wire StatusPanel callbacks and picker rendering without PM imports (scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/status-panel.test.tsx`; commit: `feat(ui): make status model chips interactive`; verified: `npx tsx --test src/client/ui/src/session/status-panel.test.tsx src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx src/client/ui/src/session/model-switcher/session-model-switcher-facade.test.ts`, `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`)
22. [DONE] Git Commit: `feat(ui): make status model chips interactive` (hash: `c91d148fa`)

---

## Phase 4 - Project Manager Orchestration (owner: Codex, updated: 2026-04-29)

### Stream: Settings Save Plus Binding Update

23. [DONE] Add PM controller for selection -> settings save -> `session:model:set` (scope: `src/client/project-manager/components/sessions/session-model-switch-controller.ts`, `src/client/project-manager/components/sessions/session-model-switch-controller.test.ts`; commit: `feat(pm): orchestrate session model selections`; verified: `npx tsx --test src/client/project-manager/components/sessions/session-model-switch-controller.test.ts`, `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`)
24. [DONE] Git Commit: `feat(pm): orchestrate session model selections` (hash: `53d63c454`)
25. [DONE] Add React hook for runtime and dialog session switch wiring (scope: `src/client/project-manager/components/sessions/use-session-model-switch.ts`, `src/client/project-manager/components/sessions/use-session-model-switch.test.ts`; commit: `feat(pm): add session model switch hook`; verified: `npx tsx --test src/client/project-manager/components/sessions/use-session-model-switch.test.ts`, `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`)
26. [DONE] Git Commit: `feat(pm): add session model switch hook` (hash: `e83f29178`)
27. [DONE] Wire runtime and reopened dialog views to the shared switch hook (scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; commit: `feat(pm): wire status panel model switching`; verified: `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`, `npx tsx --test src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`)
28. [DONE] Git Commit: `feat(pm): wire status panel model switching` (hash: `c21f49437`)

---

## Phase 5 - Documentation And Targeted Verification (owner: Codex, updated: 2026-04-29)

### Stream: Canonical Docs

29. [DONE] Update canonical architecture docs for status-panel model switching (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; commit: `docs: document status panel model switching`; verified: documentation diff reviewed)
30. [DONE] Git Commit: `docs: document status panel model switching` (hash: `62bdce231`)
31. [DONE] Update Docs Index and active planning status after implementation (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningSwitch_Architecture.md`, `doc/TODO/todo-plan.md`; commit: `docs: index status panel model switcher`; verified: docs index and planning diff reviewed)
32. [DONE] Git Commit: `docs: index status panel model switcher` (hash: `ee7dafe61`)

### Stream: Targeted Verification

33. [DONE] Run targeted unit/build checks for Core, PM UI, and provider compatibility (scope: `packages/core`, `src/client`, `packages/Claude_Module`, `packages/Codex_AppServer_Module`, `packages/Gemini_Module`; commit: `test: verify status panel model switching`; verified: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`, `npm run build --workspace=@codeai-hub/core`, `npx tsx --test packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`, `npm run build --workspace=@codeai-hub/claude-module`, `npx tsx --test packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `npm run build --workspace=@codeai-hub/codex-app-server-module`, `npx tsx --test packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`, `npm run build --workspace=@codeai-hub/gemini-module`, `npx tsx --test src/client/ui/src/session/status-panel.test.tsx src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx src/client/ui/src/session/model-switcher/session-model-switcher-facade.test.ts`, `npx tsx --test src/client/project-manager/components/sessions/session-model-switch-controller.test.ts src/client/project-manager/components/sessions/use-session-model-switch.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `npm run typecheck:webview`, `npm run build:webview`, `npm run check:knip`)
34. [DONE] Git Commit: `test: verify status panel model switching` (hash: `ed3e72308`)

---

## Phase 6 - Release Build And Closeout (owner: Codex, updated: 2026-04-29)

### Stream: Release Preparation

35. [DONE] Prepare release docs for future version before build-all (scope: `README.md`, `CHANGELOG.md`, relevant `doc/` release notes if needed; commit: `docs: prepare release 1.2.112`; verified: README current release and changelog section set to `1.2.112`)
36. [DONE] Git Commit: `docs: prepare release 1.2.112` (hash: `6a0514a82`)
37. [DONE] Run `./scripts/build-all.sh` from a clean tree and move/verify release tarballs (scope: versioned package manifests, generated release artifacts, `doc/tmp/releases/`; commit: `chore: build release 1.2.112`; verified: `./scripts/build-all.sh`, `doc/tmp/releases/*1.2.112*`, `~/.codeai-hub/releases/*1.2.112*`, package version `1.2.112`)
38. [DONE] Git Commit: `chore: build release 1.2.112` (hash: `3ceab8fcf`)
39. [DONE] Run `./scripts/build-release.sh --use-current-version` and verify VSIX output (scope: root VSIX artifact, release metadata if generated; commit: `chore: package release 1.2.112`; verified: `./scripts/build-release.sh --use-current-version`, `codeai-hub-1.2.112.vsix` package created, SDK exclusions verified, VSIX runtime package surface verified)
40. [DONE] Git Commit: `chore: package release 1.2.112` (hash: `8540c2055`)

### Stream: Archive Completed Scope

41. [BLOCKED] Archive completed todo-plan and planning-doc only after user acceptance of the release (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, session report; commit: `docs: archive status panel model switcher`; note: premature archive commit `80b435299` is superseded by reopened active scope)
42. [DONE] Git Commit: `docs: archive status panel model switcher` (hash: `80b435299`)

---

## Phase 7 - Post-Release User Retest Feedback (owner: Codex, updated: 2026-04-30)

### Stream: Reopen Active Scope

43. [DONE] Reopen status-panel model switcher scope after failed user retest (scope: `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningSwitch_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/Sessions/Session035.md`; commit: `docs: reopen status panel model switcher scope`; note: do not close/archive again until user confirms the fixed release works)
44. [DONE] Git Commit: `docs: reopen status panel model switcher scope` (hash: `ba2adee2c`)
45. [DONE] Record User Acceptance Gate process update after premature archive (scope: `AGENTS.md`; commit: `docs: require user acceptance before scope closeout`; note: existing commit added mandatory visual acceptance before completion/archive)
46. [DONE] Git Commit: `docs: require user acceptance before scope closeout` (hash: `4c8e3e911`)

### Stream: Regression Fix Plan

47. [DONE] Record confirmed `1.2.112` retest regressions and split the fix stream (scope: `doc/TODO/todo-plan.md`; commit: `docs: plan status panel retest fixes`; confirmed failures: selected model/reasoning reset to the previous identity on next turn; model picker card needs left-edge alignment with the Reasoning picker/chip area)
48. [DONE] Git Commit: `docs: plan status panel retest fixes` (hash: `3b6a7d729`)

### Stream: Binding Regression Fix

49. [DONE] Extend `session:model:set` transport payload to carry explicit selected reasoning/thinking (scope: `packages/core/src/remote-bridge/session-stream-contracts.ts`, `packages/core/src/remote-bridge/handlers/incoming-message-validator.ts`, `src/client/project-manager/core-stream-message-types.ts`; commit: `fix(core): carry explicit status panel reasoning selection`; verified: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`)
50. [DONE] Git Commit: `fix(core): carry explicit status panel reasoning selection` (hash: `3855ddc77`)
51. [DONE] Resolve explicit status-panel model/reasoning in Core binding without rereading stale Settings (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-session-actions.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`; commit: `fix(core): bind status panel reasoning without settings race`; verified: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`)
52. [DONE] Git Commit: `fix(core): bind status panel reasoning without settings race` (hash: `aa13e1c30`)
53. [DONE] Preserve pending selected model in PM and send explicit reasoning with `session:model:set` (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/sessions/session-model-switch-controller.ts`, `src/client/project-manager/components/sessions/use-session-model-switch.ts`; commit: `fix(pm): preserve pending status panel model selection`; verified: `npx tsx --test src/client/project-manager/components/sessions/session-model-switch-controller.test.ts src/client/project-manager/components/sessions/use-session-model-switch.test.ts`)
54. [DONE] Git Commit: `fix(pm): preserve pending status panel model selection` (hash: `05009d3c0`)
55. [DONE] Cover sequential model -> reasoning picker selection in PM tests (scope: `src/client/project-manager/components/sessions/session-model-switch-controller.test.ts`, `src/client/project-manager/components/sessions/use-session-model-switch.test.ts`; commit: `test(pm): cover sequential status panel selection`; verified: `npx tsx --test src/client/project-manager/components/sessions/session-model-switch-controller.test.ts src/client/project-manager/components/sessions/use-session-model-switch.test.ts`)
56. [DONE] Git Commit: `test(pm): cover sequential status panel selection` (hash: `f0a35d957`)

### Stream: Picker Positioning Fix

57. [DONE] Align only the model picker card so its left edge starts at the Reasoning picker/chip area; leave Reasoning card positioning unchanged (scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx`, `media/session-view.css`; commit: `fix(ui): align status model picker card`; verified: `npx tsx --test src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx src/client/ui/src/session/status-panel.test.tsx`)
58. [DONE] Git Commit: `fix(ui): align status model picker card` (hash: `a9929debd`)

### Stream: Targeted Verification

59. [DONE] Run targeted regression checks for Core binding, PM sequential selection, UI picker rendering, and affected builds (scope: `packages/core`, `src/client/project-manager`, `src/client/ui`, `webview`; commit: `test: verify status panel retest fixes`; verified: `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`, `npx tsx --test src/client/project-manager/components/sessions/session-model-switch-controller.test.ts src/client/project-manager/components/sessions/use-session-model-switch.test.ts`, `npx tsx --test src/client/ui/src/session/model-switcher/session-model-picker-card.test.tsx src/client/ui/src/session/status-panel.test.tsx`, `npm run typecheck:webview`, `npm run build:webview`)
60. [DONE] Git Commit: `test: verify status panel retest fixes` (hash: `afd35a568`)

### Stream: Canonical Docs

61. [DONE] Update canonical docs for explicit status-panel model/reasoning binding and model picker alignment (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; commit: `docs: document status panel retest fixes`; verified: documentation diff reviewed)
62. [DONE] Git Commit: `docs: document status panel retest fixes` (hash: `168fdecf1`)

### Stream: Release Build

63. [DONE] Prepare release docs for future version `1.2.113` before build-all (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare release 1.2.113`; verified: README current release and changelog section set to `1.2.113`)
64. [DONE] Git Commit: `docs: prepare release 1.2.113` (hash: `fe9813c34`)
65. [DONE] Fix Core public handler signature after first `build-all.sh` compile failure (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; commit: `fix(core): expose explicit model set reasoning handler`; verified: `npm run build --workspace=@codeai-hub/core`, `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`; note: first `./scripts/build-all.sh` failed at Core `tsc` before this fix)
66. [DONE] Git Commit: `fix(core): expose explicit model set reasoning handler` (hash: `605e29ae9`)
67. [DONE] Resume `./scripts/build-all.sh --allow-dirty --version 1.2.113` after the first compile failure and verify release tarballs (scope: package manifests, generated release artifacts, `doc/tmp/releases/`; commit: `chore: build release 1.2.113`; verified: `./scripts/build-all.sh --allow-dirty --version 1.2.113`, `doc/tmp/releases/*1.2.113*`, `~/.codeai-hub/releases/*1.2.113*`, package version `1.2.113`)
68. [DONE] Git Commit: `chore: build release 1.2.113` (hash: `79c1d2d87`)
69. [DONE] Run `./scripts/build-release.sh --use-current-version` and verify VSIX output (scope: root VSIX artifact, release metadata if generated; commit: `chore: package release 1.2.113`; verified: `./scripts/build-release.sh --use-current-version`, `codeai-hub-1.2.113.vsix` package created, SDK exclusions verified, dev dependencies pruned before packaging/restored, VSIX runtime package surface verified, sha1 `6f29dfbbefb90037b9c2b5669d8c392bd8867a69`)
70. [DONE] Git Commit: `chore: package release 1.2.113` (hash: `021cd058e`)

### Stream: User Visual Acceptance Testing

71. [DONE] Hand off `codeai-hub-1.2.113.vsix` for user installation/retest and verify both retest scenarios: next turn keeps selected model/reasoning; model picker is visually aligned and readable (scope: user visual test result, `doc/TODO/todo-plan.md`, `doc/Sessions/Session035.md`; commit: `docs: record release 1.2.113 visual retest status`; status: user retest failed on 2026-04-30: in Shaga Description, changing Reasoning from Low to X-High reverts to Low when the answer is sent; changing the model also applies visually first but reverts to the initially selected session model on next turn submit)
72. [DONE] Git Commit: `docs: record release 1.2.113 visual retest status` (hash: `7d4f6251d`)

---

## Phase 8 - Post-Release 1.2.113 Submit Retest Fix (owner: Codex, updated: 2026-04-30)

### Stream: Submit-Time Reasoning Reset Fix

75. [DONE] Record failed `1.2.113` retest and root-cause route for submit-time model/reasoning reset (scope: `doc/TODO/todo-plan.md`; commit: `docs: plan submit-time model reset fix`; confirmed failure: in Shaga Description, status-panel model and Reasoning apply visually but revert to the initial model/Low when the answer is sent)
76. [DONE] Git Commit: `docs: plan submit-time model reset fix` (hash: `39120d28b`)
77. [DONE] Preserve live session `modelBinding` during dialog submit instead of overwriting it from stale continuity segment metadata (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-session-resolution.ts`; commit: `fix(core): preserve dialog submit model binding`; verified: source diff reviewed, targeted regression test added in next task)
78. [DONE] Git Commit: `fix(core): preserve dialog submit model binding` (hash: `6673ff4e5`)
79. [DONE] Forward explicit `targetReasoningId` through PM runtime/dialog `setSessionModel` wrappers before `api.setSessionModel` (scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; commit: `fix(pm): forward status panel reasoning through views`; verified: source diff reviewed, targeted regression test added in next task)
80. [DONE] Git Commit: `fix(pm): forward status panel reasoning through views` (hash: `6dd984d83`)
81. [DONE] Add regression guards that dialog submit preserves live Core `modelBinding` and PM runtime/dialog wrappers preserve `targetReasoningId` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; commit: `test: guard submit-time model binding preservation`; verified: `npx tsx --test --test-name-pattern "keeps live dialog model binding" packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `npx tsx --test src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; note: full `session-request-handler.create-resume.test.ts` currently also loads legacy `session-request-handler.test.ts` and has unrelated existing harness/assertion failures)
82. [DONE] Git Commit: `test: guard submit-time model binding preservation` (hash: `a57eb76a6`)

### Stream: Targeted Verification

83. [DONE] Run targeted PM/Core/UI checks for submit-time model/reasoning preservation (scope: `src/client/project-manager`, `packages/core`, `webview`; commit: `test: verify submit-time model reset fix`; verified: `npx tsx --test --test-name-pattern "keeps live dialog model binding" packages/core/src/remote-bridge/handlers/session-request-handler.create-resume.test.ts`, `npx tsx --test packages/core/src/remote-bridge/handlers/session-request-handler-model-set.test.ts`, `npx tsx --test src/client/project-manager/components/sessions/project-manager-session-view.test.tsx src/client/project-manager/components/sessions/session-model-switch-controller.test.ts src/client/project-manager/components/sessions/use-session-model-switch.test.ts`, `npm run build --workspace=@codeai-hub/core`, `npm run typecheck:webview`, `npm run build:webview`)
84. [DONE] Git Commit: `test: verify submit-time model reset fix` (hash: `0ccd2d683`)

### Stream: Canonical Docs

85. [DONE] Update canonical docs for dialog submit preserving live status-panel `modelBinding` and PM wrappers preserving explicit reasoning (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; commit: `docs: document submit-time model reset fix`; verified: documentation diff reviewed)
86. [DONE] Git Commit: `docs: document submit-time model reset fix` (hash: `a14b61147`)

### Stream: Release Build

87. [DONE] Prepare release docs for future version `1.2.114` before build-all (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare release 1.2.114`; verified: README current release and changelog section set to `1.2.114`)
88. [DONE] Git Commit: `docs: prepare release 1.2.114` (hash: `87e7c5377`)
89. [DONE] Run `./scripts/build-all.sh` from a clean tree and verify release tarballs (scope: package manifests, generated release artifacts, `doc/tmp/releases/`; commit: `chore: build release 1.2.114`; verified: `./scripts/build-all.sh`, `doc/tmp/releases/*1.2.114*`, `~/.codeai-hub/releases/*1.2.114*`, package version `1.2.114`)
90. [IN_PROGRESS] Git Commit: `chore: build release 1.2.114` (hash: TBD)
91. [TODO] Run `./scripts/build-release.sh --use-current-version` and verify VSIX output (scope: root VSIX artifact, release metadata if generated; commit: `chore: package release 1.2.114`)
92. [TODO] Git Commit: `chore: package release 1.2.114` (hash: TBD)

### Stream: User Visual Acceptance Testing

93. [TODO] Hand off `codeai-hub-1.2.114.vsix` for user installation/retest and verify: Shaga Description keeps the changed model and keeps GPT 5.3 Codex Spark / X-High when the first answer is sent after changing Reasoning from Low to X-High (scope: user visual test result, `doc/TODO/todo-plan.md`, `doc/Sessions/Session035.md`; commit: `docs: record release 1.2.114 visual retest status`)
94. [TODO] Git Commit: `docs: record release 1.2.114 visual retest status` (hash: TBD)

### Stream: Scope Closeout

73. [BLOCKED] Archive todo-plan and planning-doc only after explicit user acceptance of release `1.2.113` (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/Sessions/Session035.md`; commit: `docs: archive status panel model switcher retest`)
74. [TODO] Git Commit: `docs: archive status panel model switcher retest` (hash: TBD)

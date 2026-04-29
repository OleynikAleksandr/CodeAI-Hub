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
14. [IN_PROGRESS] Git Commit: `fix(claude): pass xhigh effort to sdk` (hash: TBD)
15. [TODO] Add provider applied-config compatibility tests for Codex/Gemini selected model and reasoning payloads (scope: `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.test.ts`, `packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts`; commit: `test(providers): verify selected model reasoning payloads`)
16. [TODO] Git Commit: `test(providers): verify selected model reasoning payloads` (hash: TBD)

---

## Phase 3 - Shared UI Picker Module (owner: Codex, updated: 2026-04-29)

### Stream: Option Facade

17. [TODO] Add provider-neutral status-panel switcher option facade (scope: `src/client/ui/src/session/model-switcher/session-model-switcher-facade.ts`, `src/client/ui/src/session/model-switcher/session-model-switcher-facade.test.ts`; commit: `feat(ui): add session model switcher facade`)
18. [TODO] Git Commit: `feat(ui): add session model switcher facade` (hash: TBD)
19. [TODO] Add picker card components for model and reasoning choices (scope: `src/client/ui/src/session/model-switcher/session-model-picker-card.tsx`, `src/client/ui/src/session/model-switcher/session-reasoning-picker-card.tsx`, `media/session-view.css`; commit: `feat(ui): add session model picker cards`)
20. [TODO] Git Commit: `feat(ui): add session model picker cards` (hash: TBD)
21. [TODO] Wire StatusPanel callbacks and picker rendering without PM imports (scope: `src/client/ui/src/session/status-panel.tsx`, `src/client/ui/src/session/session-view.tsx`, `src/client/ui/src/session/status-panel.test.tsx`; commit: `feat(ui): make status model chips interactive`)
22. [TODO] Git Commit: `feat(ui): make status model chips interactive` (hash: TBD)

---

## Phase 4 - Project Manager Orchestration (owner: Codex, updated: 2026-04-29)

### Stream: Settings Save Plus Binding Update

23. [TODO] Add PM controller for selection -> settings save -> `session:model:set` (scope: `src/client/project-manager/components/sessions/session-model-switch-controller.ts`, `src/client/project-manager/components/sessions/session-model-switch-controller.test.ts`; commit: `feat(pm): orchestrate session model selections`)
24. [TODO] Git Commit: `feat(pm): orchestrate session model selections` (hash: TBD)
25. [TODO] Add React hook for runtime and dialog session switch wiring (scope: `src/client/project-manager/components/sessions/use-session-model-switch.ts`, `src/client/project-manager/components/sessions/use-session-model-switch.test.ts`; commit: `feat(pm): add session model switch hook`)
26. [TODO] Git Commit: `feat(pm): add session model switch hook` (hash: TBD)
27. [TODO] Wire runtime and reopened dialog views to the shared switch hook (scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`, `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`; commit: `feat(pm): wire status panel model switching`)
28. [TODO] Git Commit: `feat(pm): wire status panel model switching` (hash: TBD)

---

## Phase 5 - Documentation And Targeted Verification (owner: Codex, updated: 2026-04-29)

### Stream: Canonical Docs

29. [TODO] Update canonical architecture docs for status-panel model switching (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`, `doc/SolidWorks-WorkFlow/Modules/Session_UI/SessionStatusPanel.md`; commit: `docs: document status panel model switching`)
30. [TODO] Git Commit: `docs: document status panel model switching` (hash: TBD)
31. [TODO] Update Docs Index and active planning status after implementation (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Plans/StatusPanel_ModelReasoningSwitch_Architecture.md`, `doc/TODO/todo-plan.md`; commit: `docs: index status panel model switcher`)
32. [TODO] Git Commit: `docs: index status panel model switcher` (hash: TBD)

### Stream: Targeted Verification

33. [TODO] Run targeted unit/build checks for Core, PM UI, and provider compatibility (scope: `packages/core`, `src/client`, `packages/Claude_Module`, `packages/Codex_AppServer_Module`, `packages/Gemini_Module`; commit: `test: verify status panel model switching`)
34. [TODO] Git Commit: `test: verify status panel model switching` (hash: TBD)

---

## Phase 6 - Release Build And Closeout (owner: Codex, updated: 2026-04-29)

### Stream: Release Preparation

35. [TODO] Prepare release docs for future version before build-all (scope: `README.md`, `CHANGELOG.md`, relevant `doc/` release notes if needed; commit: `docs: prepare release 1.2.112`)
36. [TODO] Git Commit: `docs: prepare release 1.2.112` (hash: TBD)
37. [TODO] Run `./scripts/build-all.sh` from a clean tree and move/verify release tarballs (scope: versioned package manifests, generated release artifacts, `doc/tmp/releases/`; commit: `chore: build release 1.2.112`)
38. [TODO] Git Commit: `chore: build release 1.2.112` (hash: TBD)
39. [TODO] Run `./scripts/build-release.sh --use-current-version` and verify VSIX output (scope: root VSIX artifact, release metadata if generated; commit: `chore: package release 1.2.112`)
40. [TODO] Git Commit: `chore: package release 1.2.112` (hash: TBD)

### Stream: Archive Completed Scope

41. [TODO] Archive completed todo-plan and planning-doc, update Docs Index/session report (scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/Sessions/Session035.md`; commit: `docs: archive status panel model switcher`)
42. [TODO] Git Commit: `docs: archive status panel model switcher` (hash: TBD)

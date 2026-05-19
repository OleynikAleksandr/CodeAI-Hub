# План разработки (Development TODO Plan)

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "glm-claude-code-provider-replacement-2026-05-19",
  "branch": "main",
  "baseHead": "6a69c53c4",
  "lastRecordedCommit": "de33782dd",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md",
  "currentTaskId": "phase8-claude-kimi-boundary-docs",
  "expectedCommitMessage": "docs: sync glm claude code provider boundaries",
  "debt": {
    "expectedCommitMessage": "docs: sync glm claude code provider boundaries",
    "preCommitHead": "de33782dd",
    "stage": "commit_pending",
    "taskId": "phase8-claude-kimi-boundary-docs"
  }
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Kimi.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading перед каждым фиксом:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`.
- Каждая подзадача должна затрагивать не более 3 файлов/пакетов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit: ...`.
- Гейты через Husky не обходить.
- Новый provider scope заменяет эксперимент `kimi-claude-code` на `glm-claude-code`; native Kimi Wire provider (`kimiCode`) остается основным Kimi provider.
- До реализации full provider integration нужно сохранить возможность вписать Z.AI API key в isolated provider settings/config без пересечения с настоящим Claude Code home.
- **Release Build Confirmation Gate:** после targeted verification остановиться и отдельно спросить пользователя, собирать ли release.
- `Scope Closeout` выполняется только после явного acceptance пользователя.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-05-19)
### Stream: GLM-Claude-Code Planning Source
1. [DONE] `phase0-glm-claude-code-planning-intake` Создать planning-документ для замены экспериментального `kimi-claude-code` на `glm-claude-code`, включая provider-home isolation, Z.AI API-key settings/config, Claude Code-compatible endpoint, provider surfaces, diagnostics, verification and release gates — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan glm claude code provider replacement`.
2. [DONE] Git Commit: `docs: plan glm claude code provider replacement` (hash: fe009d553)

## Phase 1 — User Planning Acceptance (owner: User, updated: 2026-05-19)
### Stream: Planning Review
1. [DONE] `phase1-glm-claude-code-planning-review` Пользователь проверяет planning-документ и подтверждает implementation slicing / replacement strategy — scope: без изменения файлов; expected commit: none. Result: Пользователь принял направление: заменить экспериментальный Claude-Kimi/kimi-claude-code на GLM-Claude-Code и подготовить implementation slicing.

## Phase 2 — Implementation Plan Slicing (owner: Codex, updated: 2026-05-19)
### Stream: Implementation Slicing
1. [DONE] `phase2-glm-claude-code-implementation-slicing` Нарезать implementation scope по принятому planning-документу на микрозадачи ≤3 файлов/пакетов, включая replacement `kimiClaudeCode -> glmClaudeCode`, isolated config/settings, UI surfaces, diagnostics, verification, release gate, user acceptance and closeout — scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md`; expected commit: `docs: slice glm claude code implementation plan`.
2. [DONE] Git Commit: `docs: slice glm claude code implementation plan` (hash: efee980ab)

## Phase 3 — Claude Module Runtime Replacement (owner: Codex, updated: 2026-05-19)
### Stream: GLM Runtime Profile
1. [DONE] `phase3-glm-auth-config-profile` Replace Kimi-Claude-Code auth/config resolver with GLM config resolver: isolated config path, Z.AI API key source, base URL/model defaults and secret-safe diagnostics — scope: `packages/Claude_Module/src/auth/kimi-claude-code-auth-profile.ts, packages/Claude_Module/src/auth/glm-claude-code-auth-profile.ts, packages/Claude_Module/src/kimi-claude-code/kimi-claude-code-runtime-profile.ts, packages/Claude_Module/src/glm-claude-code/glm-claude-code-runtime-profile.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: replace kimi claude code auth with glm profile`.
2. [DONE] Git Commit: `refactor: replace kimi claude code auth with glm profile` (hash: 21aefa580)
3. [DONE] `phase3-glm-adapter-facade` Rename provider facade/auth manager exports from Kimi-Claude-Code to GLM-Claude-Code and keep Claude SDK workflow prompt/tool profile unchanged — scope: `packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/glm-claude-code, packages/Claude_Module/src/index.ts, packages/Claude_Module/src/sdk/claude-runtime-profile.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: replace kimi claude code provider facade with glm`.
4. [DONE] Git Commit: `refactor: replace kimi claude code provider facade with glm` (hash: 8c32a181a)
5. [DONE] `phase3-glm-capabilities-lifecycle-diagnostics` Rename model capabilities, stale-binding lifecycle and live probe runner to GLM with model defaults `glm-5.1`, `glm-5-turbo`, `glm-4.5-air` — scope: `packages/Claude_Module/src/glm-claude-code, packages/Claude_Module/src/session, packages/Claude_Module/src/diagnostics, packages/Claude_Module/src/kimi-claude-code, packages/Claude_Module/src/types/index.ts, packages/Claude_Module/src/index.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: replace kimi claude code diagnostics with glm`.
6. [DONE] Git Commit: `refactor: replace kimi claude code diagnostics with glm` (hash: 6fa8f2344)

## Phase 4 — Core Provider Registry And Settings Contract (owner: Codex, updated: 2026-05-19)
### Stream: Core Registration
1. [DONE] `phase4-glm-provider-types-loader` Replace Core provider loader/type exports from `kimiClaudeCode` to `glmClaudeCode` without touching native Kimi provider id — scope: `packages/core/src/provider-registry/provider-module-loader.types.ts, packages/core/src/provider-registry/provider-module-loader.ts, src/types/provider.ts`; expected commit: `refactor: register glm claude code provider type`.
2. [DONE] Git Commit: `refactor: register glm claude code provider type` (hash: 1df060971)
3. [DONE] `phase4-glm-provider-descriptor-recovery` Replace descriptor factory, registry index and recovery hint with GLM provider name, reporter namespace and missing-key hint — scope: `packages/core/src/provider-registry/provider-descriptor-factory.ts, packages/core/src/provider-registry/index.ts, packages/core/src/provider-registry/provider-recovery-coordinator.ts, packages/core/src/provider-registry/provider-module-loader.ts, packages/core/src/provider-registry/provider-module-loader.types.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: replace kimi claude code registry descriptor with glm`.
4. [DONE] Git Commit: `refactor: replace kimi claude code registry descriptor with glm` (hash: f6d56796c)
5. [DONE] `phase4-glm-turn-config-settings` Replace settings snapshot and applied turn config keys with `providers.glmClaudeCode`, GLM model defaults and GLM env override names — scope: `packages/core/src/config/provider-settings-snapshot.ts, packages/core/src/config/provider-turn-config-resolver.ts, doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit: `refactor: resolve glm claude code turn config`.
6. [DONE] Git Commit: `refactor: resolve glm claude code turn config` (hash: c3d4d4470)
7. [DONE] `phase4-glm-native-capture-core` Replace native request capture provider id/target/reasoning override for GLM endpoint and remove Kimi-Claude-Code capture target — scope: `packages/core/src/provider-network-capture/native-request-capture-facade.ts, packages/core/src/provider-network-capture/native-request-capture-types.ts, packages/core/src/provider-network-capture/native-request-capture-reasoning-override.ts`; expected commit: `refactor: capture glm claude code native requests`.
8. [DONE] Git Commit: `refactor: capture glm claude code native requests` (hash: 8e97e7fb0)

## Phase 5 — Settings UI And Local Config Surface (owner: Codex, updated: 2026-05-19)
### Stream: Settings Model
1. [DONE] `phase5-glm-settings-state-model` Replace UI raw/settings model types from Kimi-Claude-Code to GLM-Claude-Code and include API-key/base-url/model fields needed for local config materialization — scope: `src/client/ui/src/components/settings/settings-state-raw.ts, src/client/ui/src/components/settings/settings-state-model.ts, src/client/ui/src/components/settings/settings-state-helpers.ts, src/client/ui/src/components/settings/kimi-settings-state.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: add glm claude code settings state`.
2. [DONE] Git Commit: `refactor: add glm claude code settings state` (hash: fe40f5bac)
3. [DONE] `phase5-glm-settings-card` Replace `Claude-Kimi` settings card with `GLM-Claude-Code` card that exposes isolated config path/API key guidance, base URL and model defaults without referencing real Claude home — scope: `src/client/ui/src/components/settings, doc/TODO/todo-plan.md`; expected commit: `refactor: replace claude kimi settings card with glm`.
4. [DONE] Git Commit: `refactor: replace claude kimi settings card with glm` (hash: 245f9c76c)
5. [DONE] `phase5-glm-pm-settings-bridge` Replace Project Manager settings bridge handlers from Kimi-Claude-Code to GLM-Claude-Code so PM settings save/load and default model lookup use `providers.glmClaudeCode` — scope: `src/client/project-manager/components/settings/project-manager-settings-host-message.ts, src/client/project-manager/components/settings/use-project-manager-kimi-settings-handlers.ts, src/client/project-manager/components/settings/use-project-manager-settings-state.ts`; expected commit: `refactor: wire glm claude code project manager settings`.
6. [DONE] Git Commit: `refactor: wire glm claude code project manager settings` (hash: 0d39ebb7b)
7. [DONE] `phase5-glm-settings-persistence` Replace Core settings persistence defaults/normalization from `kimiClaudeCode` to `glmClaudeCode`, including config defaults and secret-safe reset behavior — scope: `packages/core/src/remote-bridge/handlers/settings-persistence-snapshot.ts, src/client/ui/src/components/settings/kimi-settings-state.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: persist glm claude code settings`.
8. [DONE] Git Commit: `refactor: persist glm claude code settings` (hash: 61cdc84df)

## Phase 6 — Provider Selection Surfaces (owner: Codex, updated: 2026-05-19)
### Stream: Workflow Cards
1. [DONE] `phase6-glm-start-card-model-selection` Replace start-card model labels/defaults with `GLM 5.1 / Claude-Code` and preserve native Kimi separately — scope: `src/client/project-manager/components/shared/stage-start-model-selection.ts, src/client/project-manager/services/workflow-step-start-service.ts, src/client/project-manager/services/workflow-provider-resolver.ts`; expected commit: `refactor: show glm claude code in workflow start cards`.
2. [DONE] Git Commit: `refactor: show glm claude code in workflow start cards` (hash: 7f5231308)
3. [DONE] `phase6-glm-card-provider-tint` Replace provider guards/tints in shared confirmation and Development Tree start cards from Kimi-Claude-Code to GLM-Claude-Code — scope: `src/client/project-manager/components/shared/stage-confirmation-card.tsx, src/client/project-manager/components/shared/stage-confirmation-card-workflow.ts, src/client/project-manager/components/shared/stage-confirmation-card-provider-tint.ts`; expected commit: `refactor: show glm claude code provider tint`.
4. [DONE] Git Commit: `refactor: show glm claude code provider tint` (hash: c43a2fca7)
5. [DONE] `phase6-glm-description-devtree-picker` Replace Description provider picker copy and Development Tree provider guard so only native Kimi plus GLM-Claude-Code appear — scope: `src/client/project-manager/components/description/description-provider-picker.tsx, src/client/project-manager/components/layout/development-tree-node-start-card.tsx, src/client/project-manager/components/layout/use-step-provider-resolver.ts`; expected commit: `refactor: expose glm claude code in step pickers`.
6. [DONE] Git Commit: `refactor: expose glm claude code in step pickers` (hash: 57b7ce667)

## Phase 7 — Session UI And Capture Workbench (owner: Codex, updated: 2026-05-19)
### Stream: Session Identity
1. [DONE] `phase7-glm-session-identity` Replace session status/model identity helpers and provider candidates with GLM-Claude-Code labels while keeping native Kimi labels unchanged — scope: `src/client/ui/src/session/model-info-builder.ts, src/client/ui/src/session/helpers.ts, src/client/ui/src/session/session-candidates.ts`; expected commit: `refactor: show glm claude code session identity`.
2. [DONE] Git Commit: `refactor: show glm claude code session identity` (hash: 6fb199d2b)
3. [DONE] `phase7-glm-session-bars` Replace status panel/session id bar provider mapping for GLM-Claude-Code and avoid reusing Kimi-only usage rows — scope: `src/client/ui/src/session/status-panel.tsx, src/client/ui/src/session/session-id-bar.tsx, src/client/project-manager/core-stream-message-types.ts`; expected commit: `refactor: show glm claude code status surfaces`.
4. [DONE] Git Commit: `refactor: show glm claude code status surfaces` (hash: 60ea2359d)
5. [DONE] `phase7-glm-capture-workbench-ui` Replace Capture Workbench provider/model/reasoning defaults from Claude-Kimi to GLM-Claude-Code — scope: `src/client/project-manager/components/capture-workbench/provider-selector.tsx, src/client/project-manager/components/capture-workbench/selection-bar.tsx, src/client/project-manager/components/capture-workbench/model-reasoning-selectors.tsx`; expected commit: `refactor: expose glm claude code in capture workbench`.
6. [DONE] Git Commit: `refactor: expose glm claude code in capture workbench` (hash: f8cd1b0a5)
7. [DONE] `phase7-glm-capture-workbench-runner` Replace Capture Workbench runner provider validation/defaults for GLM-Claude-Code and GLM model ids — scope: `src/client/project-manager/services/capture-workbench-runner.ts, src/client/project-manager/services/provider-snapshot.ts, doc/TODO/todo-plan.md`; expected commit: `refactor: route glm claude code capture runner`.
8. [DONE] Git Commit: `refactor: route glm claude code capture runner` (hash: 9fe746c2d)

## Phase 8 — Documentation Sync (owner: Codex, updated: 2026-05-19)
### Stream: Module Documentation
1. [DONE] `phase8-glm-module-doc` Replace active Kimi-Claude-Code module doc with GLM-Claude-Code SSOT and update Docs Index module list/Plans note — scope: `doc/SolidWorks-WorkFlow/Modules/Kimi_Claude_Code.md, doc/SolidWorks-WorkFlow/Modules/GLM_Claude_Code.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: document glm claude code module`.
2. [DONE] Git Commit: `docs: document glm claude code module` (hash: de33782dd)
3. [DONE] `phase8-claude-kimi-boundary-docs` Sync Claude/Kimi docs: remove active Kimi-Claude-Code boundary, add GLM-Claude-Code runtime-profile boundary, keep native Kimi Wire as primary Kimi provider — scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md, doc/SolidWorks-WorkFlow/Modules/Kimi.md, doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md`; expected commit: `docs: sync glm claude code provider boundaries`.
4. [PENDING] Git Commit: `docs: sync glm claude code provider boundaries` (hash: TBD)

## Phase 9 — Targeted Verification (owner: Codex, updated: 2026-05-19)
### Stream: Focused Checks
1. [TODO] `phase9-glm-provider-tests` Run focused tests for changed Claude module/Core provider registry/settings/capture paths; add repair microtasks before continuing if failures are implementation-related — scope: `packages/Claude_Module, packages/core, doc/TODO/todo-plan.md`; expected commit: `test: verify glm claude code provider replacement`.
2. [TODO] Git Commit: `test: verify glm claude code provider replacement` (hash: TBD)
3. [TODO] `phase9-glm-target-builds` Run targeted builds/typechecks for changed provider/core/UI packages and record exact results — scope: `packages/Claude_Module, packages/core, src/client`; expected commit: `chore: verify glm claude code targeted builds`.
4. [TODO] Git Commit: `chore: verify glm claude code targeted builds` (hash: TBD)
5. [TODO] `phase9-glm-local-config-template` Create isolated local GLM provider config/home template outside Git for user API-key entry and verify missing-key failure is explicit — scope: `~/.codeai-hub/providers/glm-claude-code/config.json, ~/.codeai-hub/providers/glm-claude-code/home, doc/TODO/todo-plan.md`; expected commit: `docs: record glm claude code local config setup`.
6. [TODO] Git Commit: `docs: record glm claude code local config setup` (hash: TBD)
7. [TODO] `phase9-glm-live-smoke` After user enters Z.AI API key, run live smoke through GLM-Claude-Code on short answer and workflow-style prompt; verify visible output, completion, input unlock and no real Claude home writes — scope: `doc/SolidWorks-WorkFlow/Plans/GLM_Claude_Code_Provider_Planning_RU.md, doc/TODO/todo-plan.md`; expected commit: `docs: record glm claude code live smoke result`.
8. [TODO] Git Commit: `docs: record glm claude code live smoke result` (hash: TBD)

## Phase 10 — Release Build Confirmation Gate (owner: Codex, updated: 2026-05-19)
### Stream: Release Confirmation
1. [TODO] `phase10-glm-release-confirmation` После targeted verification остановиться и запросить отдельное явное подтверждение пользователя на release build; до подтверждения не менять README/CHANGELOG версии и не запускать `build-all.sh`/`build-release.sh` — scope: без изменения файлов; expected commit: none.

## Phase 11 — Release Build (owner: Codex, updated: 2026-05-19)
### Stream: Release Build
1. [TODO] `phase11-glm-release-notes` После явного подтверждения пользователя обновить README/CHANGELOG на будущую версию и связанные docs, если затронуты — scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare glm claude code release notes`.
2. [TODO] Git Commit: `docs: prepare glm claude code release notes` (hash: TBD)
3. [TODO] `phase11-glm-build-all` Запустить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить VSIX/release artifacts and record result — scope: `package manifests, assets manifests, doc/TODO/todo-plan.md`; expected commit: `chore: build glm claude code release`.
4. [TODO] Git Commit: `chore: build glm claude code release` (hash: TBD)

## Phase 12 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-19)
### Stream: GLM-Claude-Code Retest
1. [TODO] `phase12-glm-user-retest` Пользователь устанавливает релиз и проверяет native `Kimi` плюс `GLM-Claude-Code`: Settings API key/config, step start cards, session start, progress/final output, status line, Capture Workbench and next-step provider inheritance — scope: без изменения файлов; expected commit: none.

## Phase 13 — Scope Closeout (owner: Codex, updated: 2026-05-19)
### Stream: Scope Closeout
1. [TODO] `phase13-glm-closeout` После явного acceptance архивировать active plan, disposition planning source, обновить Docs Index и связанные ссылки — scope: `doc/TODO/todo-plan.md, doc/TODO/Archive, doc/SolidWorks-WorkFlow/Plans, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close glm claude code provider replacement scope`.
2. [TODO] Git Commit: `docs: close glm claude code provider replacement scope` (hash: TBD)
3. [TODO] `phase13-glm-post-closeout-anchor` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle — scope: handoff only; expected commit: none.

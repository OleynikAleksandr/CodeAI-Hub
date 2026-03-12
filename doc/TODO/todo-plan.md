# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/ProjectManager_WorkspaceIdentity_Stabilization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/Sessions/Session067.md`
  - `doc/Sessions/Session068.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Release stream закрывается только на чистом дереве и строго по `Release Build Checklist`.
- Retry submit UX и dynamic provider/model switching в этом плане сознательно не реализуются; они возвращаются отдельной design phase после стабилизации 4 базовых workflow steps.

---

## Phase 296 — Workspace Execution Profile Lock (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Core execution profile SSOT
1. [DONE] Добавить типы/store/facade для `.codeai-hub/<workspaceSlug>/runtime/execution-profile.json` и legacy bootstrap существующих workspace без profile (scope: `packages/core/src/workflow/execution-profile/`; expected commit: `feat(core): add workspace execution profile store`).
2. [DONE] Git Commit: `feat(core): add workspace execution profile store` (hash: `8555843b`)
3. [DONE] Привязать workflow session creation/read paths в Core к locked execution profile и запретить provider drift после первого `Description submit` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/provider-registry/index.ts`; expected commit: `feat(core): lock workflow sessions to workspace profile`).
4. [DONE] Git Commit: `feat(core): lock workflow sessions to workspace profile` (hash: `4dcfffea`)

### Stream 2: Codex resume simplification
5. [DONE] Убрать global-settings-based special-case `resume -> create new thread` из workflow path Codex и резолвить workflow create/resume только через locked workspace profile (scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/core/src/provider-registry/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(codex): resume locked workflow threads`).
6. [DONE] Git Commit: `fix(codex): resume locked workflow threads` (hash: `765d2323`)

---

## Phase 297 — Description Metadata Hardening (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Atomic description snapshot
1. [DONE] Сделать `DescriptionStepStore` атомарным и сериализованным по workspace, с явным логированием corruption/read failures вместо silent `null` (scope: `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-store-storage.ts`, `packages/core/src/workflow/description/description-step-store.test.ts`; expected commit: `fix(core): harden description step store`).
2. [DONE] Git Commit: `fix(core): harden description step store` (hash: `e76881b1`)
3. [DONE] Восстанавливать `workflow-state.description` по каноническим файлам на диске и перестать показывать `description-step.json` как user-facing artifact (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/workflow/description/description-artifact-recovery.ts`; expected commit: `fix(core): recover description artifacts from filesystem`).
4. [DONE] Git Commit: `fix(core): recover description artifacts from filesystem` (hash: `f77dc2d5`)

---

## Phase 298 — Project Manager Shared Workflow State (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Shared workflow snapshot
1. [DONE] Вынести единый shared source для `workflow-state`, чтобы tree/main area/auto-select читали один snapshot вместо независимых polling-контуров (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/use-workspace-workflow-state.ts`; expected commit: `refactor(pm): share workflow state across layout`).
2. [DONE] Git Commit: `refactor(pm): share workflow state across layout` (hash: `e6cd53da`)
3. [DONE] Выровнять fallback/session selection для `description` между tree и main area через общий helper без альтернативных runtime path (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/description-workflow-state.ts`; expected commit: `fix(pm): align description fallback with locked workspace profile`).
4. [DONE] Git Commit: `fix(pm): align description fallback with locked workspace profile` (hash: `b03cec52`)
5. [DONE] Добавить `executionProfile` в PM workflow snapshot и показать в `Description` questionnaire read-only summary с locked provider/model для текущего workspace без альтернативных runtime path (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-execution-profile-client.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `feat(pm): show workspace execution lock summary`).
6. [DONE] Git Commit: `feat(pm): show workspace execution lock summary` (hash: `bfece482`)

### Stream 2: Provider lock warning in picker
7. [DONE] Добавить в provider picker после `Submit questionnaire` заметное красное предупреждение, что в MVP выбор provider и его default model фиксируется один раз на весь workspace (scope: `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`, `packages/ui/project-manager/styles.css`; expected commit: `feat(pm): warn about workspace provider lock in picker`).
8. [DONE] Git Commit: `feat(pm): warn about workspace provider lock in picker` (hash: `6bdfbede`)

---

## Phase 299 — Regression Coverage And Closeout (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Regression verification
1. [DONE] Добавить таргетные regression tests для execution profile lock и Description recovery в Core (scope: `packages/core/src/workflow/`, `packages/core/src/remote-bridge/handlers/`; expected commit: `test(core): cover workspace identity stabilization`).
2. [DONE] Git Commit: `test(core): cover workspace identity stabilization` (hash: `035215a0`)
3. [DONE] Добавить unit regression test для `description-workflow-state`, чтобы зафиксировать единый fallback/session selection для `questionnaire`/`draft`/`final` и collector-session precedence (scope: `src/client/project-manager/components/layout/description-workflow-state.ts`, `src/client/project-manager/components/layout/description-workflow-state.test.ts`; expected commit: `test(pm): cover description workflow fallback helper`).
4. [DONE] Git Commit: `test(pm): cover description workflow fallback helper` (hash: `251fe948`)
5. [DONE] Добавить source-level regression test, что tree/main area читают workflow snapshot только через shared `useWorkspaceWorkflowState` path без возврата к split polling (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`, `src/client/project-manager/components/layout/use-workspace-workflow-state.ts`; expected commit: `test(pm): cover shared workflow state entrypoint`).
6. [DONE] Git Commit: `test(pm): cover shared workflow state entrypoint` (hash: `ef32d520`)
7. [DONE] Синхронно обновить closeout docs по результатам stabilization implementation после закрытия PM regression coverage (scope: `doc/SolidWorks-WorkFlow/`, `doc/Sessions/`, `doc/TODO/todo-plan.md`; expected commit: `docs(pm): sync workspace identity stabilization closeout`).
8. [DONE] Git Commit: `docs(pm): sync workspace identity stabilization closeout` (hash: `a2fc590a`)

### Stream 2: Release build by checklist
5. [DONE] После закрытия implementation/regression streams актуализировать release-facing документы под следующий patch release, который поднимет `build-all.sh`: `README.md` и `CHANGELOG.md` с итогами workspace identity stabilization (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): prepare workspace identity stabilization release notes`).
6. [DONE] Git Commit: `docs(release): prepare workspace identity stabilization release notes` (hash: `781ed5c1`)
7. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать version/manifest bump до `1.1.717` и подготовить репозиторий к финальному VSIX packaging (scope: `package.json`, `package-lock.json`, `assets/**/manifest.json` и package manifests; expected commit: `build(release): stage workspace identity stabilization artifacts`).
8. [DONE] Git Commit: `build(release): stage workspace identity stabilization artifacts` (hash: `662b717c`)
9. [DONE] После clean commit от `build-all` выполнить `./scripts/build-release.sh --use-current-version`, проверить `codeai-hub-1.1.717.vsix`, зафиксировать release/session closeout и итоговую поставку (scope: `doc/Sessions/`, `doc/TODO/todo-plan.md`, release artefacts/checklist results; expected commit: `build(release): ship workspace identity stabilization`).
10. [TODO] Git Commit: `build(release): ship workspace identity stabilization` (hash: TBD)

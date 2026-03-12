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
2. [IN_PROGRESS] Git Commit: `feat(core): add workspace execution profile store` (hash: TBD)
3. [TODO] Привязать workflow session creation/read paths в Core к locked execution profile и запретить provider drift после первого `Description submit` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/provider-registry/index.ts`; expected commit: `feat(core): lock workflow sessions to workspace profile`).
4. [TODO] Git Commit: `feat(core): lock workflow sessions to workspace profile` (hash: TBD)

### Stream 2: Codex resume simplification
5. [TODO] Убрать global-settings-based special-case `resume -> create new thread` из workflow path Codex и резолвить workflow create/resume только через locked workspace profile (scope: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts`, `packages/core/src/provider-registry/index.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `fix(codex): resume locked workflow threads`).
6. [TODO] Git Commit: `fix(codex): resume locked workflow threads` (hash: TBD)

---

## Phase 297 — Description Metadata Hardening (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Atomic description snapshot
1. [TODO] Сделать `DescriptionStepStore` атомарным и сериализованным по workspace, с явным логированием corruption/read failures вместо silent `null` (scope: `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-types.ts`; expected commit: `fix(core): harden description step store`).
2. [TODO] Git Commit: `fix(core): harden description step store` (hash: TBD)
3. [TODO] Восстанавливать `workflow-state.description` по каноническим файлам на диске и перестать показывать `description-step.json` как user-facing artifact (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/workflow/description/description-step-store.ts`; expected commit: `fix(core): recover description artifacts from filesystem`).
4. [TODO] Git Commit: `fix(core): recover description artifacts from filesystem` (hash: TBD)

---

## Phase 298 — Project Manager Shared Workflow State (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Shared workflow snapshot
1. [TODO] Вынести единый shared source для `workflow-state`, чтобы tree/main area/auto-select читали один snapshot вместо независимых polling-контуров (scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/use-workspace-workflow-state.ts`; expected commit: `refactor(pm): share workflow state across layout`).
2. [TODO] Git Commit: `refactor(pm): share workflow state across layout` (hash: TBD)
3. [TODO] Выровнять fallback логики `description` и показать locked provider/model в read-only виде без альтернативных runtime path (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `fix(pm): align description fallback with locked workspace profile`).
4. [TODO] Git Commit: `fix(pm): align description fallback with locked workspace profile` (hash: TBD)

### Stream 2: Provider lock warning in picker
5. [TODO] Добавить в provider picker после `Submit questionnaire` заметное красное предупреждение, что в MVP выбор provider и его default model фиксируется один раз на весь workspace (scope: `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`, `packages/ui/project-manager/styles.css`; expected commit: `feat(pm): warn about workspace provider lock in picker`).
6. [TODO] Git Commit: `feat(pm): warn about workspace provider lock in picker` (hash: TBD)

---

## Phase 299 — Regression Coverage And Closeout (owner: Oleksandr, updated: 2026-03-12)

### Stream 1: Regression verification
1. [TODO] Добавить таргетные regression tests для execution profile lock и Description recovery в Core (scope: `packages/core/src/workflow/`, `packages/core/src/remote-bridge/handlers/`; expected commit: `test(core): cover workspace identity stabilization`).
2. [TODO] Git Commit: `test(core): cover workspace identity stabilization` (hash: TBD)
3. [TODO] Добавить PM regression coverage для shared workflow-state/fallback и синхронно обновить closeout docs по результатам реализации (scope: `src/client/project-manager/components/layout/`, `doc/SolidWorks-WorkFlow/`, `doc/Sessions/`; expected commit: `test(pm): cover shared workflow state recovery`).
4. [TODO] Git Commit: `test(pm): cover shared workflow state recovery` (hash: TBD)

### Stream 2: Release build by checklist
5. [TODO] После закрытия всех implementation streams и на чистом дереве актуализировать release-facing документы перед сборкой: `README.md`, `CHANGELOG.md` и связанные архитектурные материалы по итоговой реализации stabilization plan (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/`; expected commit: `docs(release): prepare workspace identity stabilization release notes`).
6. [TODO] Git Commit: `docs(release): prepare workspace identity stabilization release notes` (hash: TBD)
7. [TODO] Выполнить release build строго по `Release Build Checklist`: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, перенести/проверить артефакты в `doc/tmp/releases/`, зафиксировать результаты в session closeout (scope: `scripts/`, `doc/tmp/releases/`, `doc/Sessions/`; expected commit: `build(release): ship workspace identity stabilization`).
8. [TODO] Git Commit: `build(release): ship workspace identity stabilization` (hash: TBD)

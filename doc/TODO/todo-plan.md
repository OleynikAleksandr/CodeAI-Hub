# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/Sessions/Session050.md`
- TODO Plan состоит из Phase/Stream, каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещен).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 271 — Release verification for session changes (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** после документных и архитектурных изменений текущей сессии нужен отдельный цикл проверки релизной сборкой.

### Stream 0: Build and release verification
1. [DONE] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать новую версию (scope: release manifests + versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `a5a44424`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить release output checklist (`Verifying SDK exclusions`, `Removing dev dependencies`, `✅ Package created`) и зафиксировать итоги в session report (scope: `doc/Sessions/Session050.md`; expected commit: `docs(session): record release verification for phase271`).
4. [DONE] Git Commit: `docs(session): record release verification for phase271` (hash: `591a030e`)

---

## Phase 272 — Standalone Reviewer module (DEFERRED / NOT STARTED) (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** фаза специально оставлена «висящей», чтобы не потерять модуль в roadmap.
**Ссылка на архитектурный черновик:** `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`

### Stream 0: Design Gate (parking)
1. [TODO] При старте фазы провести review/апдейт архитектурного черновика `StandaloneReviewer_Module.md` и подтвердить финальный контракт standalone reviewer (scope: `doc/SolidWorks-WorkFlow/Contracts/StandaloneReviewer_Module.md`; expected commit: `docs(reviewer): approve standalone reviewer module contract`).
2. [TODO] Git Commit: `docs(reviewer): approve standalone reviewer module contract` (hash: TBD)
3. [BLOCKED] После утверждения контракта пользователем синхронизировать SSOT workflow boundary (`WorkflowSteps_Overview.md`, `SystemArchitecture.md`) (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(workflow): approve standalone reviewer module boundary`).
4. [BLOCKED] Git Commit: `docs(workflow): approve standalone reviewer module boundary` (hash: TBD)

### Stream 1: Execution planning (после Design Gate)
1. [BLOCKED] Раскрыть фазу реализации standalone reviewer на микро-задачи (runtime/core, PM/UI, templates) с лимитом ≤3 файлов на подзадачу и обязательными commit-step пунктами (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): expand standalone reviewer execution streams`).
2. [BLOCKED] Git Commit: `docs(todo): expand standalone reviewer execution streams` (hash: TBD)

---

## Phase 273 — Docs index sync and root-doc audit (owner: Oleksandr, updated: 2026-02-28)

### Stream 0: SSOT navigation completeness
1. [DONE] Обновить `Docs_Index.md`: добавить недостающие новые документы (`DescriptionStep_SingleAgent.md`, `StandaloneReviewer_Module.md`) и явный статус root-документов draft/RFC (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(index): register new contracts and root docs status`).
2. [DONE] Git Commit: `docs(index): register new contracts and root docs status` (hash: `91ed6992`)

### Stream 1: Root documents актуальность
1. [DONE] Провести аудит root-файлов в `doc/SolidWorks-WorkFlow/` и зафиксировать решение «нужен/архивировать/перенести» в session report (scope: `doc/Sessions/Session050.md`; expected commit: `docs(session): record solidworks root docs audit`).
2. [DONE] Git Commit: `docs(session): record solidworks root docs audit` (hash: `b7ef6ef7`)

---

## Phase 274 — Remove reviewer from active product flow (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** reviewer переносится в отдельный будущий модуль. В текущем релизном потоке reviewer должен быть полностью исключён из active description delivery и из `~/.codeai-hub/templates/description`.

### Stream 0: Bundled templates mapping cleanup
1. [DONE] Удалить reviewer assets из генерации bundled templates и release coverage checklist (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/bundled-templates.ts`, `scripts/build-release.sh`; expected commit: `build(templates): remove reviewer assets from description bundle`).
2. [DONE] Git Commit: `build(templates): remove reviewer assets from description bundle` (hash: `27347052`)

### Stream 1: Runtime template cleanup for installed homes
1. [DONE] Добавить в template sync удаление legacy reviewer template files из `~/.codeai-hub/templates/description` при синхронизации (scope: `packages/core/src/templates/template-sync-service.ts`; expected commit: `fix(core): prune legacy reviewer templates during sync`).
2. [DONE] Git Commit: `fix(core): prune legacy reviewer templates during sync` (hash: `c0784e5a`)

### Stream 2: Session/report sync for reviewer removal
1. [DONE] Синхронизировать `todo-plan` + session report по факту удаления reviewer из active template delivery (scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session050.md`; expected commit: `docs(todo): sync reviewer-removal progress in session050`).
2. [DONE] Git Commit: `docs(todo): sync reviewer-removal progress in session050` (hash: `bacfc352`)

---

## Phase 275 — Release rebuild after reviewer removal (owner: Oleksandr, updated: 2026-02-28)

### Stream 0: Build and release verification
1. [DONE] Выполнить `./scripts/build-all.sh` на чистом дереве и зафиксировать новую версию (scope: release manifests + versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [DONE] Git Commit: `chore(release): build-all vX.Y.Z` (hash: `151f6823`)
3. [BLOCKED] Выполнить `./scripts/build-release.sh --use-current-version`, проверить output checklist и зафиксировать результаты в session report (scope: `doc/Sessions/Session050.md`; expected commit: `docs(session): record release after reviewer removal`).
4. [BLOCKED] Git Commit: `docs(session): record release after reviewer removal` (hash: TBD)

---

## Phase 276 — Remove reviewer from active runtime/UI flow (owner: Oleksandr, updated: 2026-02-28)

**Контекст:** после дополнительного уточнения reviewer исключается из текущего active runtime/UI потока `description`; standalone reviewer остаётся отдельной deferred фазой (`Phase 272`).

### Stream 0: Core runtime collector-only guardrails
1. [DONE] Удалить reviewer auto-runtime branch из `WorkflowRuntime` (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`; expected commit: `refactor(core): remove reviewer auto-runtime branch`).
2. [DONE] Git Commit: `refactor(core): remove reviewer auto-runtime branch` (hash: `74336cd3`)
3. [DONE] Зафиксировать collector-only поведение в bridge handlers (`workspace activate` + `session-request-handler`) (scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit: `refactor(core): lock description flow to collector session`).
4. [DONE] Git Commit: `refactor(core): lock description flow to collector session` (hash: `2f6212dd`)

### Stream 1: PM runtime/session visibility cleanup
1. [DONE] Удалить reviewer auto-focus из PM runtime session view и автоселекта (scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/project-manager/components/sessions/runtime-session-auto-select.ts`; expected commit: `refactor(pm): remove reviewer auto-focus from runtime view`).
2. [DONE] Git Commit: `refactor(pm): remove reviewer auto-focus from runtime view` (hash: `cb20d02c`)
3. [DONE] Удалить неиспользуемый модуль reviewer visibility в PM (scope: `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`, `src/client/project-manager/components/sessions/reviewer-session-visibility.test.ts`; expected commit: `refactor(pm): drop reviewer visibility module`).
4. [DONE] Git Commit: `refactor(pm): drop reviewer visibility module` (hash: `93c7c389`)
5. [DONE] Сохранить description resume/sync в collector-only режиме для workspace-tree/provider resolver (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/services/workflow-provider-resolver.ts`; expected commit: `refactor(pm): keep description resume in collector mode`).
6. [DONE] Git Commit: `refactor(pm): keep description resume in collector mode` (hash: `386df167`)
7. [DONE] Синхронизировать source-based тест автоселекта с no-reviewer логикой (scope: `src/client/project-manager/components/sessions/runtime-session-auto-select.test.ts`; expected commit: `test(pm): align auto-select assertions with no-reviewer flow`).
8. [DONE] Git Commit: `test(pm): align auto-select assertions with no-reviewer flow` (hash: `6434243e`)

### Stream 2: Description template text alignment
1. [DONE] Убрать reviewer-термин из description collector prompt и пересобрать bundled templates (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `build(templates): remove reviewer wording from description prompt`).
2. [DONE] Git Commit: `build(templates): remove reviewer wording from description prompt` (hash: `1a0bd08e`)

---

## Phase 277 — Release rebuild after phase276 (owner: Oleksandr, updated: 2026-02-28)

### Stream 0: Build and release verification
1. [TODO] На чистом дереве выполнить `./scripts/build-all.sh` и зафиксировать новую версию после phase276 (scope: release manifests + versions; expected commit: `chore(release): build-all vX.Y.Z`).
2. [TODO] Git Commit: `chore(release): build-all vX.Y.Z` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-release.sh --use-current-version`, проверить checklist (`Verifying SDK exclusions`, `Removing dev dependencies`, `✅ Package created`) и зафиксировать результаты в session report (scope: `doc/Sessions/Session050.md`; expected commit: `docs(session): record release after phase276`).
4. [TODO] Git Commit: `docs(session): record release after phase276` (hash: TBD)

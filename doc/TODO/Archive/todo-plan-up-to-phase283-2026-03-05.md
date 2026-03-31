# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/Sessions/Archive/Session055.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.

---

## Phase 282 — Virtual Simulation Node Transformation (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** обсуждение и фиксация небольшой трансформации узла `virtual_simulation` на уровне SSOT.

**Цель:**
- утвердить дельта-контракт шага `Virtual Simulation`;
- синхронизировать связанные SSOT-документы;
- подготовить декомпозицию runtime-реализации на микро-задачи.

**Approved integration contract (prompt-only):**
- `doc/Virtual_Simulation_Prompt.draft-v1.md` — утверждённый источник текста для runtime prompt Virtual Simulation.

### Stream 0: Delta contract alignment
1. [DONE] Утвердить prompt-контракт трансформации узла `virtual_simulation` и зафиксировать прямую ссылку на source-of-truth (`doc/Virtual_Simulation_Prompt.draft-v1.md`) (scope: `doc/Virtual_Simulation_Prompt.draft-v1.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(virtual-simulation): approve prompt-only contract source`).
2. [DONE] Git Commit: `docs(virtual-simulation): approve prompt-only contract source` (hash: `6ca3e7c1`)
3. [DONE] Обновить SSOT контракта `Virtual Simulation` под режим prompt-only (без artifact template) (scope: `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`; expected commit: `docs(virtual-simulation): switch contract to prompt-only runtime`).
4. [DONE] Git Commit: `docs(virtual-simulation): switch contract to prompt-only runtime` (hash: `860e1128`)
5. [DONE] Синхронизировать системный SSOT и workflow state-machine после утверждения prompt-only дельты (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`; expected commit: `docs(workflow): sync virtual simulation prompt-only invariants`).
6. [DONE] Git Commit: `docs(workflow): sync virtual simulation prompt-only invariants` (hash: `7965240e`)

### Stream 1: Runtime decomposition (post-approval)
1. [DONE] Нарезать implementation-stream узла `Virtual Simulation` на микро-задачи с удалением artifact template из кодовой базы и runtime contract (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(plan): decompose prompt-only virtual simulation migration`).
2. [DONE] Git Commit: `docs(plan): decompose prompt-only virtual simulation migration` (hash: `6ca3e7c1`)

---

## Phase 283 — Virtual Simulation Runtime Implementation (owner: Oleksandr, updated: 2026-03-01)

**Scope этой фазы:** реализация после закрытия Phase 282.

### Stream 0: Core prompt-only migration (remove artifact template from codebase)
1. [DONE] Перенести утверждённый текст из `doc/Virtual_Simulation_Prompt.draft-v1.md` в runtime prompt Virtual Simulation и убрать упоминания `virtual-simulation-template.md` из bundled templates (scope: `packages/core/src/templates/bundled-templates.ts`; expected commit: `feat(core): migrate virtual simulation prompt to approved contract`).
2. [DONE] Git Commit: `feat(core): migrate virtual simulation prompt to approved contract` (hash: `e9d99ee3`)
3. [DONE] Удалить `virtual-simulation-template.md` из workflow contract для stage `virtual_simulation` (не генерировать, не читать, не отправлять) (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected commit: `refactor(core): remove virtual simulation artifact template contract`).
4. [DONE] Git Commit: `refactor(core): remove virtual simulation artifact template contract` (hash: `b32bb7d5`)

### Stream 1: Project Manager prompt-pack (stop sending template path)
1. [DONE] Обновить загрузку workflow contract в PM: stage `virtual_simulation` должен работать без `paths.template` и без markdown template payload (scope: `src/client/project-manager/services/idea-collector-submit-service.ts`; expected commit: `refactor(pm): consume virtual simulation contract without artifact template`).
2. [DONE] Git Commit: `refactor(pm): consume virtual simulation contract without artifact template` (hash: `b41aa814`)
3. [DONE] Убрать отправку template path в prompt-pack для `virtual_simulation` и переписать fallback/default prompt под режим prompt-only (scope: `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit: `refactor(pm): remove template hints from virtual simulation prompt pack`).
4. [DONE] Git Commit: `refactor(pm): remove template hints from virtual simulation prompt pack` (hash: `5f2720e6`)

### Stream 2: Validation + status propagation guards
1. [DONE] Добавить/обновить тесты для prompt-only генерации и валидации `virtual-simulation.md` (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit: `test(core): guard virtual simulation prompt-only pipeline`).
2. [DONE] Git Commit: `test(core): guard virtual simulation prompt-only pipeline` (hash: `77422b17`)
3. [DONE] Синхронизировать пересчёт статусов (`READY/DONE/ERROR/OUTDATED`) для prompt-only Virtual Simulation и проверить отсутствие регрессий в manual start flow (scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit: `fix(workflow): align virtual simulation prompt-only status flow`).
4. [DONE] Git Commit: `fix(workflow): align virtual simulation prompt-only status flow` (hash: `dc10e920`)

### Stream 3: Release build (по чеклисту)
1. [IN_PROGRESS] После закрытия всех stream запустить таргетные проверки затронутых пакетов/клиентов и зафиксировать результаты в отчёте сессии (scope: `doc/Sessions/Archive/Session056.md`; expected commit: `docs(session): record virtual simulation prompt-only validation`).
2. [TODO] Git Commit: `docs(session): record virtual simulation prompt-only validation` (hash: TBD)
3. [TODO] Выполнить релизный цикл: `./scripts/build-all.sh` -> проверка чистого дерева -> `./scripts/build-release.sh --use-current-version` -> верификация строк `Verifying SDK exclusions`, `Removing dev dependencies...`, `✅ Package created` (scope: release manifests + `doc/Sessions/Archive/Session056.md`; expected commit: `chore(release): build-all vX.Y.Z`).
4. [TODO] Git Commit: `chore(release): build-all vX.Y.Z` (hash: TBD)

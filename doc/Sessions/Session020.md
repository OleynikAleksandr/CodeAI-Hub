# Session 020 — Remove RUNS: Edit Step + Single-Current Artifacts (Phase 63)

**Date:** 2026-01-20 10:20 (CET)
**Branch:** main
**Version:** 1.1.454

---

# 1. Work Done in This Session

## 1.1. Context / Decision
**Решение (утверждено):** полностью убрать `RUNS` как сущность проекта.
- Больше нет “нескольких попыток run’ов” и выбора `current run`.
- Если пользователь хочет изменить результат шага — это делается через `Edit Step`:
  - открывается/возобновляется релевантная сессия агента;
  - обсуждаются правки;
  - система **перезаписывает** текущий артефакт шага (и помечает downstream как `OUTDATED`).

**Причина:** `RUNS` создают противоречия с авто-стартом Reviewer, усложняют source-of-truth и сильно увеличивают сложность алгоритма UI/State без гарантии повышения качества.

## 1.2. Documentation Sync (без runs)
Обновили документацию так, чтобы везде был единый канон: **один current-артефакт на шаг** (без `runs/`).

Ключевые документы:
- `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
  - убраны термины `Run/currentRunId` из доменной модели дерева
  - зафиксировано правило `Edit Step` вместо runs
  - обновлён канон путей `.codeai-hub/<workspaceSlug>/<stage>/<file>`
- `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
  - цели: убрать runs, заменить на `Edit Step`
  - пути артефактов без `runs/`
- `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
  - draft как временный файл `description.md`
  - финальный source-of-truth: `Final_Description.md`
  - добавлено правило: после `Final_Description.md` допустимо удалить `description.md`
- `doc/SolidWorks-Flow/System/SystemArchitecture.md`
  - обновлено: file-first workflow пишет в `.codeai-hub/<workspaceSlug>/<stage>/...` (без runs)
- `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
  - обновлено: watcher следит за `.codeai-hub/<workspaceSlug>/**` (без runs)
  - события `workflow.step.started/edited` вместо `workflow.run.created`
- `doc/SolidWorks-Flow/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
  - концептуально убран `runSlug` → curator должен работать по **checkpoint (session finalize)**

## 1.3. TODO Plan Sync (Phase 63)
- `doc/TODO/todo-plan.md`:
  - добавлена `Phase 63 — Remove RUNS entity`
  - разложены стримы: docs sync → core paths/endpoints → UI → project-manager → удаление `runSlug` session context → удаление `RunStore/currentRunId/auto-run-service`
  - проставлены DONE/хеши по выполненному прогрессу

## 1.4. Code Changes (начата вычистка)

### 1.4.1 Core: workflow paths без `runs/`
- Перевели workflow артефакты на канон `.codeai-hub/<workspaceSlug>/<stage>/<file>`.
- Обновили allowlist/regex и watcher так, чтобы:
  - новые пути без `runs/` принимались;
  - legacy-пути с `runs/<runSlug>/...` могли ещё проходить (переходный период), чтобы не ломать существующие артефакты.

### 1.4.2 Core: удалены runs endpoints
- Удалён слой API для `/api/v1/orchestrator/initiatives/:initiativeSlug/runs`:
  - list/create/select-current.

### 1.4.3 UI (webview): удалён run picker
- Удалены:
  - `runs-client` (orchestrator API клиент для runs)
  - UI-компонент run picker
  - логика выбора существующих runs
- Пересобран webview bundle.

### 1.4.4 Project Manager: prompt-pack без `runs/`
- Prompt-pack builder больше не строит target-path через `.../runs/<runSlug>/...`.
- UI copy в анкете Description обновлён на новые пути:
  - draft: `.codeai-hub/<workspace>/description/description.md`
  - final: `.codeai-hub/<workspace>/description/Final_Description.md`

---

# 2. Verification
- `./scripts/check-architecture.sh` (PASS with warnings: файлы 250–300 строк)
- `npx ultracite check` (OK)
- `npm run check:links` (OK)
- `npm run build --workspace @codeai-hub/core` (OK)
- `npm run build:webview` + `npm run typecheck:webview` (OK)
- `npm run build:project-manager` (OK)

---

# 3. Git commits
(ВАЖНО: для восстановления контекста следующей сессии нужно открыть каждый коммит через `git show --stat <hash>` и `git show <hash>`.)

### Phase 63 — Remove RUNS entity
- `53b0ae56 docs: add session 020 report`
- `02f5c8a8 docs(todo): record phase 63 progress`
- `2a9b7235 docs(project-manager): update description artifact path`
- `bdad937e refactor(project-manager): drop runs from prompt pack`
- `2ecbf54c chore(webview): rebuild bundle`
- `ab574fd7 refactor(ui): remove run picker (use edit step)`
- `aeaa16f5 refactor(core): remove runs endpoints`
- `2221ac6a refactor(core): remove runs from workflow paths`
- `3da4778f docs(todo): add phase 63 (remove runs entity)`

### Pre-Phase 63 prerequisites (context)
- `50844126 docs(curator): remove runSlug (use session checkpoints)`
- `98c2caf0 docs(core): remove runs from file-first workflow`
- `fe2f5218 docs(workflow-tree): remove runs (use edit)`
- `f14a1ccf docs(workflow-tree): clarify runs policy` (исторический коммит; теперь superseded)
- `42a39a59 docs(todo): record session continuity architecture`
- `b3461817 docs(system): mark session continuity as critical`
- `40285931 docs(session-continuity): add architecture`
- `4c6eeaed docs(workflow-tree): apply step branch pattern`
- `b8ccbbe2 docs(workflow-tree): refine description step lifecycle`
- `4840a5e8 docs: add session 019 and phase 62 plan`

---

# 4. Instructions for Next Session

## 4.1 Required documents to review before work
1. `doc/TODO/todo-plan.md` (Phase 63 — source of truth)
2. `doc/Sessions/Session020.md` (THIS REPORT)
3. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
4. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
5. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
6. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
7. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
8. `doc/SolidWorks-Flow/QuestionnaireCurator/QuestionnaireCurator_Architecture.md`
9. `doc/SolidWorks-Flow/SessionContinuity/Core/SessionContinuity_Architecture.md`

## 4.2 Plan for next session (приоритет: убрать `runSlug` из session context)

### Stream A — Убрать `runSlug` из session context (Core remote-bridge + shared types + UI core-bridge)
Цель: больше нигде не передавать/хранить `runSlug` как часть контекста сессии.

Ожидаемый результат:
- `SerializedSession` больше не содержит `runSlug`.
- Payload `session:create` больше не принимает `runSlug`.
- UI больше не вычисляет/пробрасывает `runSlug` через DOM (`runSlug` hidden input) и core-bridge.

Рекомендуемый порядок работ:
1) Core: типы bridge
- `packages/core/src/remote-bridge/types.ts`
  - удалить поле `runSlug` из `SerializedSession`
  - удалить `runSlug` из `IncomingMessage` → `session:create`
  - обновить `serializeSession()`

2) Core: создание сессий (handler)
- `packages/core/src/remote-bridge/handlers/workspace-session-service.ts`
  - удалить чтение/передачу `runSlug`

3) Core: remote-bridge wiring
- `packages/core/src/remote-bridge/index.ts`
  - убрать `runSlug` из места, где входящий payload маппится в `Session`/`sessionContext`

4) Shared types
- `src/types/session.ts` и связанные UI типы
  - удалить `runSlug` из session record/DTO, если он там ещё есть

5) UI core-bridge
- `src/client/ui/src/core-bridge/types.ts`
- `src/client/ui/src/core-bridge/core-bridge.ts`
- `src/client/ui/src/core-bridge/session-context-resolver.ts`
  - убрать `resolveSelectedRunSlug()` и всю связанную проводку

Gate после каждого микрошагa (с коммитом):
- `./scripts/check-architecture.sh`
- `npx ultracite check`
- `npx ts-prune`
- `npx jscpd ...`
- `npm run check:links`
- таргетная сборка (минимум): `npm run build --workspace @codeai-hub/core` + `npm run build:webview` + `npm run typecheck:webview`

### Stream B — Удалить `RunStore/currentRunId` и `auto-run-service`
Цель: после исчезновения `runSlug` из session context выкинуть весь runs-слой данных.

Рекомендуемый порядок работ:
1) Core: удалить/переписать `auto-run-service`
- `packages/core/src/remote-bridge/handlers/auto-run-service.ts`
  - убрать генерацию `runSlug`
  - убрать любые записи в `.codeai-hub/<workspace>/<stage>/runs/...`
  - заменить на “ensure current step files exist” / “start step session without run” (или полностью удалить, если больше не нужен)

2) Core: workspace file write (questionnaire)
- `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`
  - убрать зависимость от `RunStore` и `isRunQuestionnairePath()`
  - писать анкету только в `.codeai-hub/<workspaceSlug>/description/questionnaire.md` (single path)

3) Initiatives package
- `packages/initiatives/src/initiative-store.ts` (убрать `currentRunId`)
- удалить `packages/initiatives/src/run-store.ts`
- `packages/initiatives/src/index.ts` (убрать exports/paths, связанные с runs)

4) Документировать миграцию legacy runs (если нужно): скрипт/ручная чистка папок `.codeai-hub/**/runs/**` (после полной вычистки кода)

---

# 5. Notes / Known gaps
- На момент окончания сессии `runSlug` ещё присутствует в session context и некоторых типах/сервисах (это следующий приоритет Phase 63).
- В Core workflow watcher временно использует внутренний `CURRENT_RUN_SLUG = "current"` как переходный атрибут для событий/state до полной вычистки runSlug из модели.

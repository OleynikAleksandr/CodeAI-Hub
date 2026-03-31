# Description Legacy Cleanup — Architecture Contract

## Scope

Этот документ фиксирует целевую архитектуру cleanup-а после старой `Description` recovery/attempt модели.

Цель cleanup-а:
- полностью убрать ручной `↻ Restart attempt` из живого продукта;
- убрать active-code зависимость от старой attempt/run архитектуры шага `description`;
- свести current runtime/state/path contract к single-agent flow:
  - `questionnaire.md`
  - одна description session
  - `Final_Description.md`

Этот документ относится только к **живому коду и живым SSOT-документам**.
Исторические отчёты, archived TODO и bug history сохраняются как audit trail.

---

## Status checkpoint (2026-03-13)

Фактический статус implementation-линии:
- `Phase 297` закрыт: PM restart control удалён.
- `Phase 298` закрыт: workflow-state/session model сведены к `primarySession`.
- `Phase 299` закрыт: attempt/reset semantics удалены.
- `Phase 300` закрыт: active UI/package/router/path хвосты старой architecture вычищены, product-visible `description.md` больше не показывается.

Оставшийся допустимый compat-слой на текущей границе:
- внутренний runtime/store fallback для legacy `description/description.md`;
- связанные source-level tests, подтверждающие, что такой compat не ломает канонический `Final_Description.md`.

Этот compat-слой не считается частью product contract, пока он:
- не виден в PM/UI;
- не участвует в downstream routing как SSOT;
- не возвращает attempt/restart semantics.

---

## Problem statement

После перехода на single-agent file-first flow в кодовой базе остались legacy-слои старой архитектуры:

1. PM/UI legacy:
- круговая стрелка у `questionnaire.md`;
- отдельный компонент `QuestionnaireRestartAttemptControl`;
- wiring через `submitQuestionnaire(...)` и `pm:dialog:open`.

2. Runtime legacy:
- draft path `description/description.md`;
- run-scoped draft path `description/runs/<attempt>/description.md`;
- accept-only-latest gating по `attemptId`.

3. State/model legacy:
- несколько session slots одновременно (`primarySession`, `collectorSession`, `session`);
- `sessionKind: "collector"` как compat-слой.

4. Path compatibility legacy:
- read/write fallbacks для `description.md`, `description/runs/*`, `description/idea/*`, `runs/*/idea/questionnaire.md`.

5. Docs legacy:
- часть живых контрактов ещё содержит recovery/restart semantics или недостаточно чётко отделяет internal compat от product contract.

Пока эти слои живы, кодовая база противоречит собственному SSOT и требует лишней когнитивной нагрузки при любом изменении шага `description`.

---

## Cleanup decision

### 1. Restart attempt удаляется полностью

В актуальном продукте больше не существует ручного recovery-flow `↻ Restart attempt` для шага `description`.

Из этого следуют жёсткие правила:
- ни один живой UI не показывает restart control;
- ни один живой PM/runtime path не инициирует “новую попытку” description через повторный submit анкеты;
- active docs больше не описывают restart attempt как поддерживаемую функцию.

### 2. Attempt/run architecture удаляется из active code

В живом runtime больше не поддерживается model-specific логика:
- `description/runs/<attempt>/description.md`
- accept-only-latest gating по collector attempt
- reset current artifacts при появлении “новой попытки”

`Description` в текущей модели не использует attempt semantics.

### 3. Канонические артефакты шага `description`

Единственные active-code артефакты шага:
- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

Ни `description.md`, ни `runs/*`, ни `description/idea/*` не являются частью текущего product contract.

### 4. Каноническая session model

Для шага `description` в active state остаётся одна каноническая session ссылка:
- `primarySession`

Legacy slots:
- `collectorSession`
- `session`
- `sessionKind`

удаляются из живого workflow-state/store/client contract.

### 5. Исторические артефакты не переписываются

Не удаляем и не редактируем задним числом:
- `doc/Sessions/Archive/Session017.md`
- `doc/Sessions/Archive/Session019.md`
- `doc/Sessions/Archive/Session021.md`
- `doc/Sessions/Archive/Session023.md`
- `doc/Sessions/Archive/Session024.md`
- `doc/TODO/Archive/todo-plan-phase238-description-restart-attempt-2026-02-24.md`
- исторические блоки в `doc/BugRegistry.md`

Это не часть runtime cleanup-а, а история проекта.

---

## Target architecture

## 1) PM/UI

### Pre-submit
- Правая панель показывает `questionnaire.md`.
- В header артефакта нет restart/action-кнопок legacy типа.

### Post-submit
- PM открывает обычную description session.
- Для выбора/восстановления используется обычный dialog/session routing без special-case “latest after restart”.

### UI invariant
- В codebase нет отдельного UI-контрола, который повторно запускает description submit как recovery-механику.

---

## 2) Runtime

### Description artifact invariant
- Runtime/watcher учитывает только:
  - `description/questionnaire.md`
  - `description/Final_Description.md`

### Draft invariant
- `description.md` и `description/runs/*/description.md` не участвуют в active product/runtime contract.
- Допускается внутренний compat fallback для legacy `description.md`, если он не влияет на PM/UI labels и downstream SSOT-routing.
- Для шага `description` нет logic branch “accept only latest attempt”.

### Continuity invariant
- Continuity/history может сохраняться, но не должна зависеть от attempt semantics.

---

## 3) State / Workflow snapshot

### Canonical branch shape

`description` branch в workflow-state использует:
- `updatedAt`
- `questionnairePath`
- `finalPath`
- `primarySession`

Допускается временное наличие `draftPath` только если он реально нужен текущему single-agent flow.
Если draft path больше не используется никаким живым UX/runtime path, он тоже должен быть удалён.

### Forbidden legacy fields

В финальном состоянии не должно быть active usage для:
- `collectorSession`
- `session`
- `sessionKind`

---

## 4) Path contract

### Allowed active paths
- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`

### Disallowed active product paths
- `.codeai-hub/<workspaceSlug>/description/description.md`
- `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/description.md`
- `.codeai-hub/<workspaceSlug>/description/idea/idea.md`
- `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/idea/idea.md`
- `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/idea/questionnaire.md`

Если где-то такие пути ещё используются product-visible кодом, это считается cleanup debt и должно быть устранено.
Внутренний compat fallback для `description/description.md` допускается только как временный non-SSOT bridge.

---

## 5) Compatibility policy

Для этого cleanup-а принимается жёсткая граница:
- active code больше не обязан поддерживать restart-era runtime compatibility;
- historical docs сохраняются;
- старые workspace, опирающиеся только на legacy `description.md` / `runs/*`, не считаются каноническим supported-path для дальнейшей разработки.

Если позже потребуется мягкая миграция старых workspace, она должна оформляться как отдельный архитектурный документ и отдельная фаза, а не как скрытый compat-layer внутри основного кода.

---

## Modules affected

## 1. PM/UI cleanup
- `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`
- `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx`
- regression guards around PM artifact header

## 2. State/store cleanup
- `packages/core/src/workflow/description/description-step-types.ts`
- `packages/core/src/workflow/description/description-step-store.ts`
- `src/client/project-manager/services/workflow-state-client.ts`
- `src/client/project-manager/services/workflow-provider-resolver.ts`
- `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`
- `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`

## 3. Runtime/handler cleanup
- `packages/core/src/workflow/runtime/workflow-runtime.ts`
- `packages/core/src/workflow/runtime/workflow-runtime.test.ts`
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts`

## 4. Path cleanup
- `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`
- `src/client/ui/src/services/idea-questionnaire-paths.ts`
- `src/client/ui/src/app-host/idea-kickoff-prompt.ts`
- `src/client/ui/src/app-host/session-region-idea-paths.ts`
- `src/client/ui/src/services/idea-collector-contract.ts`
- `packages/agents/idea-collector/src/paths/artifact-paths.ts`
- `packages/agents/idea-collector/assets/idea-template.md`

## 5. Docs cleanup
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`
- index/cluster docs only where active wording still references removed architecture

---

## Execution constraints

1. Каждая микро-задача затрагивает не более 3 файлов.
2. Cleanup идёт сверху вниз:
- сначала UI entry points,
- затем state contract,
- затем runtime/path removal,
- затем docs + guards.
3. Нельзя в одном коммите одновременно:
- менять session model,
- удалять path compatibility,
- и переписывать docs на широком фронте.
4. Каждый снятый legacy слой должен получать guard:
- source-level,
- unit-level,
- или snapshot-level.

---

## Definition of Done

Cleanup считается завершённым, когда одновременно выполнены все условия:

1. В живом UI нет `↻ Restart attempt`.
2. В active code нет special-case логики “description restart/new attempt”.
3. Workflow state не использует legacy session slots для `description`.
4. Active product path contracts больше не зависят от `description.md` и `runs/*`.
5. Живые SSOT документы синхронизированы с фактической моделью.
6. Таргетные build/test проверки проходят без rollback compat-fixes.

---

## Related documents

- `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
- `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`
- `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/Sessions/Archive/Session068.md`

# Project Manager Central Panels — Execution Planning Source

**Status:** Draft for `todo-plan.md` preparation  
**Date:** 2026-03-29  
**Baseline:** `1.1.837`  
**Source merge:**  
- объединён из двух временных planning-документов, которые использовались для перекрёстной ревизии и затем были удалены после консолидации в основной `Plans`.

## 1. Назначение документа

Этот документ является объединённой planning-базой для следующего
`doc/TODO/todo-plan.md`.

Цель merge-документа:

- сохранить архитектурную рамку и инварианты отображения средней зоны PM;
- сохранить practical implementation hints и edge cases, найденные при перекрёстной ревизии;
- подготовить материал так, чтобы следующий шаг можно было сразу перевести в
  `Phase / Stream / microtasks` без повторного анализа проблемы с нуля.

## 2. Подтверждённая проблема

### 2.1. Симптом 1: post-submit flicker в `Description`

После отправки `Questionary.md` интерфейс кратко переходит в session mode, а затем
возвращается к предсессионной композиции:

- слева снова появляется `Help`;
- справа снова появляется форма анкеты;
- при этом дерево уже показывает `Description Session` и `Questionary.md`.

Это означает, что session state, artifact state и workflow snapshot расходятся.

### 2.2. Симптом 2: ложный `Final_Description.md`

После переключений между workspace или во время активной Description-сессии PM может
показывать `Final_Description.md`, хотя:

- реального final-файла ещё нет;
- compat `draftPath` ещё не материализован;
- либо compat draft вообще не читается active viewer-ом.

Пользователь получает misleading signal: интерфейс выглядит так, будто final artifact
уже существует или должен быть доступен, хотя по факту это не так.

## 3. Проверенные корневые причины

### 3.1. Нет единого owner-а у state средней зоны

Средняя зона PM собирается не из одного workspace-scoped route-state, а из нескольких
источников:

- локальный state `MainArea`;
- `useMainAreaWorkflowState`;
- отдельный state дерева;
- события `pm:stage:activated` и `pm:dialog:open`;
- auto-select артефакта;
- наличие runtime session;
- наличие или отсутствие файлов артефактов.

Это делает UI чувствительным к timing-рассинхронам.

### 3.2. Два независимых polling-цикла

Сейчас существуют два независимых poller-а:

- `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
  — быстрый первый polling около `3s`, затем `10s`;
- `src/client/project-manager/components/layout/workspace-tree.tsx`
  — быстрый первый polling около `3s`, затем `15s`.

Они читают один и тот же workflow endpoint, но держат разные локальные копии
snapshot. Это прямо создаёт условия для рассинхронизации дерева, session panel
и artifact panel.

### 3.3. Race: optimistic `session:created` vs polling overwrite

После `handleDescriptionSessionCreated()` в
`src/client/project-manager/components/layout/main-area.tsx`
UI оптимистично считает, что Description-сессия уже существует.

Но `use-main-area-workflow-state.ts` безусловно пересчитывает
`hasDescriptionSession` только из `branch.primarySession.providerSessionId`.
Если polling возвращает snapshot без этого поля, optimistic state затирается.

**Confirmed cause (Session 194, 82db344c):** the race is between the already-in-flight
`loadState()` interval callback (started at 3s/10s) and the synchronous
`setHasDescriptionSession(true)` called inside `handleDescriptionSessionCreated`.
Because `loadState` is async, the earlier-scheduled timer fires, receives a snapshot
that does not yet contain `primarySession.providerSessionId` (backend has not persisted
the binding yet), and unconditionally calls `setHasDescriptionSession(false)`.
This overwrites the optimistic `true` set moments before by the submit handler.

**Fix applied:** `use-description-session-guard.ts` (82db344c) introduces a
`DescriptionSessionGuard` ref that blocks any downgrade of `hasDescriptionSession`
while the guard is active. Guard deactivates on `session:binding` ready/failed or
a 60s fallback timeout. This makes polling harmless during the binding window.

### 3.4. Каскадный `re-mount` уничтожает последний guard

Когда polling затирает `hasDescriptionSession`, дальше происходит каскад:

1. перестаёт вычисляться `questionnaireDocument`;
2. `showDescriptionQuestionnaire` становится `true`;
3. `DescriptionQuestionnairePanel` монтируется заново;
4. в `description-questionnaire-panel.tsx` вызывается
   `onDescriptionSessionCreatePendingChange?.(null)`;
5. `pendingSessionCreate` сбрасывается;
6. после этого `showDescriptionHelpInSessionPanel` тоже становится `true`.

Именно поэтому пользователь видит полный откат к `Help + анкета`, а не только
частичную потерю session state.

### 3.5. PM смешивает разные semantic states артефакта `Description`

Сейчас в одной логике смешиваются:

- реальный `Final_Description.md`;
- compat `draftPath` / legacy `description.md`;
- ожидаемый target output текущей Description-сессии;
- `Questionary.md`.

Это приводит к ложному отображению `Final_Description.md` там, где есть только
compat fallback или вообще ещё нет читаемого артефакта.

### 3.6. Проверка `fileExists` сама по себе недостаточна

Даже если compat `draftPath` физически существует, он может быть нечитаемым
active viewer-ом.

Причина: HTTP artifact API для Description принимает только канонический path contract
с `Final_Description.md`:

- `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`

Если `draftPath` указывает на legacy `description.md`, правый viewer всё равно
получит ошибку. Значит `P0` должен проверять не только наличие файла, но и его
читаемость через текущий active path contract.

### 3.7. Semantic mismatch: `descriptionDone`

Сейчас backend gating и реальный запуск следующего шага используют разные правила:

- `workflow-state-service.ts` считает `descriptionDone` по `finalPath ?? draftPath`;
- `workflow-step-start-service.ts` требует именно `finalPath`.

Следствие:

- дерево может показывать downstream шаг как `READY`;
- фактический старт downstream шага падает без `Final_Description.md`.

## 4. Кодовые зоны, которые входят в scope

### 4.1. PM UI / state routing

- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`
- `src/client/project-manager/components/description/description-questionnaire-panel.tsx`
- `src/client/project-manager/components/layout/main-area-panel-content.tsx`

### 4.2. Workspace tree / stage sync

- `src/client/project-manager/components/layout/workspace-tree.tsx`
- `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`
- `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`
- `src/client/project-manager/components/layout/use-stage-panel-sync.ts`
- `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`

### 4.3. Availability hooks

- `src/client/project-manager/components/layout/use-artifact-availability.ts`
- `src/client/project-manager/components/layout/use-virtual-simulation-artifact-availability.ts`
- `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`
- новый `src/client/project-manager/components/layout/use-description-artifact-availability.ts`

### 4.4. Core / workflow semantics

- `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
- `src/client/project-manager/services/workflow-step-start-service.ts`
- при необходимости audit related consumers of `descriptionDone`

## 5. Объединённая стратегия исправления

### 5.1. `P0-A`: стабилизировать post-submit `Description`

Цель:

- после `Submit Questionary` UI не должен возвращаться к `Help + Questionary`,
  если session creation уже принята системой.

Объединённое решение:

1. В `main-area.tsx` держать optimistic guard, привязанный к конкретному `sessionId`.
2. Снимать guard по `session:binding` только для того же `sessionId`.
3. Использовать fallback timeout, не короче окна `waitForSessionProviderBinding`
   (`60s`).
4. В `use-main-area-workflow-state.ts` запрещать downgrade
   `setHasDescriptionSession(false)`, пока guard активен.
5. В `description-questionnaire-panel.tsx` не сбрасывать pending-state при
   re-mount, если submit ещё in-flight.

Практический механизм:

```ts
// main-area.tsx
handleDescriptionSessionCreated(sessionId) {
  optimisticGuardRef.current = {
    sessionId,
    createdAt: Date.now(),
    active: true,
  };
}

api.onCoreEvent((message) => {
  if (message.type !== "session:binding") return;
  const guard = optimisticGuardRef.current;
  if (!guard?.active) return;
  if (message.payload.sessionId !== guard.sessionId) return;
  if (
    message.payload.status === "ready" ||
    message.payload.status === "failed"
  ) {
    optimisticGuardRef.current = { ...guard, active: false };
  }
});

// fallback timeout
setTimeout(() => {
  const guard = optimisticGuardRef.current;
  if (guard?.sessionId === sessionId) {
    optimisticGuardRef.current = { ...guard, active: false };
  }
}, 60_000);

// use-main-area-workflow-state.ts
if (optimisticGuardRef.current?.active && !nextHasDescriptionSession) {
  return;
}
setHasDescriptionSession(nextHasDescriptionSession);
```

Дополнительный guard против `re-mount`:

```ts
if (!submitInFlightRef.current) {
  onDescriptionSessionCreatePendingChange?.(null);
}
```

### 5.2. `P0-B`: убрать ложный `Final_Description.md` из active UI surface

Цель:

- не показывать пользователю `Final_Description.md`, если артефакт либо не существует,
  либо не читается по текущему Description path contract.

Объединённое решение:

1. Не менять SSOT-labeling.
2. Ввести `use-description-artifact-availability.ts` по паттерну существующих
   availability hooks.
3. Проверять два условия:
   - файл существует;
   - путь соответствует active/canonical contract для Description viewer.
4. Вычислять availability на уровне `workspace-tree.tsx`, а затем прокидывать вниз,
   а не пытаться делать это внутри чистого builder-а nodes.
5. Проверить, что `use-stage-panel-sync.ts` и `workspace-tree-auto-select.ts`
   не выбирают невалидный Description artifact автоматически.

Практический механизм:

```ts
const isCanonicalDescriptionPath = (path: string) =>
  /\/description\/Final_Description\.md$/.test(path);

const nextDescription =
  branch?.finalPath && finalAvailable
    ? { path: branch.finalPath, label: "Final_Description.md" }
    : branch?.draftPath &&
        draftAvailable &&
        isCanonicalDescriptionPath(branch.draftPath)
      ? { path: branch.draftPath, label: "Final_Description.md" }
      : null;
```

Для `legacy description.md` результат должен быть таким:

- compat-слой остаётся возможным для чтения/миграции;
- но такой path не должен появляться как product-visible active artifact
  в центральной зоне и в дереве.

### 5.3. `P1-A`: унифицировать `descriptionDone`

Цель:

- привести backend gating к той же semantic truth, которую использует реальный
  старт downstream шага.

Базовое направление:

```ts
const descriptionDone = Boolean(params.description?.finalPath);
```

Но это изменение можно делать только вместе с compat-аудитом:

- есть ли legacy workspace, зависящие от `draftPath`;
- есть ли downstream consumer-ы, которые implicitly опираются на current fallback.

### 5.4. `P1-B`: общий `WorkflowStateStore`

Цель:

- заменить два независимых poller-а единым workspace-scoped store;
- убрать split-brain между деревом и средней зоной;
- подготовить базу для явных transitional states.

Опорный паттерн:

- `src/client/project-manager/services/workspace-snapshot-store.ts`

Целевое направление:

1. Новый `WorkflowStateStore`.
2. Один polling-cycle на активный workspace.
3. `MainArea` и `WorkspaceTree` подписываются на один store.
4. Event-driven guard из `P0-A` потом переезжает в store logic.
5. Transitional states (`pre_submit`, `provider_binding_pending`, `session_live`)
   можно добавлять уже после снятия пользовательски заметных багов.

## 6. Что должно попасть в следующий `todo-plan.md`

### 6.1. Обязательные execution streams

Следующий `todo-plan.md` должен содержать как минимум четыре stream-направления:

1. `P0-A` — session flicker stabilization
2. `P0-B` — description artifact availability and readability
3. `P1-A` — `descriptionDone` semantic audit and fix
4. `P1-B` — shared `WorkflowStateStore`

### 6.2. Обязательная дополнительная investigation-задача

Отдельным пунктом нужно зафиксировать диагностику точной причины, по которой после
`session:created` polling иногда возвращает snapshot без `primarySession`.

Важно: эта investigation-задача не должна блокировать `P0-A`.

## 7. Рекомендуемая нарезка в microtasks

Ниже не готовый `todo-plan.md`, а рекомендуемая нарезка для перевода в него.
Каждый пункт дальше нужно привести к правилу `≤3 файлов на подзадачу`.

### 7.1. Stream `P0-A` — session flicker stabilization

Кандидатные микрозадачи:

1. `main-area.tsx` — добавить optimistic guard c `sessionId` и lifecycle cleanup.
2. `use-main-area-workflow-state.ts` — учитывать guard и запретить premature downgrade.
3. `description-questionnaire-panel.tsx` — защитить pending reset через `submitInFlightRef`.

### 7.2. Stream `P0-B` — description artifact availability

Кандидатные микрозадачи:

1. Новый `use-description-artifact-availability.ts`.
2. `use-main-area-workflow-state.ts` — file/path readability gate для `Description`.
3. `workspace-tree.tsx` + `workspace-tree-stage-children.ts` — вычислить и прокинуть availability.
4. `workspace-tree-branch-nodes.ts` — не строить invalid Description node.
5. `use-stage-panel-sync.ts` + `workspace-tree-auto-select.ts` — не выбирать invalid artifact.

Примечание к нарезке:

- задача `3` сейчас выглядит как `2` файла, а задача `5` тоже укладывается в правило `≤3`;
- при переводе в реальный `todo-plan.md` нужно отдельно проверить, не потребуется ли
  задаче `3` сразу включить ещё и `workspace-tree-branch-nodes.ts` для полноценной
  прокидки `descriptionArtifactAvailable`;
- если это подтвердится, задача `3` станет задачей на `3` файла, а текущая задача `4`
  может быть поглощена ей и исчезнуть как отдельный microtask;
- окончательная нарезка должна фиксироваться уже в `todo-plan.md`, а не оставаться
  двусмысленной на execution-этапе.

### 7.3. Stream `P1-A` — `descriptionDone`

Кандидатные микрозадачи:

1. Аудит compat-потребителей `draftPath`.
2. `workflow-state-service.ts` — выровнять gating semantics.
3. Проверка PM consumer-ов, где мог использоваться старый смысл `descriptionDone`.

### 7.4. Stream `P1-B` — `WorkflowStateStore`

Кандидатные микрозадачи:

1. Новый `WorkflowStateStore` по паттерну `workspace-snapshot-store.ts`.
2. Перевести `use-main-area-workflow-state.ts` на store.
3. Перевести `workspace-tree.tsx` на store.
4. Перенести optimistic guard в store logic.

## 8. Критерии приёмки для будущего `todo-plan`

Следующий execution-plan должен приводить к проверяемым сценариям:

1. После `Submit Questionary` UI не возвращается к `Help + Questionary`,
   если сессия уже создана.
2. Workspace без реального `Final_Description.md` не показывает в дереве и средней
   зоне финальный description artifact как будто он уже существует.
3. Legacy `description.md` не становится product-visible active artifact в центральной
   зоне, если текущий viewer не может его читать по canonical path contract.
4. Переключение между workspace не приводит к ложному auto-select Description artifact
   другой semantic phase.
5. После выравнивания `descriptionDone` downstream шаг больше не показывается как
   `READY`, если канонический `Final_Description.md` отсутствует.

## 9. Рекомендация по использованию документа

Следующий `todo-plan.md` следует строить именно из этого merge-документа:

- как из primary execution source;
- с дроблением каждого широкого stream в микро-задачи по правилу `≤3 файлов`;
- с отдельными commit-пунктами после каждой микро-задачи.

Если в процессе нарезки окажется, что какой-то `P0` пункт затрагивает слишком
много файлов, он должен быть разделён дальше, а не реализован как один крупный шаг.

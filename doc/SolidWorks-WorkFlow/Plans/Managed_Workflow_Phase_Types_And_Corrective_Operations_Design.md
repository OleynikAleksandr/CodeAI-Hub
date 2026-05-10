# Managed Workflow Phase Types and Corrective Operations (Design Draft)

**Status:** Deferred draft. Not in any active scope. Opens as a separate accepted scope only after the mandatory repair release stabilizes the happy path of `Application Skeleton` and `Quality Gates`.
**Created:** 2026-05-10
**Updated:** 2026-05-10
**Owner:** Oleksandr + Codex
**Scope:** новый дизайн классификации фаз managed workflow, универсальной финальной фазы корректировок, UI-триггеров между фазами и корректирующих операций. Этот документ — design layer; он расширяет SSOT и вводит новые runtime-механизмы.

Параллельно с этим документом действует mandatory repair: `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md`. Этот design layer **не должен реализовываться** до завершения mandatory repair; иначе репарационный scope расширится за пределы conformance и станет невозможно закрыть.

---

## 1. Цель

Формализовать поведение фаз managed workflow steps так, чтобы:

1. Любая фаза любого managed step описывалась явной классификацией (источник плана микрозадач, владелец триггеров).
2. Управляемая структура работы пользователя с уже завершённым шагом (resume-by-default по SSOT 308) была реализована единообразно для всех managed steps, а не только `Diagram Modules`.
3. Структурные корректировки (например, добавление нового Product Part, нового gate, перематериализация скелета) были покрыты явными корректирующими операциями с тем же managed-turn контрактом, что и первичные.
4. Переходы из user-led фаз в Core-led фазы триггерились через явный UI-механизм, а не через эвристику над свободным текстом.

## 2. Концепция типов фаз (предлагаемая)

Любая фаза managed step классифицируется по источнику плана микрозадач:

- **Type A — Core-led.** План микрозадач формируется Core-side: по контракту артефактов, по индексу, по delta, или как single-bootstrap microtask. Core отправляет агенту continuation, валидирует результат, коммитит, продвигает план. Завершение — встроено в план (план исчерпан).
- **Type B — User-led.** План микрозадач формируется по user-content: каждое сообщение пользователя порождает новую microtask. Core ведёт тот же managed commit boundary (валидация owned paths/scope/schema/no-op), но не оценивает смысл ответа агента — это работа пользователя. Завершение — внешний триггер (UI-действие или переход к следующему шагу).

Эти два типа достаточны для покрытия всех текущих и обозримых сценариев managed workflow. Дополнительный "приёмочный" тип не вводится: приёмка контракта — это user-led диалог (Type B) с триггером перехода к следующей фазе.

## 3. Initial draft как Type A bootstrap

Первичное создание draft-артефактов в `Application Skeleton` и `Quality Gates` — это **Core-инициированная** single-microtask Type A operation, не часть user-led Type B. Микроплан — одна задача "создать первый draft по step contract", expected commit и validator формирует Core. После завершения — переход в Type B review/корректировок.

Это устраняет ownership-двусмысленность: первый draft не является пользовательской инициативой, его initiator — `Start step` (или handoff из upstream шага).

## 4. Сценарии шагов в Type A / Type B терминах

### `Diagram Modules`

1. Phase 1 (Type A — primary generation). Триггер: `Start step`. План: индекс → каждый Product Part по порядку.
2. Phase 2 (Type B — user-led review and corrections). Open-ended. Триггер выхода: `Start step <next>` (переход к следующему workflow step).

### `Application Skeleton`

1. Phase 1.1 (Type A — initial draft bootstrap). Триггер: `Start step`. Single-microtask: создать `application-skeleton.md` + `application-skeleton-map.json`.
2. Phase 1.2 (Type B — user-led contract review). Open-ended. Триггер выхода: UI-кнопка "Принять и материализовать" на карточке черновика.
3. Phase 2 (Type A — materialization). План: создать/обновить `product-parts/**` projection, обновить статусы артефактов.
4. Phase 3 (Type B — финальные корректировки). Open-ended. Структурные правки контракта в Type B + повторный UI-триггер → корректирующая Type A → возврат в Type B.

### `Quality Gates`

1. Phase 1.1 (Type A — initial draft bootstrap). Single-microtask: создать `quality-gates.md` + `quality-gates.json`.
2. Phase 1.2 (Type B — user-led contract review). Open-ended. Триггер выхода: UI-кнопка "Принять и интегрировать".
3. Phase 2 (Type A — integration). План: package scripts/devDependencies, configs, hooks, gate manifests.
4. Phase 3 (Type B — финальные корректировки). Аналогично `Application Skeleton`.

## 5. Universal "Корректировки" rule

Каждый managed step **обязан** заканчиваться открытой Type B фазой корректировок. Это обеспечивает resume-by-default (SSOT 308) единообразно для всех шагов и устраняет состояние "что делает Core с пользовательским сообщением после завершения шага", которое сейчас не определено для `Application Skeleton` и `Quality Gates`.

Из фазы корректировок возможен повторный переход в Type A через тот же UI-триггер, что и первичный B→A. Multi-cycle B→A→B...A→B — допустимое поведение плана.

## 6. UI-триггеры B→A

Каждый переход B→A триггерится явным пользовательским UI-действием. Триггер — кнопка на карточке артефакта, который служит источником плана соответствующей Type A operation:

- `Diagram Modules` → "Применить структуру" на карточке `product-parts.index.md`. Триггерит корректирующую `diagram-modules.structure-apply` operation.
- `Application Skeleton` → "Принять и материализовать" на карточке черновика контракта. Триггерит первичную или корректирующую `application-skeleton.materialize` operation (различает по состоянию файлов).
- `Quality Gates` → "Принять и интегрировать" на карточке черновика gates. Аналогично.

Text-перехват ограниченным списком фраз (реализованный в mandatory repair как handoff acceptance fallback) сохраняется как secondary path для users без UI access. Список фраз — тот же, что в mandatory repair.

## 7. Каталог корректирующих операций

Type A — это семейство операций. Каждая операция описывается:

- источником плана (источниковые артефакты);
- целевыми артефактами (что меняется);
- порядком и составом микрозадач;
- правилами валидации каждого результата;
- шаблоном корректирующего сообщения при failed-валидации (без ownership leak).

Минимальный каталог для design layer:

- `diagram-modules.primary-generation` — уже реализована mandatory repair-ом / существующим кодом.
- `diagram-modules.structure-apply` — новая. Корректирующая генерация product parts по обновлённому индексу (delta-apply: добавить, обновить, удалить).
- `application-skeleton.materialize` — новая. Первичная и корректирующая материализация (различает по состоянию files).
- `quality-gates.integrate` — новая. Первичная и корректирующая интеграция.

Каталог расширяется по мере появления новых managed steps.

## 8. SSOT-добавки

Этот design layer требует расширения `WorkflowSteps_Overview.md` следующими формулировками:

- явное определение Type A / Type B (раздел 2 настоящего документа);
- сценарии трёх managed steps в этих терминах (раздел 4);
- правило universal "Корректировки" (раздел 5);
- описание UI-триггеров B→A как стандартного механизма (раздел 6);
- упоминание каталога корректирующих операций как расширяемого design surface (раздел 7).

Эти добавки **не пересматривают** существующие формулировки SSOT; они их детализируют.

## 9. Open Questions

- Должна ли первичная фаза `Diagram Modules` (Type A primary-generation) обслуживаться той же UI-кнопкой, что и корректирующая `structure-apply`, или это два разных UI-сценария? (Сейчас primary запускается автоматом по `Start step`, без кнопки.)
- Допустимо ли в Phase 3 (Корректировки) `Diagram Modules` корректировать текстовое содержание одного product-part в Type B без структурной проверки ядра, или требуется триггер `structure-apply` даже для текстовых правок?
- Как UI-кнопка должна различать первичный и корректирующий сценарий `application-skeleton.materialize` — авто-detection по состоянию файлов или explicit user choice?
- Какой минимальный UI-механизм для отображения статуса фазы пользователю (не overengineering)?
- Каков порядок развёртывания design layer — все три шага одновременно или последовательно (`Application Skeleton` → release → `Quality Gates` → release → `Diagram Modules` corrective)?

## 10. Связанные документы

- `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md` — текущий SSOT, расширяется этим design layer.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workflow_Runtime_Contract_Conformance.md` — mandatory repair, prerequisite для этого design layer.
- `doc/SolidWorks-WorkFlow/Plans/Application_Skeleton_Architecture.md` — архитектура skeleton, контекст по фазам.
- `doc/SolidWorks-WorkFlow/Plans/Managed_Workspace_Lifecycle_From_Diagram_Modules.md` — managed lifecycle контекст.

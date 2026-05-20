# Development Tree Left Sidebar Phase 1 Planning

**Status:** Active planning source
**Created:** 2026-05-20
**Owner:** Oleksandr + Codex
**Scope:** спроектировать первую фазу рефакторинга Development Tree: Core-owned artifact materialization после accepted `Diagram Modules`, read-model для левого sidebar Project Manager и отображение implementation lifecycle `Module / Facade Specification`, вложенный `Implementation`, worker child nodes и Integration node.

## 1. Цель документа

Этот planning-документ должен описать первую реализационную фазу UI-изменений в левом sidebar Project Manager.

Фокус Phase 1:

- структура отображения Development Tree после `Quality Gates Baseline`;
- правила вложенности узлов;
- правила подсветки ободком только для узлов с детьми;
- читаемость длинных имен без обрезки;
- отсутствие дублирования соседних шагов в `Sessions` и `Artifacts`;
- минимальный Core/read-model contract, который нужен sidebar для отображения принятой схемы;
- автоматическое создание Development Tree artifact workspace из accepted `Diagram Modules`, без передачи этой работы агенту;
- правила синхронизации при возврате пользователя в `Diagram Modules` и изменении Product Part / Cluster / Module структуры;
- разделение `.codeai-hub` artifact storage, `doc/TODO/stages` managed plan storage и `product-parts` code skeleton storage;
- нарезка будущей implementation work на микро-задачи.

## 2. Принятый baseline

Baseline взят из принятого planning source:

- `doc/SolidWorks-WorkFlow/Plans/Archive/DevelopmentTree_Implementation_Lifecycle_Planning_RU.md`

Ключевая принятая иерархия:

```text
Product Part
└─ Cluster
   └─ Module
      └─ Module / Facade Specification
         └─ Implementation
            ├─ Worker Task / Agent Run 1
            ├─ Worker Task / Agent Run 2
            ├─ Worker Task / Agent Run 3
            └─ Integration
```

## 3. Storage surfaces и владельцы truth

Phase 1 обязана сохранить текущий порядок хранения и убрать из него двусмысленность:

| Surface | Назначение | Владелец truth |
| --- | --- | --- |
| `.codeai-hub/<workspaceSlug>/<stage>/...` | user-facing artifacts конкретного workflow stage | Core artifact contract |
| `.codeai-hub/<workspaceSlug>/development_tree/materialized/...` | artifact workspace для Development Tree branch nodes после accepted `Diagram Modules` | Core Development Tree materializer |
| `doc/TODO/stages/<stage>/todo-plan.md` | managed execution plan конкретного managed stage | Core managed workflow orchestration |
| `doc/TODO/workspace.plan.md` | managed workspace ledger и active stage state | Core managed workflow orchestration |
| `product-parts/...` | code skeleton / production structure после Application Skeleton materialization | Application Skeleton contract + Core validators |

Project Manager является только интерфейсом:

- PM не сканирует filesystem как source of truth;
- PM не решает, какие узлы существуют, какие orphan, что заблокировано или принято;
- PM не создаёт provider-visible prompts, repair prompts, filesystem folders или lifecycle transitions;
- PM отображает Core-owned snapshot и отправляет raw user intent: selection, start, acceptance, orphan disposition.

Source of truth для Product Part / Cluster / Module структуры остаётся accepted `Diagram Modules` artifact graph:

```text
.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md
.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md
```

## 4. Текущее поведение PM sidebar и filesystem

Фактическая реализация уже умеет показывать `Development Tree` из `workflowState.developmentTree`:

- `src/client/project-manager/components/layout/workspace-tree.tsx` рендерит отдельные секции `Documentation Tree` и `Development Tree`;
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts` строит узлы `Product Part`, `Cluster`, `Module`;
- `src/client/project-manager/components/layout/workspace-tree-model.ts` ограничивает типы узлов текущими `product-part | cluster | module`;
- `packages/ui/project-manager/styles.css` содержит существующие type markers, open wrappers, connector lines, provider tint и selected-state правила;
- `src/client/project-manager/services/workflow-state-development-tree-client.ts` принимает optional readiness для `parts/clusters/modules`;
- `packages/core/src/development-tree/development-tree-types.ts` и `development-tree-state-facade.ts` отдают текущий Core snapshot только для материализованных `Product Part / Cluster / Module` draft nodes.

Ограничение текущей модели: после `Module` нет вложенных operation nodes. Поэтому PM не может отобразить принятый lifecycle `Module / Facade Specification -> Implementation -> Worker Task / Integration`, а Core snapshot пока не сообщает sidebar, какие operation nodes доступны, заблокированы, приняты или связаны с конкретными session/artifact наборами.

## 5. Целевая модель узлов Phase 1

Phase 1 расширяет sidebar read-model, но не запускает worker orchestration runtime. Цель — корректно отобразить будущий lifecycle и подготовить маршрутизацию выбранного узла.

Новая логическая иерархия для каждого `Module`:

```text
Module
└─ Module / Facade Specification
   └─ Implementation
      ├─ Worker Task / Agent Run <N>
      └─ Integration
```

Типы узлов:

| Узел | Роль | Источник truth |
| --- | --- | --- |
| `Product Part` | Structural node | Core `developmentTree.parts[]` |
| `Cluster` | Structural node | Core `parts[].clusters[]` |
| `Module` | Structural node | Core `clusters[].modules[]` / `standaloneModules[]` |
| `Module / Facade Specification` | Operation node под module | Core operation lifecycle projection |
| `Implementation` | Operation node под specification | Core operation lifecycle projection |
| `Worker Task / Agent Run` | Runtime child operation | Core materializes after accepted `implementation-todo-plan.md` |
| `Integration` | Required operation child | Core materializes with worker graph and keeps it distinct from workers |

PM не должен вычислять наличие operation nodes из локальных файлов или названий. Если Core не отдал operation projection, sidebar остаётся в текущей P/C/M модели.

## 6. Core-owned Development Tree artifact materializer

После явного user acceptance шага `Diagram Modules` Core запускает deterministic materializer:

```text
User accepts Diagram Modules
→ Core validates accepted Product Part artifacts
→ Core parses canonical Product Part / Cluster / Module projection
→ Core creates/updates .codeai-hub/<workspaceSlug>/development_tree/materialized/...
→ Core records materialization summary and orphan candidates
→ Core refreshes Development Tree snapshot for Project Manager
→ Application Skeleton can become the next active trunk step
```

Целевая структура artifact workspace:

```text
.codeai-hub/<workspaceSlug>/development_tree/materialized/product-parts/<part-id>/
  PartDescription.draft.md
  clusters/<cluster-id>/
    ClusterDescription.draft.md
    ClusterFacadeContract.draft.md
    modules/<module-id>/
      ModuleSpec.draft.md
      ModuleFacadeContract.draft.md
      implementation-todo-plan.md
      workers/
      integration/
  modules/<standalone-module-id>/
    ModuleSpec.draft.md
    ModuleFacadeContract.draft.md
    implementation-todo-plan.md
    workers/
    integration/
```

Phase 1 не обязана создавать финальное содержимое всех draft-файлов. Минимальный materializer создаёт директории и может seed-ить пустые/templated placeholders только там, где это уже нужно для существующего readiness classifier. Заполнение содержимого происходит при запуске конкретного branch node session.

Materializer должен быть:

- **идемпотентным**: повторный запуск на той же структуре не переписывает наполненные артефакты;
- **Core-owned**: вызывается из managed `Diagram Modules` acceptance/revision lifecycle, а не из PM;
- **deterministic**: output строится только из accepted `Diagram Modules` projection;
- **safe-by-default**: удаление непустых orphan folders запрещено без explicit user disposition;
- **observable**: результат должен быть доступен Core diagnostics/read-model: created, existing, conflicts, orphan candidates.

Если пользователь возвращается в `Diagram Modules` и меняет структуру:

```text
Revised Diagram Modules accepted
→ Core re-runs materializer
→ new folders are created
→ unchanged folders are preserved
→ removed/renamed folders become orphan candidates
→ Core asks user disposition for non-empty orphan artifacts
```

Disposition model:

| Disposition | Поведение |
| --- | --- |
| `archive` | default для непустых orphan folders: перенос в `.codeai-hub/<workspaceSlug>/development_tree/archive/<revision-or-timestamp>/...` |
| `keep_detached` | оставить физически, но убрать из active Development Tree projection |
| `delete` | удалить только после явного user confirmation |
| `auto_delete_empty` | пустые orphan folders можно чистить автоматически |

## 7. Правила визуального отображения

- Ободок `has-children` получают только узлы, у которых реально есть дочерние узлы в snapshot: `Product Part`, `Cluster`, `Module`, `Module / Facade Specification`, `Implementation`.
- Leaf worker nodes и leaf `Integration` не получают ободок только ради статуса.
- Status/readiness цвет остаётся отдельным от provider tint: `idle -> todo`, `in_progress -> progress`, `ready/accepted -> active`, `blocked/locked -> blocked`.
- Provider tint применяется только от собственной session attribution выбранного operation node. Ветка не наследует провайдера от `Diagram Modules`, parent module или соседнего шага.
- Длинные имена не обрезаются: label должен переноситься внутри строки, `title` остаётся tooltip/debug fallback. В Phase 1 sidebar может получить увеличенный min/max width, но без горизонтального скролла дерева.
- `Implementation TODO Plan` не становится sidebar node. Он показывается как artifact выбранного `Implementation`.
- `Parallel Implementation Waves` не становится sidebar node. Worker child nodes создаются из конкретных task/session entries.
- `Module Verification` не вводится отдельным узлом в Phase 1; gate state показывается через выбранный operation node и user-facing summaries.

## 8. Sessions и Artifacts routing

При выборе узла PM dispatch-ит один Core/read-model intent для выбранного node path и не добавляет соседние шаги как вкладки.

Ожидаемые surfaces:

| Выбранный узел | Sessions panel | Artifacts panel |
| --- | --- | --- |
| `Product Part` | per-part draft/design session, если она есть | Product Part draft artifacts |
| `Cluster` | per-cluster design session, если она есть | Cluster draft artifacts |
| `Module` | per-module design session, если она есть | Module draft artifacts |
| `Module / Facade Specification` | одна design session | `module-spec.md`, `facade-contract.md` |
| `Implementation` | одна planning/orchestrator session | `implementation-todo-plan.md` |
| `Worker Task / Agent Run` | одна worker session | diff summary / touched files summary / task notes |
| `Integration` | одна integration session | integration summary / gate summary / final review summary |

Если у выбранного operation node ещё нет session, PM показывает Start/locked surface по Core-owned lifecycle state. PM не должен создавать provider-visible prompts или repair prompts самостоятельно.

## 9. Core snapshot/read-model additions

Минимальное расширение Core-owned snapshot для Phase 1:

```ts
type DevelopmentTreeNodeKind =
  | "product_part"
  | "cluster"
  | "module"
  | "module_facade_specification"
  | "implementation"
  | "worker_task"
  | "integration";

type DevelopmentTreeLifecycleState =
  | "locked"
  | "available"
  | "not_started"
  | "in_progress"
  | "ready"
  | "accepted"
  | "blocked";
```

Для operation nodes Core должен отдавать:

- `id` и stable `workflowPath`, пригодные для selection/resume;
- `kind`, `title`, `parentWorkflowPath`;
- `children[]` в уже отсортированном порядке отображения;
- `lifecycle.state`, `startable`, `lockedReason` или `blockedReason`;
- `readiness`/`status` как projection, а не UI-вычисление;
- `session` attribution только для собственной session этого узла;
- `artifacts[]` только user-facing artifacts выбранного узла;
- optional `progress`: короткие counters для worker batch, если Core уже имеет эти данные.

Совместимость: старые payloads без `children`/operation projection продолжают рендериться как текущий P/C/M Development Tree.

Дополнительные поля для materialization/disposition:

- `artifactWorkspacePath` — relative path в `.codeai-hub/<workspaceSlug>/development_tree/materialized/...`;
- `codeWorkspacePath` — optional relative path в `product-parts/...`, появляется после Application Skeleton materialization;
- `materializationState` — `not_materialized | materialized | materialization_blocked | orphan_pending`;
- `orphanDispositionRequired` — флаг, что Core ждёт user disposition перед destructive cleanup;
- `orphanCandidates[]` — read-model summary только от Core, без PM filesystem scan.

## 10. Нарезка будущей implementation work

Phase 1 реализации после принятия этого planning scope должна идти отдельным `todo-plan.md`. Предварительная нарезка:

### Phase A — Core Artifact Workspace Materializer

1. Extend `packages/core/src/development-tree/filesystem-structurator/` to plan `.codeai-hub/<slug>/development_tree/materialized/product-parts/...` directories from the accepted Diagram Modules projection, including module-level `workers/` and `integration/` folders.
2. Add orphan detection/disposition model in Core near the existing `DevelopmentTreeOrphanRegistry`, with tests for empty orphan auto-delete eligibility and non-empty archive/keep/delete disposition states.
3. Wire materializer into Diagram Modules acceptance/revision lifecycle after accepted user review, not into Project Manager and not into Application Skeleton.

### Phase B — Core Read-Model Contract

4. Extend `packages/core/src/development-tree/development-tree-types.ts`, `development-tree-state-facade.ts` and tests with operation node kinds, `artifactWorkspacePath`, materialization state, own-session attribution and backward-compatible payloads.
5. Keep code mirror separate: `DevelopmentTreeProductionPathApplier` remains Application Skeleton-driven and only contributes optional `codeWorkspacePath` when `product-parts/...` exists.
6. Add regression tests that read-only workflow-state calls do not mutate filesystem, while Diagram Modules acceptance path does run the materializer.

### Phase C — PM Projection Rendering

7. Extend `src/client/project-manager/services/workflow-state-development-tree-client.ts`, `workflow-state-client.test.ts` and `components/layout/workspace-tree-model.ts` to parse Core-owned operation nodes and materialization/orphan summaries.
8. Update `workspace-tree-diagram-branch-nodes.ts`, `workspace-tree-diagram-branch-nodes.test.ts` and readiness/progress tests for nested `Module -> Module / Facade Specification -> Implementation -> Worker/Integration`.
9. Update `workspace-tree.tsx`, `workspace-tree-type-marker.tsx` and `packages/ui/project-manager/styles.css` for operation node indentation, label wrapping, has-children outline and stable wider sidebar behavior matching `doc/tmp/dev-tree-module-workflow-prototype-v2.html`.

### Phase D — Routing, Disposition, Documentation

10. Update branch selection/routing consumers in `main-area-panel-content.tsx`, `development-tree-node-start-card.tsx` and related tests so selected operation nodes show only their own Sessions/Artifacts.
11. Add PM command surfaces only for Core-owned orphan disposition intents; PM sends raw `archive | keep_detached | delete` choice, Core performs the operation.
12. Sync SSOT docs after code: `System/WorkflowSteps_Overview.md`, `Clusters/Project_Manager.md`, `Modules/UI_Bundles.md`, and `Docs_Index.md`.

Каждая implementation микро-задача должна затрагивать не более трёх tracked файлов и иметь отдельный следующий `Git Commit: ...` пункт.

## 11. Verification и user acceptance checklist

- Unit tests: Core snapshot backward compatibility, operation node projection, PM parser compatibility, tree builder order/status mapping, routing payloads.
- Materializer tests: accepted Diagram Modules creates artifact workspace, repeat run is idempotent, revised Diagram Modules reports orphan candidates, non-empty orphan folders require user disposition.
- Targeted builds: `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview` по фактическим затронутым пакетам.
- Visual acceptance: открыть Project Manager и проверить дерево с длинными именами, nested operation nodes, selected state, locked/available/ready colors, отсутствие соседних шагов в `Sessions`/`Artifacts`.
- Regression acceptance: workspace без operation projection должен выглядеть как текущий Development Tree без runtime ошибок.

## 12. Не входит в Phase 1

- создание worker orchestration runtime;
- JSON schema `codeai-implementation-plan-v1`;
- execution of parallel agents;
- отдельный review/test workflow;
- release build.

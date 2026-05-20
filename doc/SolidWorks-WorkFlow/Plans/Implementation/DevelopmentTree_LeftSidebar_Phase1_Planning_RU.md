# Development Tree Left Sidebar Phase 1 Planning

**Status:** Active planning source
**Created:** 2026-05-20
**Owner:** Oleksandr + Codex
**Scope:** спроектировать первую фазу изменений левого sidebar Project Manager для отображения Development Tree implementation lifecycle: `Module / Facade Specification`, вложенный `Implementation`, worker child nodes и Integration node.

## 1. Цель документа

Этот planning-документ должен описать первую реализационную фазу UI-изменений в левом sidebar Project Manager.

Фокус Phase 1:

- структура отображения Development Tree после `Quality Gates Baseline`;
- правила вложенности узлов;
- правила подсветки ободком только для узлов с детьми;
- читаемость длинных имен без обрезки;
- отсутствие дублирования соседних шагов в `Sessions` и `Artifacts`;
- минимальный Core/read-model contract, который нужен sidebar для отображения принятой схемы;
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

## 3. Текущее поведение PM sidebar

Фактическая реализация уже умеет показывать `Development Tree` из `workflowState.developmentTree`:

- `src/client/project-manager/components/layout/workspace-tree.tsx` рендерит отдельные секции `Documentation Tree` и `Development Tree`;
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts` строит узлы `Product Part`, `Cluster`, `Module`;
- `src/client/project-manager/components/layout/workspace-tree-model.ts` ограничивает типы узлов текущими `product-part | cluster | module`;
- `packages/ui/project-manager/styles.css` содержит существующие type markers, open wrappers, connector lines, provider tint и selected-state правила;
- `src/client/project-manager/services/workflow-state-development-tree-client.ts` принимает optional readiness для `parts/clusters/modules`;
- `packages/core/src/development-tree/development-tree-types.ts` и `development-tree-state-facade.ts` отдают текущий Core snapshot только для материализованных `Product Part / Cluster / Module` draft nodes.

Ограничение текущей модели: после `Module` нет вложенных operation nodes. Поэтому PM не может отобразить принятый lifecycle `Module / Facade Specification -> Implementation -> Worker Task / Integration`, а Core snapshot пока не сообщает sidebar, какие operation nodes доступны, заблокированы, приняты или связаны с конкретными session/artifact наборами.

## 4. Целевая модель узлов Phase 1

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

## 5. Правила визуального отображения

- Ободок `has-children` получают только узлы, у которых реально есть дочерние узлы в snapshot: `Product Part`, `Cluster`, `Module`, `Module / Facade Specification`, `Implementation`.
- Leaf worker nodes и leaf `Integration` не получают ободок только ради статуса.
- Status/readiness цвет остаётся отдельным от provider tint: `idle -> todo`, `in_progress -> progress`, `ready/accepted -> active`, `blocked/locked -> blocked`.
- Provider tint применяется только от собственной session attribution выбранного operation node. Ветка не наследует провайдера от `Diagram Modules`, parent module или соседнего шага.
- Длинные имена не обрезаются: label должен переноситься внутри строки, `title` остаётся tooltip/debug fallback. В Phase 1 sidebar может получить увеличенный min/max width, но без горизонтального скролла дерева.
- `Implementation TODO Plan` не становится sidebar node. Он показывается как artifact выбранного `Implementation`.
- `Parallel Implementation Waves` не становится sidebar node. Worker child nodes создаются из конкретных task/session entries.
- `Module Verification` не вводится отдельным узлом в Phase 1; gate state показывается через выбранный operation node и user-facing summaries.

## 6. Sessions и Artifacts routing

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

## 7. Core snapshot/read-model additions

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

## 8. Нарезка будущей implementation work

Phase 1 реализации после принятия этого planning scope должна идти отдельным `todo-plan.md`. Предварительная нарезка:

1. Core snapshot contract: расширить `packages/core/src/development-tree/development-tree-types.ts`, `development-tree-state-facade.ts` и tests так, чтобы module nodes могли отдавать operation children без запуска worker runtime.
2. PM parser/model: расширить `src/client/project-manager/services/workflow-state-development-tree-client.ts`, `workflow-state-client.test.ts` и `components/layout/workspace-tree-model.ts` новыми node kinds/lifecycle fields.
3. PM tree builder: обновить `workspace-tree-diagram-branch-nodes.ts`, `workspace-tree-diagram-branch-nodes.test.ts` и progress/readiness tests для вложенности `Module -> Specification -> Implementation -> Worker/Integration`.
4. PM rendering/styles: обновить `workspace-tree.tsx`, `workspace-tree-type-marker.tsx` и `packages/ui/project-manager/styles.css` для operation node indentation, wrap labels, has-children outline и стабильной ширины.
5. PM routing: обновить branch selection payload consumers в `main-area-panel-content.tsx`, `development-tree-node-start-card.tsx` и related tests, чтобы выбранный operation node показывал только свои Sessions/Artifacts.
6. Docs sync: после кода синхронизировать `System/WorkflowSteps_Overview.md`, `Clusters/Project_Manager.md`, `Modules/UI_Bundles.md` и `Docs_Index.md`, если Phase 1 меняет canonical behavior.

Каждая implementation микро-задача должна затрагивать не более трёх tracked файлов и иметь отдельный следующий `Git Commit: ...` пункт.

## 9. Verification и user acceptance checklist

- Unit tests: Core snapshot backward compatibility, operation node projection, PM parser compatibility, tree builder order/status mapping, routing payloads.
- Targeted builds: `npm run build --workspace @codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview` по фактическим затронутым пакетам.
- Visual acceptance: открыть Project Manager и проверить дерево с длинными именами, nested operation nodes, selected state, locked/available/ready colors, отсутствие соседних шагов в `Sessions`/`Artifacts`.
- Regression acceptance: workspace без operation projection должен выглядеть как текущий Development Tree без runtime ошибок.

## 10. Не входит в Phase 1

- создание worker orchestration runtime;
- JSON schema `codeai-implementation-plan-v1`;
- execution of parallel agents;
- отдельный review/test workflow;
- release build.

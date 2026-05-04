# Development Tree Skeleton Materialization — Planning Doc

**Status:** draft rev2, awaiting user approval
**Author session:** condescending-mayer-3c1b3f
**Scope:** скриптовая автоматизация после Diagram Modules — безопасная материализация физической файловой структуры проекта в workspace-owned development-tree namespace и draft-артефактов узлов Development Tree, без участия агента и пользователя.

---

## 1. Цель

Сегодня после Diagram Modules в workspace физически ничего не появляется. Sidebar Development Tree — это визуализация in-memory snapshot, читаемого из staged Diagram Modules artifacts на каждый запрос. Никаких файлов, никаких драфтов, ничего, на что мог бы опереться следующий шаг разработки.

Цель: после согласованного Diagram Modules ядро автоматически создаёт и поддерживает в актуальном состоянии:
1. Физическую файловую структуру проекта в workspace-owned namespace по каноническим правилам типа продукта.
2. Дерево разработки (P → C → M) как поддиректории внутри этой структуры.
3. Draft-артефакты для каждого узла дерева (спецификации и facade-контракты), готовые к наполнению агентом совместно с пользователем.

Всё это происходит без агента — ядро действует детерминированно по уже согласованным artifacts.

---

## 2. Глобальная картина развития (фазы)

Это многофазная инициатива. Текущий planning-doc описывает только Phase 1; остальные фазы зафиксированы как deferred ориентир.

**Phase 1 — Materialization (этот документ).**
Per-Product-Part `canon` поле в YAML frontmatter Diagram Modules artifacts; каскадная материализация файловой структуры и драфтов под `.codeai-hub/<workspace-slug>/development_tree/materialized/`; idempotent re-run при изменениях Diagram Modules; readiness state для sidebar.

**Phase 2 — Session injection при cross-cutting изменениях.**
Когда добавляется новый module внутрь существующего cluster (или меняется граница), ядро автоматически пишет system-message в active session затронутых узлов через `SessionRequestHandlerEventMessages.appendDialogMessage`. Затронутые узлы подсвечиваются в sidebar как требующие ревизии. Агент с пользователем дорабатывают спецификации.

**Phase 3 — Расширение реестра канонов.**
Phase 1 поддерживает только тот набор канонов, который покрывает сам CodeAI Hub (Node.js package, Node monorepo root extension, CEF native binary, nested provider package). Phase 3 добавляет каноны других экосистем (Python, Rust, Go, Java и т.д.).

**Phase 4 — Авто-детект канона для существующих проектов.**
Если workspace непустой, скрипт детектит канон по индикаторным файлам (`package.json`, `pyproject.toml`, `Cargo.toml`) и пропускает явное `canon` поле. Полезно для сценария «применить дерево разработки поверх существующего проекта».

---

## 3. Архитектурные решения, согласованные на стадии обсуждения

**3.1. Каскад из двух независимых шагов.**
Каскад Diagram Modules → файловая структура → драфты делается через **физическую файловую систему как промежуточный источник правды**. Шаг 1 владеет папками, Шаг 2 владеет .draft.md файлами внутри этих папок. Между ними нет общей памяти — только диск.

**3.2. Per-Product-Part canon, не один канон на проект.**
Канон фиксируется отдельно для каждого Product Part в его Diagram Modules artifact. У проекта может быть смесь (Node monorepo root + nested packages + native binary). Single-canon-on-project — недостаточная модель.

**3.3. `canon` хранится в YAML frontmatter.**
Канонический формат для `product-parts/<part-id>.md`:

```yaml
---
canon: node-package
---
```

Свободная Markdown-секция для `canon` не используется в Phase 1: она усложняет validation/parsing и создаёт второй DSL поверх уже существующего Diagram Modules Markdown.

**3.4. Точка согласования канона — Diagram Modules.**
Description / Virtual Simulation — слишком ранние шаги, на них канон ещё может пересматриваться. Diagram Modules — последний шаг до материализации, после которого структура становится физической.

`canon` в Phase 1 заполняет Diagram Modules agent как обязательное structured поле. Детерминированный classifier по содержимому Product Part artifact не входит в Phase 1 и переносится в Phase 4 вместе с авто-детектом канона для существующих проектов.

**3.5. Безопасный namespace материализации.**
Phase 1 не пишет сгенерированную структуру напрямую в корень продукта (`packages/...`, `src/...`). Все материализованные папки и draft-файлы создаются под:

```
.codeai-hub/<workspace-slug>/development_tree/materialized/
```

Внутри этого namespace сохраняется каноническая форма путей (`packages/<part-id>/src/...`, `src/...` и т.д.), чтобы будущий export/promote flow мог перенести структуру в реальный проектный корень без пересчёта layout rules. Прямой write в workspace root — отдельный future scope после явного UX/backup/migration решения.

**3.6. Два документа на Module, без пересечения по содержанию.**
ModuleFacadeContract — только публичная граница (Methods/Events exposed, consumed, Boundary invariants). ModuleSpec — только реализация (Responsibility, Behavior, Internal invariants, Dependencies) с ссылкой `Implements: <link>`. **В ModuleSpec нет полей Inputs/Outputs** — они живут только в Contract. Это даёт независимое версионирование и параллельные проходы агента.

**3.7. Универсальный structural skeleton, не content template.**
Шаблон фиксирует **какие секции должен содержать документ**, не **что в них писать**. Behavior внутри ModuleSpec — свободная форма (формула / pseudocode / алгоритм / state-diagram), скрипт туда не лезет.

**3.8. Маркерное разделение скриптовой и агентской зоны.**
Внутри одного draft-файла:
- секции в `<!-- generated -->...<!-- /generated -->` принадлежат скрипту (переписываются idempotent);
- секции с маркером `<!-- agent-fill -->` и всё, что между ними и следующим `<!-- /agent-fill -->`, — собственность агента (скрипт не трогает).

**3.9. Раздельные фасады Development Tree.**
Новый Core-модуль живёт под `packages/core/src/development-tree/` и не смешивается с `remote-bridge/handlers`. Публичные входы Phase 1:
- `DevelopmentTreeStateFacade` — owner cache/snapshot parsing and subscriptions.
- `DevelopmentTreeFilesystemStructuratorFacade` — owner layout plan/apply/orphan registry.
- `DevelopmentTreeDraftMaterializerFacade` — owner draft templates/writes/drift/orphan/readiness.

Единого толстого фасада для всего development-tree scope не создаём: state, filesystem layout и draft lifecycle имеют разные причины изменения.

**3.10. Closed-module implementation boundary.**
Phase 1 реализуется как новый закрытый Core-модуль, а не как переписывание работающих workflow/PM контуров. Существующие файлы `workflow-watcher`, `WorkflowStateService`, `development-tree-snapshot.ts` и PM `workflow-state-client.ts` остаются интеграционными adapters/compatibility wrappers: они могут получить тонкие аддитивные вызовы в новый фасад, но не становятся владельцами новой business logic.

Новая логика canon registry, cache, layout planning/apply, draft writing, orphan tracking и readiness classification должна жить внутри `packages/core/src/development-tree/` за фасадными входами. Внешние контуры не импортируют внутренние классы `filesystem-structurator/` или `draft-materializer/` напрямую.

**3.11. Event-driven, не request-driven.**
Sidebar читалка переводится с per-request парсинга на in-memory cache, обновляемый по событию watcher. Файловая материализация подписана на тот же event. На «возвращение в шаг» ничего не пересчитывается, если ничего не изменилось.

---

## 4. Изменения в существующем коде

**4.1. Diagram Modules artifact format.**
В `product-parts/<part-id>.md` каждого Product Part добавляется обязательное structured поле `canon` в YAML frontmatter:

```yaml
---
canon: node-package | node-monorepo-root-extension | cef-native-binary | nested-provider-package | ...
---
```

Закрытый список. Schema-валидация в Diagram Modules pipeline отказывает в принятии artifact без поля `canon` или с неизвестным значением. Известный набор канонов — registry в коде, не свободная строка.

**4.2. `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` (текущая читалка).**
- Текущий public helper остаётся compatibility wrapper; новая parsing/cache логика добавляется в Core-модуль `packages/core/src/development-tree/`.
- `DevelopmentTreePartNode` получает `canon: DevelopmentTreeCanonId | null` для materialized part; planned-only skeleton part может оставаться `canon: null`.
- `DevelopmentTreePartNode`, `DevelopmentTreeClusterNode` и `DevelopmentTreeModuleNode` получают `readiness: "idle" | "in_progress" | "ready"`.
- `readDevelopmentTreeSnapshot()` сохраняется как compatibility wrapper для существующего `WorkflowStateService`, но его реализация должна читать `DevelopmentTreeStateFacade.currentSnapshot(...)`, а не парсить markdown на каждый request.
- PM parser в `src/client/project-manager/services/workflow-state-client.ts` становится backward-compatible: если `canon`/`readiness` отсутствуют, UI ведёт себя как до Phase 1.

**4.3. Новый общий cache модуль.**
`packages/core/src/development-tree/development-tree-state-facade.ts` — единственный owner актуального snapshot. Подписан на `workflow-watcher` events про artifacts в `diagram_modules/`. На событие — re-parse, обновление cache, broadcast «snapshot changed» внутренним подписчикам Core.

Cache key: `workspaceRoot + workspaceSlug`. Snapshot нельзя ключевать только по `workspaceSlug`, потому что один Core process может видеть несколько workspace roots.

**4.4. Workflow-watcher.**
`packages/core/src/workflow/watcher/workflow-watcher.ts` уже эмитит `workflow.artifact.written`. Дополнительной работы там не требуется — нужны только новые подписчики (cache + материализаторы Phase 1).

---

## 5. Новые модули (Phase 1 scope)

**5.1. Module 1 — Filesystem Structurator.**
`packages/core/src/development-tree/filesystem-structurator/` — фасад-класс `DevelopmentTreeFilesystemStructuratorFacade` плюс микро-классы:
- `CanonRegistry` — маппинг `canon → layout rules`. Layout rule — функция `(part, cluster, module) => relative path`.
- `WorkspaceLayoutPlanner` — берёт snapshot Development Tree (из cache) и материализует план: `desired path set`.
- `WorkspaceLayoutApplier` — сравнивает `desired` с `actual` (читает диск), создаёт недостающие папки, помечает исчезнувшие как `_orphaned/<original>` (не удаляет).
- `OrphanRegistry` — отслеживает помеченные узлы для Phase 2 session injection.

Триггер: подписка на cache «snapshot изменился». Debounce ~500 мс на пакетные изменения.

Write root Phase 1:

```
<workspace>/.codeai-hub/<workspace-slug>/development_tree/materialized/
```

Поддерживаемые каноны Phase 1 (registry):
- `node-package` → `packages/<part-id>/src/<cluster-id>/<module-id>/`, standalone modules — `packages/<part-id>/src/<module-id>/`.
- `node-monorepo-root-extension` → корень workspace как VS Code extension package; clusters/modules — `src/<cluster>/<module>/`.
- `cef-native-binary` → `packages/<part-id>/src/<cluster>/<module>/` (внутри Node-пакета как nested native контур).
- `nested-provider-package` → `packages/<parent-part>/<part-id>/src/<cluster>/<module>/`.

Важно: эти paths относительны к Phase 1 write root, а не к реальному workspace root.

Расширение реестра — Phase 3.

**5.2. Module 2 — Draft Materializer.**
`packages/core/src/development-tree/draft-materializer/` — фасад-класс `DevelopmentTreeDraftMaterializerFacade` плюс микро-классы:
- `DraftTemplateRegistry` — пять structural skeleton'ов:
  - `PartDescription.draft.md` — Identity / Purpose (derived) / Owns (derived) / Responsibility / Open questions.
  - `ClusterDescription.draft.md` — Identity / Purpose (derived) / Owns (derived) / Responsibility / Internal coordination / Open questions.
  - `ClusterFacadeContract.draft.md` — Identity / Inputs from environment / Exposes to environment / Inputs from modules (derived list) / Boundary invariants / Open questions.
  - `ModuleSpec.draft.md` — Identity / Implements (link to Contract) / Responsibility / Behavior / Internal invariants / Dependencies / Open questions. **Без Inputs/Outputs.**
  - `ModuleFacadeContract.draft.md` — Identity / Owner cluster (derived) / Methods/Events exposed / Methods/Events consumed / Boundary invariants / Open questions.
- `DraftFrontmatterBuilder` — строит frontmatter: `status: draft`, `derivedFrom: <path>`, `derivedHash: <sha>`, `generatedAt: <iso>`, `agentTouched: false`, `outdated: false`, `orphaned: false`.
- `DraftWriter` — материализует draft внутри уже существующей папки (создана Шагом 1). Идемпотентно: если файл существует — обновляет только `<!-- generated -->` секции по новому хешу, секции `<!-- agent-fill -->` не трогает.
- `DraftDriftDetector` — на изменение Purpose в Diagram Modules выставляет `outdated: true` на конкретном узле. Каскад наверх (M → C → P) только если изменилась граница (facade contract derived поля), не свободный текст.
- `DraftOrphanDetector` — реагирует на `OrphanRegistry` Шага 1: помечает драфты orphaned-узлов `orphaned: true`.

Триггер: internal event от `DevelopmentTreeFilesystemStructuratorFacade` после успешного apply (новая папка появилась → создать драфты в ней). Не подписан на Diagram Modules напрямую.

`agentTouched` в Phase 1 не является writable truth. Он может оставаться в frontmatter как compatibility/debug field, но readiness вычисляется из фактического содержимого agent-fill секций, `TODO`, `outdated` и `orphaned`. Это убирает необходимость отдельного watcher'а, который пытается угадать, кто именно редактировал файл.

**5.3. Readiness state для sidebar.**
Новый сервис `DraftReadinessClassifier` (в составе draft-materializer фасада или sibling): для каждого узла читает draft-файлы и возвращает `ready | in_progress | idle`.
- `idle` (gray) — драфт создан, все agent-fill секции пустые.
- `in_progress` (orange) — хотя бы одна agent-fill секция непустая, но остался хоть один `TODO` или непрозрачный `<!-- agent-fill -->` маркер.
- `ready` (green) — все обязательные секции непустые, нет TODO, нет `outdated`, нет `orphaned`.

Sidebar читалка получает readiness state как часть Development Tree snapshot на каждом уровне дерева:
- Product Part readiness агрегируется из `PartDescription.draft.md`, child clusters и standalone modules.
- Cluster readiness агрегируется из `ClusterDescription.draft.md`, `ClusterFacadeContract.draft.md` и child modules.
- Module readiness агрегируется из `ModuleSpec.draft.md` и `ModuleFacadeContract.draft.md`.

---

## 6. Граничные случаи (Phase 1)

- **Удаление узла из Diagram Modules.** Папка не удаляется. Перемещается в `<part>/_orphaned/<cluster-or-module>/` с сохранением драфтов. Phase 2 поднимет это в session injection.
- **Переименование узла.** Скрипт детектит как orphan + new (не пытается угадать rename). Драфты с работой агента остаются в `_orphaned/`.
- **Изменение `canon` Product Part.** В Phase 1 — отказ материализатора с диагностическим event-ом «canon change requires manual migration». Авто-миграция между канонами — out of scope.
- **Конфликт с существующими файлами в workspace.** В Phase 1 write root находится под `.codeai-hub/<workspace-slug>/development_tree/materialized/`, поэтому конфликт с реальными продуктовым файлами невозможен. Если внутри materialized namespace уже есть папка/файл без нашего manifest marker, скрипт **не материализует драфты внутрь** и пишет diagnostic event.
- **Race с агентским редактированием драфта.** Скрипт пишет атомарно через temp + rename. Если агент в момент записи держит файл открытым — агентская версия сохраняется, скрипт повторяет попытку через debounce.
- **Cold start Core после уже созданных драфтов.** `DevelopmentTreeStateFacade` должен уметь восстановить snapshot из Diagram Modules artifacts, а `DraftReadinessClassifier` — прочитать существующие драфты из materialized namespace без повторного создания файлов.

---

## 7. Что вне scope Phase 1

- Session injection при изменениях границ (Phase 2).
- Любые каноны, не покрывающие сам CodeAI Hub (Phase 3).
- Авто-детект канона по существующим файлам в workspace (Phase 4).
- Прямой write materialized structure в реальный workspace root (`packages/...`, `src/...`) и export/promote flow из `.codeai-hub/.../development_tree/materialized/` в product root.
- Авто-миграция между канонами при смене `canon` поля.
- Rename detection.
- Кросс-уровневые скриптовые валидации (cluster facade `Inputs from modules` ⇔ модули `Outputs`) — это часть Phase 2, потому что зависит от наличия агентского содержимого в драфтах.

---

## 8. Acceptance criteria Phase 1

1. Diagram Modules artifact без поля `canon` отказывается приниматься (схема-валидация).
2. Diagram Modules artifact с неизвестным `canon` отказывается приниматься с понятной диагностикой.
3. После Diagram Modules с валидным `canon` для всех Product Parts ядро автоматически создаёт файловую структуру, идентичную дереву разработки, под `.codeai-hub/<workspace-slug>/development_tree/materialized/`.
4. Layout paths внутри materialized namespace соответствуют выбранному canon registry (`packages/...`, `src/...` и т.д.), но реальные product-root файлы вне `.codeai-hub` не создаются.
5. После создания файловой структуры ядро автоматически создаёт пять типов draft-файлов в правильных местах с заполненными derivable полями и пустыми `<!-- agent-fill -->` секциями.
6. Изменение Diagram Modules artifact (новый module / новый cluster / новый part) приводит к точечной материализации новых папок и новых драфтов, без перезаписи agent-fill секций существующих драфтов.
7. Sidebar Development Tree показывает корректный readiness state (gray/orange/green) для каждого узла на основе фактического содержимого драфтов.
8. Sidebar читалка не парсит Diagram Modules artifacts на каждый запрос — только on cache invalidation / cold-start hydration.
9. Удаление узла из Diagram Modules не удаляет работу агента — драфты переезжают в `_orphaned/` внутри materialized namespace.
10. Core cold start после уже выполненной материализации восстанавливает Development Tree snapshot и readiness без ручного действия пользователя.
11. Тестовый workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/` после ручного добавления `canon` fields в его Diagram Modules artifacts материализуется корректно в `.codeai-hub/<workspace-slug>/development_tree/materialized/`.

---

## 9. Resolved decisions before todo-plan

1. **Schema поля `canon`:** YAML frontmatter в `product-parts/<part-id>.md`. Structured Markdown body-секция не используется.
2. **Каноны Phase 1:** `node-package`, `node-monorepo-root-extension`, `cef-native-binary`, `nested-provider-package`. Этого достаточно для MVP на CodeAI Hub-shaped projects; новые экосистемы — Phase 3.
3. **Path namespace:** Phase 1 материализует только под `.codeai-hub/<workspace-slug>/development_tree/materialized/`. Прямой write в product root out of scope.
4. **Core module name:** `packages/core/src/development-tree/`.
5. **Facade split:** три публичных фасада — state, filesystem structurator, draft materializer. Без единого общего фасада.
6. **Owner `canon`:** Diagram Modules agent заполняет поле, Core валидирует registry. Детерминированный classifier не входит в Phase 1.
7. **Readiness truth:** вычисляется из содержимого draft-файлов, `TODO`, `outdated`, `orphaned` и agent-fill секций. `agentTouched` не является источником истины.

---

## 10. Context Pack For Future todo-plan

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- `doc/SolidWorks-WorkFlow/Docs_Index.md`
- `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Skeleton_Materialization_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_Sidebar_Visualization_Architecture.md`
- `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`
- `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
- `packages/core/src/workflow/watcher/workflow-watcher.ts`
- `packages/core/src/workflow/paths/workflow-artifact-paths.ts`
- `src/client/project-manager/services/workflow-state-client.ts`
- `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`

---

## 11. Источники, прочитанные при подготовке этого документа

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (первые ~120 строк, инварианты).
- `doc/SolidWorks-WorkFlow/Docs_Index.md` (первые ~120 строк, навигация).
- Код: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts` (как образец фасад-класса).
- Тестовый workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/.codeai-hub/codeai-hub-codex-5-5/` (description-step.json, Final_Description.md, virtual-simulation.md, product-parts.index.md, workflow/state.json) — подтвердило отсутствие structured canon поля в текущих artifacts.
- Текущая сессия rev2: повторно сверены `development-tree-snapshot.ts`, `workflow-state-service.ts`, `workflow-watcher.ts`, `watcher-types.ts`, `workflow-artifact-paths.ts`, `workflow-state-client.ts`, `workspace-tree-diagram-branch-nodes.ts`.

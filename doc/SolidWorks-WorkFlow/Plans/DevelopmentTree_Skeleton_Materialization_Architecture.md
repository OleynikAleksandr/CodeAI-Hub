# Development Tree Skeleton Materialization — Planning Doc

**Status:** draft, awaiting user approval
**Author session:** condescending-mayer-3c1b3f
**Scope:** скриптовая автоматизация после Diagram Modules — материализация физической файловой структуры проекта в workspace и draft-артефактов узлов Development Tree, без участия агента и пользователя.

---

## 1. Цель

Сегодня после Diagram Modules в workspace физически ничего не появляется. Sidebar Development Tree — это визуализация in-memory snapshot, читаемого из staged Diagram Modules artifacts на каждый запрос. Никаких файлов, никаких драфтов, ничего, на что мог бы опереться следующий шаг разработки.

Цель: после согласованного Diagram Modules ядро автоматически создаёт и поддерживает в актуальном состоянии:
1. Физическую файловую структуру проекта в workspace по каноническим правилам типа продукта.
2. Дерево разработки (P → C → M) как поддиректории внутри этой структуры.
3. Draft-артефакты для каждого узла дерева (спецификации и facade-контракты), готовые к наполнению агентом совместно с пользователем.

Всё это происходит без агента — ядро действует детерминированно по уже согласованным artifacts.

---

## 2. Глобальная картина развития (фазы)

Это многофазная инициатива. Текущий planning-doc описывает только Phase 1; остальные фазы зафиксированы как deferred ориентир.

**Phase 1 — Materialization (этот документ).**
Per-Product-Part canon поле в Diagram Modules artifacts; каскадная материализация файловой структуры и драфтов; idempotent re-run при изменениях Diagram Modules; readiness state для sidebar.

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

**3.3. Точка согласования канона — Diagram Modules.**
Description / Virtual Simulation — слишком ранние шаги, на них канон ещё может пересматриваться. Diagram Modules — последний шаг до материализации, после которого структура становится физической.

**3.4. Два документа на Module, без пересечения по содержанию.**
ModuleFacadeContract — только публичная граница (Methods/Events exposed, consumed, Boundary invariants). ModuleSpec — только реализация (Responsibility, Behavior, Internal invariants, Dependencies) с ссылкой `Implements: <link>`. **В ModuleSpec нет полей Inputs/Outputs** — они живут только в Contract. Это даёт независимое версионирование и параллельные проходы агента.

**3.5. Универсальный structural skeleton, не content template.**
Шаблон фиксирует **какие секции должен содержать документ**, не **что в них писать**. Behavior внутри ModuleSpec — свободная форма (формула / pseudocode / алгоритм / state-diagram), скрипт туда не лезет.

**3.6. Маркерное разделение скриптовой и агентской зоны.**
Внутри одного draft-файла:
- секции в `<!-- generated -->...<!-- /generated -->` принадлежат скрипту (perepisyvajutsja idempotent);
- секции с маркером `<!-- agent-fill -->` и всё, что между ними и следующим `<!-- /agent-fill -->`, — собственность агента (скрипт не трогает).

**3.7. Event-driven, не request-driven.**
Sidebar читалка переводится с per-request парсинга на in-memory cache, обновляемый по событию watcher. Файловая материализация подписана на тот же event. На «возвращение в шаг» ничего не пересчитывается, если ничего не изменилось.

---

## 4. Изменения в существующем коде

**4.1. Diagram Modules artifact format.**
В `product-parts/<part-id>.md` каждого Product Part добавляется обязательное structured поле `canon` в frontmatter или верхней секции:

```
canon: node-package | node-monorepo-root-extension | cef-native-binary | nested-provider-package | ...
```

Закрытый список. Schema-валидация в Diagram Modules pipeline отказывает в принятии artifact без поля `canon`. Известный набор канонов — registry в коде, не свободная строка.

**4.2. `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` (текущая читалка).**
- Парсер расширяется: читает `canon` поле и кладёт в `DevelopmentTreePartNode` как `canon: string`.
- Поведение `readDevelopmentTreeSnapshot()` не меняется по сигнатуре, но переходит на чтение **актуального cache** вместо парсинга markdown на каждый вызов.
- Появляется sibling-функция `getDevelopmentTreeFromCache()` или фасад с методом `currentSnapshot()`.

**4.3. Новый общий cache модуль.**
`packages/core/src/development-tree/development-tree-state.ts` (или подобное) — единственный owner актуального snapshot. Подписан на `workflow-watcher` events про artifacts в `diagram_modules/`. На событие — re-parse, обновление cache, broadcast «snapshot изменился» внутренним подписчикам Core.

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

Поддерживаемые каноны Phase 1 (registry):
- `node-package` → `packages/<part-id>/src/<cluster-id>/<module-id>/`, standalone modules — `packages/<part-id>/src/<module-id>/`.
- `node-monorepo-root-extension` → корень workspace как VS Code extension package; clusters/modules — `src/<cluster>/<module>/`.
- `cef-native-binary` → `packages/<part-id>/src/<cluster>/<module>/` (внутри Node-пакета как nested native контур).
- `nested-provider-package` → `packages/<parent-part>/<part-id>/src/<cluster>/<module>/`.

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

Триггер: filesystem watcher на материализованных папках Шага 1 (новая папка появилась → создать драфты в ней). Не подписан на Diagram Modules напрямую.

**5.3. Readiness state для sidebar.**
Новый сервис `DraftReadinessClassifier` (в составе draft-materializer фасада или sibling): для каждого узла читает draft-файлы и возвращает `ready | in_progress | idle`.
- `idle` (gray) — драфт создан, `agentTouched: false`.
- `in_progress` (orange) — `agentTouched: true`, остался хоть один `TODO` или непрозрачный `<!-- agent-fill -->` маркер.
- `ready` (green) — все обязательные секции непустые, нет TODO, нет `outdated`, нет `orphaned`.

Sidebar читалка получает readiness state как часть Development Tree snapshot.

---

## 6. Граничные случаи (Phase 1)

- **Удаление узла из Diagram Modules.** Папка не удаляется. Перемещается в `<part>/_orphaned/<cluster-or-module>/` с сохранением драфтов. Phase 2 поднимет это в session injection.
- **Переименование узла.** Скрипт детектит как orphan + new (не пытается угадать rename). Драфты с работой агента остаются в `_orphaned/`.
- **Изменение `canon` Product Part.** В Phase 1 — отказ материализатора с диагностическим event-ом «canon change requires manual migration». Авто-миграция между канонами — out of scope.
- **Конфликт с существующими файлами в workspace.** Если папка-цель уже существует и содержит файлы, не созданные нашим скриптом, скрипт **не материализует драфты внутрь**. Diagnostic event для пользователя.
- **Race с агентским редактированием драфта.** Скрипт пишет атомарно через temp + rename. Если агент в момент записи держит файл открытым — агентская версия сохраняется, скрипт повторяет попытку через debounce.

---

## 7. Что вне scope Phase 1

- Session injection при изменениях границ (Phase 2).
- Любые каноны, не покрывающие сам CodeAI Hub (Phase 3).
- Авто-детект канона по существующим файлам в workspace (Phase 4).
- Авто-миграция между канонами при смене `canon` поля.
- Rename detection.
- Кросс-уровневые скриптовые валидации (cluster facade `Inputs from modules` ⇔ модули `Outputs`) — это часть Phase 2, потому что зависит от наличия агентского содержимого в драфтах.

---

## 8. Acceptance criteria Phase 1

1. Diagram Modules artifact без поля `canon` отказывается приниматься (схема-валидация).
2. После Diagram Modules с валидным `canon` для всех Product Parts ядро автоматически создаёт файловую структуру, идентичную дереву разработки.
3. После создания файловой структуры ядро автоматически создаёт пять типов draft-файлов в правильных местах с заполненными derivable полями и пустыми `<!-- agent-fill -->` секциями.
4. Изменение Diagram Modules artifact (новый module / новый cluster / новый part) приводит к точечной материализации новых папок и новых драфтов, без перезаписи существующих.
5. Sidebar Development Tree показывает корректный readiness state (gray/orange/green) для каждого узла на основе содержимого драфтов.
6. Sidebar читалка не парсит Diagram Modules artifacts на каждый запрос — только on cache invalidation.
7. Удаление узла из Diagram Modules не удаляет работу агента — драфты переезжают в `_orphaned/`.
8. Тестовый workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/` после ручного добавления `canon` полей в его Diagram Modules artifacts материализуется корректно.

---

## 9. Open questions (требуют решения до todo-plan)

1. **Точная schema поля `canon`** — frontmatter в YAML или structured секция в Markdown body? Влияет на парсер.
2. **Конкретный набор support'нутых канонов в Phase 1** — список выше предложен мной по образцу самого CodeAI Hub. Подтвердить, что этого хватает для первого MVP.
3. **Path namespace в workspace** — материализуем прямо в корень workspace (`<workspace>/packages/...`) или под dedicated подкаталог (`<workspace>/.codeai-hub/development_tree/<workspace-slug>/packages/...`)? Первый — естественнее, второй — изолированнее. Для пустого workspace разницы нет; для непустого — критичный выбор.
4. **Имя модуля внутри `packages/core/src/`** — `development-tree/` (общий зонт для structurator + materializer + cache + readiness) или каждый отдельным пакетом? CLAUDE.md требует фасады; вопрос — один общий фасад или два разных.
5. **Должен ли `canon` каждого Part заполняться агентом в диалоге, или вычисляться скриптово на Diagram Modules стадии?** Если вторым путём — нужен дополнительный детерминированный classifier по содержимому Product Part artifact, что снимает агентский вопрос полностью.

---

## 10. Источники, прочитанные при подготовке этого документа

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (первые ~120 строк, инварианты).
- `doc/SolidWorks-WorkFlow/Docs_Index.md` (первые ~120 строк, навигация).
- `doc/Sessions/Session049.md` (предыдущий session report, COMPLETED).
- Код: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts` (как образец фасад-класса).
- Тестовый workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/.codeai-hub/codeai-hub-codex-5-5/` (description-step.json, Final_Description.md, virtual-simulation.md, product-parts.index.md, workflow/state.json) — подтвердило отсутствие structured canon поля в текущих artifacts.

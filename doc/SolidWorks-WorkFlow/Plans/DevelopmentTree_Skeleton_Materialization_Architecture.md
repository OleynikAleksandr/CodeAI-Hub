# Development Tree Skeleton Materialization — Planning Doc

**Status:** accepted implementation scope, release verification in progress
**Author session:** condescending-mayer-3c1b3f
**Scope:** скриптовая автоматизация после Diagram Modules — безопасная материализация Development Tree в Project Manager, физической файловой структуры проекта в workspace-owned development-tree namespace, а затем downstream bootstrap draft-артефактов и агентских сессий для узлов Development Tree.
**Implementation plan:** `doc/TODO/todo-plan.md` (`development-tree-materialization-implementation-2026-05-04`)
**Canonical SSOT sync:** реализованные итоги Phase 1 уже перенесены в `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md` и `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`; этот planning-doc остаётся активным до релизного retest acceptance и closeout disposition.

**Retest fix verification (2026-05-05):** targeted checks passed for development-tree workflow namespace, nested continuity storage, node-specific session naming, Core snapshot metadata, PM parser metadata, and PM tree artifact/session rows:
`npx tsx --test packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts packages/core/src/development-tree/node-bootstrap/development-tree-node-bootstrap-facade.test.ts packages/core/src/session-continuity/continuity-store.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-continuity-root.test.ts packages/core/src/development-tree/development-tree-state-facade-metadata.test.ts packages/core/src/remote-bridge/handlers/development-tree-snapshot.test.ts`;
`npx tsx --test src/client/project-manager/services/workflow-state-client.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`;
`npm run build --workspace=@codeai-hub/core`;
`npm run typecheck:webview`;
`npm run build:webview`;
`npm run plan:validate`.

**Node detail routing verification (2026-05-05):** targeted PM checks passed for the follow-up retest fix that keeps the Development Tree sidebar limited to Product Part / Cluster / Module nodes and routes selected-node metadata into the main Project Manager surfaces:
`npx tsx --test src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts src/client/project-manager/services/workflow-state-client.test.ts`;
`npm run typecheck:webview`;
`npm run build:webview`;
`npm run plan:validate`.

---

## 1. Цель

Сегодня после Diagram Modules в workspace физически ничего не появляется. Sidebar Development Tree — это визуализация in-memory snapshot, читаемого из staged Diagram Modules artifacts на каждый запрос. Никаких файлов, никаких драфтов, ничего, на что мог бы опереться следующий шаг разработки.

Цель: после согласованного Diagram Modules ядро автоматически создаёт и поддерживает в актуальном состоянии:
1. Дерево разработки (P → C → M) в Project Manager и физическую файловую структуру проекта в workspace-owned namespace.
2. Draft-артефакты для каждого узла дерева (спецификации и facade-контракты), готовые к наполнению агентом совместно с пользователем.
3. Агентские сессии для новых узлов дерева с первым сообщением, сформированным из инструкций и шаблонов соответствующего типа сущности: Product Part, Cluster или Module.

Материализация дерева и файловой структуры происходит без агента — ядро действует детерминированно по уже согласованным Diagram Modules artifacts. Draft-артефакты, сессии и первые сообщения создаёт отдельный downstream-модуль, который реагирует на появление папок в файловой системе и не читает Diagram Modules напрямую.

---

## 2. Глобальная картина развития (фазы)

Это многофазная инициатива. Текущий planning-doc описывает только Phase 1; остальные фазы зафиксированы как deferred ориентир.

**Phase 1 — Materialization + Node Bootstrap (этот документ).**
Каскадная материализация Development Tree в Project Manager и файловой структуры под `.codeai-hub/<workspace-slug>/development_tree/materialized/`; downstream создание draft-артефактов, агентских сессий и первого сообщения для новых Product Part / Cluster / Module узлов; idempotent re-run при изменениях Diagram Modules; readiness state для sidebar.

**Phase 2 — Session injection при cross-cutting изменениях.**
Когда добавляется новый module внутрь существующего cluster (или меняется граница), ядро автоматически пишет system-message в active session затронутых узлов через `SessionRequestHandlerEventMessages.appendDialogMessage`. Затронутые узлы подсвечиваются в sidebar как требующие ревизии. Агент с пользователем дорабатывают спецификации.

**Phase 3 — Расширение технологических layout rules.**
Phase 1 создаёт нейтральную P/C/M структуру. Phase 3 добавляет framework-specific layouts для разных экосистем (Python, Rust, Go, Java и т.д.).

**Phase 4 — Авто-детект технологической базы для существующих проектов.**
Если workspace непустой, скрипт детектит технологическую базу по индикаторным файлам (`package.json`, `pyproject.toml`, `Cargo.toml`). Полезно для сценария «применить дерево разработки поверх существующего проекта».

---

## 3. Архитектурные решения, согласованные на стадии обсуждения

**3.1. Каскад из двух независимых модулей.**
Каскад делится на два модуля с разной ответственностью:
- **Модуль 1: Development Tree Structurator.** Это не новый продуктовый контур с нуля: сегодня уже существует текущая читалка/построитель Development Tree для Project Manager (`development-tree-snapshot.ts` + интеграция через `WorkflowStateService` / PM parser). Phase 1 расширяет именно этот существующий контур: он по-прежнему читает Diagram Modules artifacts и строит Development Tree snapshot для Project Manager, но дополнительно синхронно создаёт соответствующее дерево папок в файловой системе. На этом его ответственность заканчивается.
- **Модуль 2: Development Tree Node Bootstrap.** Не читает Diagram Modules. Он ждёт появления папок Product Part / Cluster / Module в materialized filesystem tree и для новых узлов создаёт draft-артефакты, агентские сессии и первое сообщение по шаблону.

Физическая файловая система является промежуточным источником правды между этими модулями. Между ними нет общей памяти — только диск.

**3.2. Канон/технологическая база не блокирует Diagram Modules.**
В Phase 1 Diagram Modules не обязан угадывать язык, фреймворк или точный filesystem canon для каждого Product Part. Если предыдущие документы не содержат этой информации, её выясняет агентская сессия соответствующего узла: сначала Product Part, затем при необходимости Cluster или Module.

Это означает, что filesystem materialization Phase 1 должна иметь безопасную нейтральную форму, достаточную для появления дерева и запуска downstream Node Bootstrap. Точный продуктовый layout (`packages/...`, `src/...`, framework-specific structure) может уточняться после ответа пользователя в агентской сессии и фиксироваться в draft-артефакте узла.

**3.3. Безопасный namespace материализации.**
Phase 1 не пишет сгенерированную структуру напрямую в корень продукта (`packages/...`, `src/...`). Все материализованные папки и draft-файлы создаются под:

```
.codeai-hub/<workspace-slug>/development_tree/materialized/
```

Внутри этого namespace сначала сохраняется нейтральная P/C/M-структура Development Tree. Прямой write в workspace root — отдельный future scope после явного UX/backup/migration решения.

**3.4. Два документа на Module, без пересечения по содержанию.**
ModuleFacadeContract — только публичная граница (Methods/Events exposed, consumed, Boundary invariants). ModuleSpec — только реализация (Responsibility, Behavior, Internal invariants, Dependencies) с ссылкой `Implements: <link>`. **В ModuleSpec нет полей Inputs/Outputs** — они живут только в Contract. Это даёт независимое версионирование и параллельные проходы агента.

**3.5. Универсальный structural skeleton, не content template.**
Шаблон фиксирует **какие секции должен содержать документ**, не **что в них писать**. Behavior внутри ModuleSpec — свободная форма (формула / pseudocode / алгоритм / state-diagram), скрипт туда не лезет.

**3.6. Маркерное разделение скриптовой и агентской зоны внутри draft-файлов.**
Внутри одного draft-файла:
- секции в `<!-- generated -->...<!-- /generated -->` принадлежат скрипту (переписываются idempotent);
- секции с маркером `<!-- agent-fill -->` и всё, что между ними и следующим `<!-- /agent-fill -->`, — собственность агента (скрипт не трогает).

**3.7. Раздельные фасады Development Tree.**
Новая логика живёт под `packages/core/src/development-tree/` и не смешивается с `remote-bridge/handlers`. Публичные входы Phase 1:
- `DevelopmentTreeStateFacade` — compatibility/cache owner для Development Tree snapshot, который используется Project Manager.
- `DevelopmentTreeFilesystemStructuratorFacade` — owner планирования и применения P/C/M filesystem tree по snapshot из Diagram Modules.
- `DevelopmentTreeNodeBootstrapFacade` — owner draft templates/writes, agent session creation, first-message bootstrap, drift/orphan/readiness.

Единого толстого фасада для всего development-tree scope не создаём: state, filesystem layout и draft lifecycle имеют разные причины изменения.

**3.8. Closed-module implementation boundary.**
Phase 1 реализуется как новый закрытый Core-модуль, а не как переписывание работающих workflow/PM контуров. Существующие файлы `workflow-watcher`, `WorkflowStateService`, `development-tree-snapshot.ts` и PM `workflow-state-client.ts` остаются интеграционными adapters/compatibility wrappers: они могут получить тонкие аддитивные вызовы в новый фасад, но не становятся владельцами новой business logic.

Новая логика cache, filesystem tree planning/apply, node bootstrap, draft writing, agent session creation, first-message dispatch, orphan tracking и readiness classification должна жить внутри `packages/core/src/development-tree/` за фасадными входами. Внешние контуры не импортируют внутренние классы `filesystem-structurator/` или `node-bootstrap/` напрямую.

**3.9. Event-driven, не request-driven.**
Sidebar читалка переводится с per-request парсинга на in-memory cache, обновляемый по событию watcher. Файловая материализация подписана на тот же event. На «возвращение в шаг» ничего не пересчитывается, если ничего не изменилось.

---

## 4. Изменения в существующем коде

**4.1. Diagram Modules artifact format.**
`canon` не является обязательным полем Diagram Modules в Phase 1. Diagram Modules отвечает за архитектурную P/C/M-композицию, а не за угадывание языка, фреймворка или итогового filesystem layout.

При этом текущая runtime validation слишком слабая: сейчас `product-parts/<part-id>.md` может пройти как “созданный” даже если содержит только заголовок. Phase 1 должна усилить проверку Diagram Modules artifacts:
- `product-parts.index.md` должен содержать хотя бы один валидный Product Part ID;
- каждый planned Product Part должен иметь соответствующий `product-parts/<part-id>.md`;
- `product-parts/<part-id>.md` должен содержать matching `Part ID`, секцию `Owned Clusters` и/или `Standalone Modules`, а также хотя бы один валидный Cluster или Module node;
- Product Part artifact с одним только заголовком не считается готовым.

**4.2. `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts` (текущая читалка).**
- Текущий public helper остаётся compatibility wrapper; новая parsing/cache/filesystem-structuring логика добавляется в Core-модуль `packages/core/src/development-tree/`.
- Это evolution текущего Project Manager Development Tree read-model, а не параллельная новая читалка: существующий `WorkflowStateService` продолжает получать snapshot через совместимый public entrypoint.
- `DevelopmentTreePartNode`, `DevelopmentTreeClusterNode` и `DevelopmentTreeModuleNode` получают `readiness: "idle" | "in_progress" | "ready"`.
- `readDevelopmentTreeSnapshot()` сохраняется как compatibility wrapper для существующего `WorkflowStateService`, но его реализация должна читать `DevelopmentTreeStateFacade.currentSnapshot(...)`, а не парсить markdown на каждый request.
- PM parser в `src/client/project-manager/services/workflow-state-client.ts` становится backward-compatible: если `readiness` отсутствует, UI ведёт себя как до Phase 1.

**4.3. Новый общий cache модуль.**
`packages/core/src/development-tree/development-tree-state-facade.ts` — единственный owner актуального snapshot. Подписан на `workflow-watcher` events про artifacts в `diagram_modules/`. На событие — re-parse, обновление cache, broadcast «snapshot changed» внутренним подписчикам Core.

Cache key: `workspaceRoot + workspaceSlug`. Snapshot нельзя ключевать только по `workspaceSlug`, потому что один Core process может видеть несколько workspace roots.

**4.4. Workflow-watcher.**
`packages/core/src/workflow/watcher/workflow-watcher.ts` уже эмитит `workflow.artifact.written`. Дополнительной работы там не требуется — нужны только новые подписчики: cache/filesystem structurator и downstream Node Bootstrap.

---

## 5. Расширяемые и новые модули (Phase 1 scope)

**5.1. Module 1 — Existing Development Tree Structurator Extension.**
`packages/core/src/development-tree/filesystem-structurator/` — фасад-класс `DevelopmentTreeFilesystemStructuratorFacade` плюс микро-классы:
- `DevelopmentTreeFilesystemPathPlanner` — берёт snapshot Development Tree (из cache) и материализует нейтральный P/C/M path plan.
- `WorkspaceLayoutApplier` — сравнивает `desired` с `actual` (читает диск), создаёт недостающие папки, помечает исчезнувшие как `_orphaned/<original>` (не удаляет).
- `OrphanRegistry` — отслеживает помеченные узлы для downstream Node Bootstrap и будущего Phase 2 session injection.

Триггер: подписка на cache «snapshot изменился». Debounce ~500 мс на пакетные изменения.

Write root Phase 1:

```
<workspace>/.codeai-hub/<workspace-slug>/development_tree/materialized/
```

Нейтральная P/C/M структура Phase 1:
- Product Part: `product-parts/<part-id>/`
- Cluster: `product-parts/<part-id>/clusters/<cluster-id>/`
- Module внутри Cluster: `product-parts/<part-id>/clusters/<cluster-id>/modules/<module-id>/`
- Standalone Module: `product-parts/<part-id>/modules/<module-id>/`

Важно: эти paths относительны к Phase 1 write root, а не к реальному workspace root. Это не финальный продуктовый layout и не `packages/...`/`src/...` layout. Точный framework/canon может быть выяснен позже в агентской сессии узла.

Расширение реестра — Phase 3.

**5.2. Module 2 — Development Tree Node Bootstrap.**
`packages/core/src/development-tree/node-bootstrap/` — фасад-класс `DevelopmentTreeNodeBootstrapFacade` плюс микро-классы:
- `DevelopmentTreeFilesystemWatcher` — следит за materialized filesystem tree и находит новые папки Product Part / Cluster / Module. Не читает Diagram Modules artifacts.
- `DraftTemplateRegistry` — пять structural skeleton'ов:
  - `PartDescription.draft.md` — Identity / Purpose (derived) / Owns (derived) / Responsibility / Open questions.
  - `ClusterDescription.draft.md` — Identity / Purpose (derived) / Owns (derived) / Responsibility / Internal coordination / Open questions.
  - `ClusterFacadeContract.draft.md` — Identity / Inputs from environment / Exposes to environment / Inputs from modules (derived list) / Boundary invariants / Open questions.
  - `ModuleSpec.draft.md` — Identity / Implements (link to Contract) / Responsibility / Behavior / Internal invariants / Dependencies / Open questions. **Без Inputs/Outputs.**
  - `ModuleFacadeContract.draft.md` — Identity / Owner cluster (derived) / Methods/Events exposed / Methods/Events consumed / Boundary invariants / Open questions.
- `DraftFrontmatterBuilder` — строит frontmatter: `status: draft`, `derivedFrom: <path>`, `derivedHash: <sha>`, `generatedAt: <iso>`, `agentTouched: false`, `outdated: false`, `orphaned: false`.
- `DraftWriter` — материализует draft внутри уже существующей папки (создана Шагом 1). Идемпотентно: если файл существует — обновляет только `<!-- generated -->` секции по новому хешу, секции `<!-- agent-fill -->` не трогает.
- `NodeAgentSessionBootstrapper` — создаёт агентскую сессию для нового Product Part / Cluster / Module node.
- `NodeFirstMessageBuilder` — формирует первое сообщение агенту из node type, draft paths, upstream context pack и соответствующего шаблона инструкций.
- `DraftDriftDetector` — на изменение Purpose в Diagram Modules выставляет `outdated: true` на конкретном узле. Каскад наверх (M → C → P) только если изменилась граница (facade contract derived поля), не свободный текст.
- `DraftOrphanDetector` — реагирует на `OrphanRegistry` Шага 1: помечает драфты orphaned-узлов `orphaned: true`.

Триггер: filesystem event или internal event от `DevelopmentTreeFilesystemStructuratorFacade` после успешного apply (новая папка появилась → создать драфты, создать сессию, отправить первое сообщение). Модуль не подписан на Diagram Modules напрямую и не парсит markdown шага Diagram Modules.

Шаблоны и инструкции для первых сообщений Product Part / Cluster / Module являются отдельным design surface и должны быть согласованы до implementation todo-plan.

`agentTouched` в Phase 1 не является writable truth. Он может оставаться в frontmatter как compatibility/debug field, но readiness вычисляется из фактического содержимого agent-fill секций, `TODO`, `outdated` и `orphaned`. Это убирает необходимость отдельного watcher'а, который пытается угадать, кто именно редактировал файл.

**5.3. Readiness state для sidebar.**
Новый сервис `DraftReadinessClassifier` (в составе Node Bootstrap фасада или sibling): для каждого узла читает draft-файлы и возвращает `ready | in_progress | idle`.
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
- **Неизвестная технологическая база узла.** Phase 1 не блокирует Diagram Modules. Первый агент Product Part / Cluster / Module получает контекст и, если не видит нужной информации для начала проектирования, задаёт пользователю вопрос в первой сессии.
- **Конфликт с ручными файлами в materialized namespace.** В MVP не поддерживается ручное ведение документов внутри `.codeai-hub/<workspace-slug>/development_tree/materialized/`. Жёсткое требование: разработка проекта ведётся через диалоги с агентом и созданные ими draft-артефакты. Manifest-marker/collision-protection не входит в MVP.
- **Race с агентским редактированием драфта.** Скрипт пишет атомарно через temp + rename. Если агент в момент записи держит файл открытым — агентская версия сохраняется, скрипт повторяет попытку через debounce.
- **Cold start Core после уже созданных драфтов.** `DevelopmentTreeStateFacade` должен уметь восстановить snapshot из Diagram Modules artifacts, а `DraftReadinessClassifier` — прочитать существующие драфты из materialized namespace без повторного создания файлов.

---

## 7. Что вне scope Phase 1

- Session injection при изменениях границ (Phase 2).
- Любые каноны, не покрывающие сам CodeAI Hub (Phase 3).
- Авто-детект канона по существующим файлам в workspace (Phase 4).
- Прямой write materialized structure в реальный workspace root (`packages/...`, `src/...`) и export/promote flow из `.codeai-hub/.../development_tree/materialized/` в product root.
- Авто-миграция между канонами / framework-specific layouts.
- Manifest-marker/collision-protection для ручных файлов внутри materialized namespace.
- Rename detection.
- Кросс-уровневые скриптовые валидации (cluster facade `Inputs from modules` ⇔ модули `Outputs`) — это часть Phase 2, потому что зависит от наличия агентского содержимого в драфтах.

---

## 8. Acceptance criteria Phase 1

1. Diagram Modules validation больше не считает Product Part artifact готовым, если файл содержит только заголовок или не содержит валидных P/C/M nodes.
2. `product-parts.index.md` без валидных Product Part IDs не переводит Diagram Modules в completed.
3. Каждый planned Product Part из index должен иметь matching `product-parts/<part-id>.md` с matching `Part ID` и хотя бы одним валидным Cluster или Module node.
4. После валидного Diagram Modules ядро автоматически создаёт Development Tree snapshot для Project Manager и нейтральную P/C/M файловую структуру под `.codeai-hub/<workspace-slug>/development_tree/materialized/`.
5. Module 1 является расширением существующего Development Tree read-model для Project Manager, а не новым независимым построителем дерева.
6. Module 1 не создаёт draft-файлы, агентские сессии и первые сообщения; он только читает Diagram Modules, обновляет PM tree snapshot и применяет filesystem tree.
7. Module 2 не читает Diagram Modules; он реагирует на появление папок Product Part / Cluster / Module в materialized filesystem tree.
8. После появления новой папки Module 2 автоматически создаёт нужные draft-файлы в правильных местах с заполненными derivable полями и пустыми `<!-- agent-fill -->` секциями.
9. После создания draft-файлов Module 2 автоматически создаёт агентскую сессию для нового узла и отправляет первое сообщение по шаблону соответствующего node type.
10. Если технологическая база узла неизвестна из предыдущих документов, первое сообщение агента должно привести к явному вопросу пользователю, а не к угадыванию framework/canon ядром.
11. Изменение Diagram Modules artifact (новый module / новый cluster / новый part) приводит к точечной материализации новых папок, новых драфтов и новых агентских сессий, без перезаписи agent-fill секций существующих драфтов.
12. Sidebar Development Tree показывает корректный readiness state (gray/orange/green) для каждого узла на основе фактического содержимого драфтов.
13. Sidebar читалка не парсит Diagram Modules artifacts на каждый запрос — только on cache invalidation / cold-start hydration.
14. Удаление узла из Diagram Modules не удаляет работу агента — папки/драфты переезжают в `_orphaned/` внутри materialized namespace.
15. Core cold start после уже выполненной материализации восстанавливает Development Tree snapshot и readiness без ручного действия пользователя.
16. Тестовый workspace `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/` после валидных Diagram Modules artifacts материализуется корректно в `.codeai-hub/<workspace-slug>/development_tree/materialized/`.

---

## 9. Resolved decisions before todo-plan

1. **Diagram Modules validation:** текущий подход “файл существует значит готов” недостаточен; Phase 1 должна валидировать реальную P/C/M структуру Product Part artifacts.
2. **Path namespace:** Phase 1 материализует только под `.codeai-hub/<workspace-slug>/development_tree/materialized/`. Прямой write в product root out of scope.
3. **Neutral filesystem tree:** Phase 1 создаёт нейтральную P/C/M структуру, а не финальный `packages/...`/`src/...` продуктовый layout.
4. **Core module name:** `packages/core/src/development-tree/`.
5. **Facade split:** три публичных фасада — state, filesystem structurator, node bootstrap. Без единого общего фасада.
6. **Existing Module 1:** первый модуль уже существует как текущий Development Tree read-model для Project Manager; Phase 1 расширяет его filesystem materialization, а не создаёт параллельный построитель дерева.
7. **Responsibility split:** filesystem structurator читает Diagram Modules и создаёт PM tree + folders; node bootstrap читает filesystem tree и создаёт drafts + sessions + first messages.
8. **Framework/canon discovery:** если технологическая база неизвестна, её выясняет агентская сессия узла через вопрос пользователю; ядро не угадывает.
9. **Readiness truth:** вычисляется из содержимого draft-файлов, `TODO`, `outdated`, `orphaned` и agent-fill секций. `agentTouched` не является источником истины.

---

## 10. Implementation disposition notes

- Execution cycle: `development-tree-materialization-implementation-2026-05-04`.
- Implemented scope: strict Diagram Modules Product Part validation; cached `DevelopmentTreeStateFacade`; neutral filesystem materialization under `.codeai-hub/<workspace-slug>/development_tree/materialized/`; filesystem-driven node draft/session bootstrap; readiness parsing and sidebar rendering.
- Canonical documentation target: stable implementation facts live in `System/SystemArchitecture.md`, `Clusters/CoreOrchestrator.md`, and `Clusters/Project_Manager.md`.
- Lifecycle state: keep this planning-doc in `Plans/` until the release artifact is built, user retest is accepted, and Scope Closeout decides whether to archive or distill any remaining notes.
- Deferred scope remains unchanged: branch-level workflow execution, cross-cutting session injection, framework-specific layouts, existing-project technology detection, and promote/export into product root require fresh planning/todo cycles.
- Retest follow-up `1.2.136`: PM node artifacts were routed correctly, but the left session surface still opened the `Diagram Modules` session. The fix extends selected-node dialog intents with exact `dialogId`, `rootSessionId`, and `sessionId`; `resolveDialogMatch` now prefers those exact identities before provider/stage fallback. Targeted evidence: `npx tsx --test src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts src/client/project-manager/components/layout/main-area-panel-content.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `npm run typecheck:webview`, `npm run build:webview`.
- Retest follow-up `1.2.137`: logs confirmed node sessions exist in workspace continuity and provider JSONL (`step-flow-presenter` stage `development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-ui/modules/step-flow-presenter`), but PM diagnostics still resolved the visible left pane to `stage:"diagram_modules"`. Root cause: when selected-node session metadata was absent from the PM branch event, `MainAreaSessionContent` fell back to `resolveStageSessionIntent("diagram_modules", ...)` before runtime stage filtering could run. The fix sets selected-node `initialDialogIntent` to `null` when no exact session exists and scopes `ProjectManagerSessionView.startupStage` to `selectedBranchNode.workflowPath`. Targeted evidence: `npx tsx --test src/client/project-manager/components/layout/main-area-panel-content.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`, `npm run typecheck:webview`, `npm run build:webview`.
- Retest follow-up `1.2.138`: user screenshot showed selected node artifacts on the right, while the left session surface still displayed `Diagram Modules Codex`. Root cause: two stale-dialog paths could still outrank selected Development Tree node routing. First, `stepStartedIntent` from Diagram Modules was passed before selected-node `initialIntent`; second, `ProjectManagerSessionView` kept live `dialogIntentOverride` from an earlier `pm:dialog:open` across `startupStage` changes. The fix makes selected P/C/M node intent/fallback outrank `stepStartedIntent`, scopes dialog overrides to the current `startupStage`, rejects non-exact overrides for `development_tree/...` stages, and clears overrides on workspace/startupStage change. Targeted evidence: `npx tsx --test src/client/project-manager/components/layout/main-area-panel-content.test.ts src/client/project-manager/components/sessions/project-manager-session-view.test.tsx src/client/project-manager/components/sessions/project-manager-dialog-session-view-helpers.test.ts`, `npm run typecheck:webview`, `npm run build:webview`.
- Retest follow-up `1.2.139`: user confirmed selected Product Part / Cluster / Module now opens its own left session surface and right artifacts, but reported two polish defects before acceptance. First, Development Tree session tab labels exposed the full workflow path; the UI now shortens `development_tree/...` labels to the final node segment in Title Case. Second, the first Development Tree node-agent prompt now includes the response-language instruction sourced from Settings > General > Reasoning (`general.localization.categories.reasoning`, with default-language fallback). Targeted evidence: `npx tsx --test src/client/ui/src/session/session-tabs.test.tsx packages/core/src/development-tree/node-bootstrap/node-first-message-builder.test.ts packages/core/src/development-tree/node-bootstrap/node-agent-session-bootstrapper.test.ts`.

---

## 11. Context Pack For Future todo-plan

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

## 12. Источники, прочитанные при подготовке этого документа

- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (первые ~120 строк, инварианты).
- `doc/SolidWorks-WorkFlow/Docs_Index.md` (первые ~120 строк, навигация).
- Код: `packages/core/src/remote-bridge/handlers/development-tree-snapshot.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts`, `packages/core/src/session-continuity/session-continuity-facade.ts` (как образец фасад-класса).
- Тестовый workspace: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.5/.codeai-hub/codeai-hub-codex-5-5/` (description-step.json, Final_Description.md, virtual-simulation.md, product-parts.index.md, workflow/state.json) — подтвердило отсутствие structured canon поля в текущих artifacts.
- Текущая сессия rev2: повторно сверены `development-tree-snapshot.ts`, `workflow-state-service.ts`, `workflow-watcher.ts`, `watcher-types.ts`, `workflow-artifact-paths.ts`, `workflow-state-client.ts`, `workspace-tree-diagram-branch-nodes.ts`.

# Workflow Tree UI (SolidWorks-подобная визуализация разработки)

**Status:** Draft (v0.7)
**Updated:** 2026-01-17
**Owner:** Oleksandr + Codex

---

## 1. Зачем нужен Workflow Tree
Цель — дать пользователю UI, который **не позволяет хаотично “скакать” по задачам**, как это делает голый Git, а ведёт разработку как SolidWorks:
- сначала фиксируется описание,
- затем формируется виртуальная симуляция,
- затем строятся диаграммы модулей и фасадов,
- затем для каждого модуля делаются спецификация/план/исполнение,
- затем выполняется “Rebuild” (гейты/сборка),
- затем “Simulation” (тесты/сценарии).

Workflow Tree становится **единой точкой правды** для состояния проекта (workspace):
- что сделано,
- что заблокировано,
- что устарело после правок (needs rebuild).

---

## 2. MVP-рамки (Project Manager)
Для MVP **полноценный Workflow Tree** (дерево + детали узла + статусы + “жёсткие” зависимости) реализуется в **`project-manager` (CEF)**.

`vscode-webview` и `web-client` на этом этапе **не дублируют дерево**: они могут оставаться “узкими поверхностями” для сессий/выполнения шагов, но **источник истины по workflow — Project Manager**.

---

## 3. Термины и сущности
### 3.1. Доменная модель (для UI)
- **Workspace** — корень дерева (репозиторий/папка проекта).
- **Cluster** — подсистема/домен внутри workspace.
- **Module** — единица ответственности.

Примечание (vNext): после `Scaffold Modules` код каждого модуля материализуется в `packages/<moduleSlug>/...` (kebab-case).

- **Step** — шаг workflow (например: `Описание`, `Virtual Simulation`, `Диаграмма модулей`, `Диаграмма фасадов`, `Spec`, `Plan`, `Execute`).
- **Artifact** — файл/результат шага.
- **Session** — диалог с агентом.

Архитектурное правило, которое “цементирует” модель:
- **Module имеет единственный публичный вход**: `*facade`.
- Внутри Module — **микро‑классы** (≤300 строк) и строгая декомпозиция.

### 3.2. Артефакты как слоты и runs (для персистентности)
Эта часть нужна, чтобы дерево было связано с текущим рантаймом артефактов.

- **Artifact Slot** — “что” мы храним (семантический ключ результата).
  - `workspace.description`
  - `workspace.virtual_simulation`
  - `diagram.modules`
  - `diagram.facades`
  - `module.<slug>.spec`
- **Run** — одна попытка выполнения шага (провайдер/модель/итерация).
- **Current** — выбранный пользователем актуальный результат слота.

Зачем нужны runs:
- шаг может выполняться разными провайдерами или повторно;
- UI должен хранить историю и позволять выбрать “current”.

---

## 4. Предлагаемый UI (как SolidWorks)
### 4.1. Левый сайдбар: контекст + дерево
В левой панели дерево **всегда относится к одному выбранному workspace**.
Над деревом — полноэкранный workspace menu с действиями:
- `Add Workspace`
- `Fork Workspace`
- `New Workspace` (если поддержим в MVP)

Ниже — дерево разработки выбранного workspace.

### 4.2. Верхняя панель: палитра инструментов
Этапы workflow — это **инструменты** (как фичи в SolidWorks):
- инструмент контекстный (зависит от выбранного узла),
- автоматически активируется/блокируется по зависимостям,
- при первом запуске материализует шаг в дереве (если его ещё нет),
- при повторном запуске открывает тот же шаг для продолжения/редактирования.

Базовые инструменты (MVP):
- Для `Workspace`: `Описание` → `Virtual Simulation` → `Диаграмма модулей` (Module Diagram) → `Interface Map` (`Диаграмма фасадов`)
- Для `Module`: `Spec` → `Plan` → `Execute`

### 4.3. Центральная панель: содержимое выбранного узла
Центральный холст делим на две области: **Sessions** (слева) и **Artifacts** (справа), между ними вертикальный ресайзер.

Правила поведения:
- клик по `Step` открывает состояние шага (анкета/запуск, либо продолжение),
- клик по `Artifact` открывает содержимое артефакта,
- клик по `Session` открывает полный диалог.

---

## 5. Дерево: узлы и визуальные правила
### 5.1. Типы узлов (MVP)
- `Workspace`
- `Cluster`
- `Module`
- `Step`
- `Artifact`
- `Session`

Визуальная ось модульных шагов: `Spec`/`Plan`/`Execute` выравниваются по оси маркера `Module`, а вложенные подшаги (например `Orchestration`) смещаются глубже.

### 5.2. Пример дерева (workspace‑проект с кластерами)
```
Workspace: App
├─ Описание (Step)
│  ├─ Artifact: questionnaire.md
│  │  └─ Session: 001 (create)
│  └─ Artifact: description.md
│     └─ Session: 001 (create)
├─ Virtual Simulation (Step)
│  └─ Artifact: virtual-simulation.md
│     └─ Session: 002 (create)
├─ Диаграмма модулей (Step)
│  └─ Artifact: modules-diagram.mmd
│     └─ Session: 003 (create)
├─ Диаграмма фасадов (Step)
│  └─ Artifact: facades-graph.mmd
│     └─ Session: 004 (create)
├─ Cluster: Auth
│  └─ Module: auth-token
│     ├─ Spec (Step)
│     ├─ Plan (Step)
│     └─ Execute (Step)
└─ Cluster: Billing
   └─ ...
```

### 5.3. Сессии как “полная история”
Сессии — **видимые узлы дерева**.

Рекомендация MVP:
- `Session` отображается как дочерний узел под `Artifact`.
- Один `Session` может быть показан под несколькими `Artifact` как “ссылка” (один и тот же ID), если сессия породила/изменила несколько артефактов.

---

## 6. Шаги Flow и их артефакты (MVP)
### 6.1. UI label vs внутренний `stageId`
Чтобы внутренние этапы были однозначными, используем snake_case:
- `Описание` → `description`
- `Virtual Simulation` → `virtual_simulation`
- `Диаграмма модулей` → `diagram_modules`
- `Диаграмма фасадов` → `diagram_facades`
- `Spec` → `spec`
- `Plan` → `plan`
- `Execute` → `execute`

### 6.2. Шаги верхнего уровня (`Workspace`)
- `Описание` (`stageId=description`)
  - результаты:
    1) `description.md`
    2) `questionnaire.md` (опционально)
- `Virtual Simulation` (`stageId=virtual_simulation`)
  - результат: `virtual-simulation.md`
- `Диаграмма модулей` (`stageId=diagram_modules`)
  - результат: `modules-diagram.mmd`
  - после завершения материализуются `Cluster/Module` узлы
- `Диаграмма фасадов` (`stageId=diagram_facades`)
  - результат: `facades-graph.mmd`
  - фиксирует контрактные связи между фасадами

`Module`:
- `Spec` → `DONE`, когда созданы:
  1) `module-spec.md` (границы ответственности, зависимости, требования)
  2) `facade-spec.md` (контракт фасада: вход/выход, ошибки, совместимость)
  Разблокирует `Plan`.
- `Plan` → `DONE`, когда создан `plan.md` (микро‑задачи ≤3 файлов + обязательный пункт `Git Commit` после каждой подзадачи + гейты/таргетные сборки).
  Разблокирует `Execute`.

---

## 7. Статусы и “жёсткие” правила (как в CAD)
### 7.1. Статусы узлов
Минимальный набор:
- `TODO` — ещё не начато
- `IN_PROGRESS` — выполняется
- `DONE` — выполнено и валидировано
- `BLOCKED` — заблокировано отсутствующими артефактами/ошибками/контрактами
- `OUTDATED` — было `DONE`, но стало невалидным после изменений (needs rebuild)
- `ERROR` — последняя проверка/сборка/тест упали
- `SUPPRESSED` — вне текущего скоупа (аналог suppression)

### 7.2. Strict CAD Flow (без перескоков)
Инструмент активен только если выполнены предусловия.

Примеры (MVP):
- `Workspace`: `Virtual Simulation` активен только после `Описание`.
- `Workspace`: `Диаграмма модулей` активна только после `Virtual Simulation`.
- `Workspace`: `Диаграмма фасадов` активна только после `Диаграмма модулей`.
- `Module`: `Spec` активен только после `Workspace: Диаграмма фасадов`.
- `Module`: `Plan` активен только если есть артефакты `Spec`; `Execute` — только после `Plan`.

### 7.3. Anti-chaos rule (источник правды)
Если сущность “появилась” из шага (например, список модулей из `Диаграмма модулей`), то добавлять/удалять/переименовывать её можно **только через этот шаг**.

### 7.4. Автоматическая материализация из диаграмм
После выполнения `Диаграмма модулей` система:
- материализует `Cluster/Module` узлы,
- поддерживает добавление/удаление/переименование только через `Диаграмма модулей`,
- при конфликтах создаёт отчёт‑артефакт (например `dependency-problems.md`).

### 7.5. OUTDATED как “needs rebuild”
Любой `Edit` запускает impact analysis по **графу зависимостей**, а не по глубине дерева.

MVP-минимум:
- структурные зависимости (что пришло из `Диаграмма модулей`),
- контрактные зависимости (фасады),
- результаты гейтов/сборок.

Если система не уверена — создаёт отчёт (например `impact-report.md`) и держит затронутые узлы в `OUTDATED`.

---

## 8. Диаграммы как данные (семантика + layout)
В MVP допускаем, что диаграммы хранятся как Mermaid (`*.mmd`) и читаются как “истина”.

### 8.1. `modules-diagram.mmd` (Module Diagram)
- Семантика: узлы модулей + стрелки зависимостей **без детальных контрактов**.
- vNext: хранить layout (позиции/размеры) в отдельном data‑формате (например JSON), чтобы UI мог редактировать диаграмму.

### 8.2. `facades-graph.mmd` (Interface Map)
- Семантика: связи как контракты между фасадами.
- MVP-минимум для каждой связи:
  - `type`: `http | event | fileArtifact | inProc | cli`
  - `fromModuleSlug`, `toModuleSlug`
  - `contract` (endpoint/event/artifact)
  - `facade` (какие фасады участвуют)

---

## 9. Привязка к рантайму артефактов `.codeai-hub/` (MVP)
`.codeai-hub/` находится в `.gitignore`, но это **каноничное хранилище workflow-артефактов** на уровне workspace.

### 9.1. Канон путей артефактов (новый)
Каждый шаг имеет собственный корень и runs:
- `.codeai-hub/<workspaceSlug>/description/runs/<runSlug>/description.md`
- `.codeai-hub/<workspaceSlug>/virtual_simulation/runs/<runSlug>/virtual-simulation.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/runs/<runSlug>/modules-diagram.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/runs/<runSlug>/facades-graph.mmd`

Вопросники/анкеты:
- `.codeai-hub/<workspaceSlug>/description/questionnaire.md`

### 9.2. Template namespace (новый)
Bundled‑шаблоны синхронизируются в `~/.codeai-hub/templates/` по шагам:
- `description/description-collector-prompt.md`
- `description/description-template.md`
- `description/questionnaire-template.md`
- `virtual_simulation/virtual-simulation-prompt.md`
- `virtual_simulation/virtual-simulation-template.md`
- `diagram_modules/modules-diagram-prompt.md`
- `diagram_modules/modules-diagram-template.mmd`
- `diagram_facades/facades-graph-prompt.md`
- `diagram_facades/facades-graph-template.mmd`

Старые шаблоны (`full-development-flow/idea/...`) удалены и не используются.

### 9.3. Upsert протокол (Artifact Upsert Protocol, Variant B)
Сохранение артефактов выполняется через Core endpoint:
- `POST /api/v1/orchestrator/artifact-upsert`

Payload (MVP):
- `artifacts[]: { slot, markdown }` — **без путей от агента** (Core делает `slot → path` через allowlist).
- Разрешены **частичные upsert**: можно прислать подмножество слотов.
- При перезаписи файла Core делает backup: `*.bak-<timestamp>`.

### 9.4. Привязка SessionID к шагу
Для шага хранится история `runs[]` и указатель `currentRunId`.
Привязка `providerSessionId/threadId` хранится в метаданных run.

---

## 10. Дисциплина “артефакты живые” (правило для Execute)
Любая задача в `Execute`, которая меняет:
- границы модулей,
- публичные фасады,
- связи между модулями,
- планы/порядок выполнения,

обязана включать шаг обновления соответствующих артефактов (`Описание`/`Virtual Simulation`/`Диаграмма модулей`/`Диаграмма фасадов`/`Spec`/`Plan`).

---

## 11. Вне MVP (зафиксировано, но не реализуем сейчас)
- Полный `Scaffold Modules` (генерация кода в `packages/<moduleSlug>/...`).
- Полный execute‑пайплайн с автогейтами и автокоммитами.
- Миграция старых артефактов `.codeai-hub/**` в новую структуру (делается вручную/скриптом при необходимости).
- Полноценный resume после рестарта Core (часть сессионной привязки может быть in-memory и требует отдельного слоя персистентности).

---

## 12. Открытые вопросы (для решения до/в MVP)
1) **Fork Workspace ↔ Git:** делаем fork как `git clone`/новая папка, или как `git worktree`/ветка в текущем checkout?
2) **Формат диаграмм:** Mermaid достаточно для MVP, или сразу вводим data‑формат для layout (JSON) + экспорт в Mermaid?
3) **Валидация артефактов:** “файл существует и не пустой” vs минимальная схема (frontmatter/JSON) уже в MVP?
4) **Конвенция `workspaceSlug`:** равен slug workspace (скрытый уровень), или возвращаем явные инициативы на UI?

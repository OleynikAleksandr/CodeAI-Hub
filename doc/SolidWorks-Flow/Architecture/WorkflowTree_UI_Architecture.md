# Workflow Tree UI (SolidWorks-подобная визуализация разработки)

**Status:** Draft (v0.7)
**Updated:** 2026-01-22
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

На период активной разработки FLOW:
- `project-manager` — **единственный активный UI‑клиент Core** (сессии/артефакты/гейтинг).
- `vscode-webview` — **Settings‑only** (без сессий/чатов/подключения к Core).

---

## 3. Термины и сущности
### 3.1. Доменная модель (для UI)
- **Workspace** — корень дерева (репозиторий/папка проекта).
- **Cluster** — подсистема/домен внутри workspace.
- **Module** — единица ответственности.

Примечание (vNext): после `Scaffold Modules` код каждого модуля материализуется в `packages/<moduleSlug>/...` (kebab-case).
MVP-реальность: текущая реализация Workflow Tree живёт в `src/client/project-manager/`, без генерации модулей в `packages/*`.

- **Step** — шаг workflow (например: `Описание`, `Virtual Simulation`, `Диаграмма модулей`, `Диаграмма фасадов`, `Spec`, `Plan`, `Execute`).
- **Artifact** — файл/результат шага.
- **Session** — диалог с агентом.

Архитектурное правило, которое “цементирует” модель:
- **Module имеет единственный публичный вход**: `*facade`.
- Внутри Module — **микро‑классы** (≤300 строк) и строгая декомпозиция.

### 3.2. Артефакты как слоты (без runs)
Эта часть нужна, чтобы дерево было связано с текущим рантаймом артефактов.

- **Artifact Slot** — “что” мы храним (семантический ключ результата).
  - `workspace.description`
  - `workspace.virtual_simulation`
  - `diagram.modules`
  - `diagram.facades`
  - `module.<slug>.spec`
- **Artifact (current)** — каноничный “текущий” файл результата слота (единственный source-of-truth для downstream).
- **Edit Step** — повторное выполнение шага без “нового run”: пользователь продолжает/создаёт сессию, а система **перезаписывает текущий артефакт** шага (и помечает downstream как `OUTDATED`).

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
- клик по `Artifact` открывает содержимое артефакта во **встроенном viewer** Project Manager (не VS Code editor tab),
- клик по `Session` открывает полный диалог; для `resume`-сессий после перезапуска Project Manager состояние восстанавливается по persisted координатам (providerId + providerSessionId).
  - анти-регрессия: UI-история диалога берётся из unified-session JSONL (`~/.codeai-hub/sessions/.../<dialogSessionId>.jsonl`) и должна восстанавливаться даже если Core стартовал из другого workspace (см. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`).

#### 5.3.1 Contract: Cold Start + Hot Tail (PM UI)
- **History SOT (cold start):** unified JSONL по `dialogSessionId`: `~/.codeai-hub/sessions/<workspaceKey>/<providerId>/<dialogSessionId>.jsonl`, где `workspaceKey = sanitize(workspacePath)`.
- **Hot tail:** live stream событий Core (WS `session:message`) пополняет runtime snapshot, пока Project Manager активен.
- **Dedupe:** UI подавляет replay/reconnect повторы по `messageId` и по ключу `role + createdAt + content` (tail dedupe).
- **Continuity chain:** несколько provider segments одного шага/роли отображаются как единый диалог; bootstrap system prompt continuation segment (segmentIndex > 0) скрывается, чтобы не засорять диалог повторениями.
  - `providerSessionId` используется для resume, но **не** должен быть именем файла истории (иначе история распадётся на сегменты).

Контракт `Resume` (без дублей):
- клик по `Session` сначала проверяет `resumeMode`:
  - `resume_in_place` / `resume_via_rollover`: intent **focus/resume** по `providerId + providerSessionId` (а не прямой `session:create`);
  - `no_resume`: открыть transcript в read-only (без `session:create` и без unlock input).
- если сессия с тем же `providerId + providerSessionId` **уже есть** в списке — **фокус** на неё (не создаём новую).
- если такая сессия была “закрыта” в UI — она **показывается снова** (local hide → show).
- если сессии нет и режим поддерживает resume — создаём/resume новую и **после `session:created` подгружаем историю** из unified-session JSONL.
- `Close` в UI = **скрыть локально**, не удалять session record в Core.

Примечание по `Session Continuity`:
- continuity/handoff — инфраструктура ядра и **не отображается** в Workflow Tree (пользователь видит только актуальную сессию шага).

---

## 5. Дерево: узлы и визуальные правила
### 5.1. Типы узлов (MVP)
- `Workspace`
- `Cluster`
- `Module`
- `Step`
- `Artifact`
- `Session`

Визуальные правила MVP:
- `Step` отображается как **треугольник** (раскрываемый узел), потому что шаг может содержать ветку документов/сессий.
- Цвет треугольника шага:
  - `TODO` → серый
  - `IN_PROGRESS` → оранжевый
  - `DONE` → зелёный

Общее правило для всех шагов (важно):
- У каждого `Step` есть **ветка актуальных сущностей**, которые должны переживать перезапуск Project Manager:
  - артефакты (файлы, которые реально существуют в `.codeai-hub/**`);
  - сессии (resume-точки, в которых артефакты создавались/обсуждались).
- По мере прохождения шага ветка **обновляется**: промежуточные сущности могут заменяться финальными; после завершения шага в ветке остаются только сущности, которые нужны для дальнейшего Flow.

Визуальная ось модульных шагов: `Spec`/`Plan`/`Execute` выравниваются по оси маркера `Module`, а вложенные подшаги (например `Orchestration`) смещаются глубже.

### 5.2. Пример дерева (workspace‑проект с кластерами)
```
Workspace: App
├─ Описание (Step)
│  ├─ Artifact: questionnaire.md
│  ├─ Description <Provider> (one-shot/no-resume; read-only после финального ответа)
│  ├─ Artifact: description.md (draft, run output)
│  ├─ Reviewer <Provider> (resume session)
│  └─ Artifact: Final_Description.md
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
- `Session` отображается как дочерний узел под `Step` (для resume/продолжения работы).
- Для `no_resume` сессий (`Description <Provider>`) узел остаётся в дереве как read-only история и не разблокирует input после финального ответа.
- Один `Session` может быть показан под несколькими `Artifact` как “ссылка” (один и тот же ID), если сессия породила/изменила несколько артефактов.

Критично (vNext инфраструктура): длительные сессии должны поддерживать “handoff” при исчерпании контекстного окна (цепочка сессий под одним шагом). См. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`.

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
  - в процессе шага (пока `IN_PROGRESS`) должны быть доступны:
    1) `questionnaire.md` (persisted, чтобы пережить перезапуск)
    2) `Description <Provider>` (one-shot/no-resume; terminal/read-only после финального ответа)
    3) `description.md` (draft, результат run)
    4) `Reviewer <Provider>` (resume; авто-старт после появления draft)
  - результат шага (источник истины для downstream): `Final_Description.md`
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

Примечание: цветовая схема для `BLOCKED`, `OUTDATED`, `ERROR` — **отложенное решение** (см. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`).

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

### 9.1. Канон путей артефактов (без runs)
Каждый шаг имеет собственный корень и **единый** текущий артефакт:
- `.codeai-hub/<workspaceSlug>/description/description.md` (draft; временный файл между Description Agent и Reviewer)
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`

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
Для шага хранится “resume-точка” (SessionRef) на активную сессию агента (например Reviewer).
История диалогов/перезапусков обеспечивается `Session Continuity` (handoff цепочки), а не `runs`.
Для `no_resume` сессий SessionRef не используется как точка возобновления ввода.

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

---

## Appendix A — Step split (MVP канон)

# Архитектура: Split шагов Workflow Tree и раздельные агенты

**Date:** 2026-01-17
**Updated:** 2026-02-01 (release 1.1.493)
**Status:** Draft
**Target release:** 1.1.493+

---

## 1. Проблема
Текущая схема объединяет **два артефакта в один шаг/агент**, из‑за чего:
- ответ может превышать лимит токенов и не доходить до structured output,
- пайплайн `artifact-upsert` не срабатывает, а backup не создаётся,
- правки становятся двусмысленными (непонятно, к какому артефакту относится уточнение).

Это архитектурная причина, а не “ошибка обработки” — нужно убрать сам риск, а не ловить его пост‑фактум.

---

## 2. Цели
1. **Один шаг = один финальный артефакт (source of truth).**
2. Убрать сущность `Idea` из терминологии, шаблонов и путей.
3. Развести `Диаграммы` на два независимых шага.
4. Полностью убрать сущность `runs` и заменить повторные попытки на `Edit Step` (перезапись текущего артефакта).

---

## 3. Новые шаги и агенты (MVP)

| Step (UI) | stageId | Агент | Артефакт | Slot |
|---|---|---|---|---|
| Описание | `description` | Description Agent (one-shot/no-resume) → Reviewer Agent (auto, resume) | `Final_Description.md` | `workspace.description` |
| Virtual Simulation | `virtual_simulation` | Virtual Simulation Agent | `virtual-simulation.md` | `workspace.virtual_simulation` |
| Диаграмма модулей | `diagram_modules` | Module Diagram Agent | `modules-diagram.mmd` | `diagram.modules` |
| Interface Map (Диаграмма фасадов) | `diagram_facades` | Facades Diagram Agent | `facades-graph.mmd` | `diagram.facades` |

Ключевой инвариант: **агент не пытается писать два артефакта в одном ответе**.

UI правило (для всех шагов):
- каждый `Step` в Workflow Tree — раскрываемый узел с веткой “артефакты + сессии”, чтобы прогресс переживал перезапуск (см. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`).
- история диалога сессий хранится в unified-session JSONL и должна восстанавливаться после рестарта Core/PM (см. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`).

Примечание для `description`:
- `description.md` существует как **черновик** (run output) между Description Agent и Reviewer.
- `Final_Description.md` — **единственный** финальный артефакт, который читают downstream шаги.
- `Description Agent` после финального ответа переходит в terminal/read-only (input не unlock); дальнейшее общение идёт только через `Reviewer`.

UI последствия:
- В дереве разработки Project Manager вместо двух узлов (Описание/Диаграмма) отображаются четыре: Описание, Virtual Simulation, Диаграмма модулей, Диаграмма фасадов.
- В верхнем сайдбаре Project Manager вместо двух иконок появляются четыре, по одной на каждый шаг.

---

## 4. Пути артефактов (без runs)
Каждый шаг имеет собственный корень и **единый** текущий артефакт:
- `.codeai-hub/<workspaceSlug>/description/description.md` (draft; временный файл между Description Agent и Reviewer)
- `.codeai-hub/<workspaceSlug>/description/Final_Description.md`
- `.codeai-hub/<workspaceSlug>/virtual_simulation/virtual-simulation.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/modules-diagram.mmd`
- `.codeai-hub/<workspaceSlug>/diagram_facades/facades-graph.mmd`

Это убирает смешивание артефактов и упрощает диагностику.

---

## 5. Гейты и порядок шагов
Последовательность фиксируется на уровне workflow‑gates:
`Описание → Virtual Simulation → Диаграмма модулей → Interface Map (Диаграмма фасадов) → Spec → Plan → Execute`.

`Module: Spec` активен **только** после `Workspace: Диаграмма фасадов`.

---

## 6. Template namespace (новый)
Убираем `full-development-flow/idea` и вводим **шаговые namespaces**:

```
~/.codeai-hub/templates/
├── description/
│   ├── description-collector-prompt.md
│   ├── description-template.md
│   └── questionnaire-template.md
├── virtual_simulation/
│   ├── virtual-simulation-prompt.md
│   └── virtual-simulation-template.md
├── diagram_modules/
│   ├── modules-diagram-prompt.md
│   └── modules-diagram-template.mmd
└── diagram_facades/
    ├── facades-graph-prompt.md
    └── facades-graph-template.mmd
```

Старые шаблоны удалены и не используются в новых сессиях.

---

## 7. Миграция и совместимость
- Старые `idea`‑шаблоны не переиспользуются.
- Старые `runs/*` считаются legacy и подлежат миграции/удалению по мере вычистки кода.
- UI и Core обновляются одновременно (gates, контракты, template sync).

---

## 8. Вывод
Разделение шагов и агентов **устраняет первопричину** сбоев сохранения:
- нет длинных “двойных” ответов,
- все артефакты финализируются предсказуемо,
- исправления адресуются к конкретному шагу без двусмысленности.

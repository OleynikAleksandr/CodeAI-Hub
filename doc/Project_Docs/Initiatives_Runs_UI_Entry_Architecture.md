# Initiatives + Auto Runs — Универсальный вход в Flow (MVP)

**Date:** 2026-01-09
**Status:** Implemented (v1.1.396)

---

## 1. Проблема
UI стартует Flow напрямую с кнопок стадий (Idea/Spec/Plan/Execute). Но реальный workspace может содержать несколько параллельных «веток разработки» (кластеров/инициатив), у каждой из которых:
- своя идея (Description),
- своя модульная карта,
- своя история попыток (runs),
- свои артефакты по стадиям.

Если не ввести инициативы/раны как первичные сущности входа и хранения артефактов сейчас, позднее миграция станет дорогой: придётся менять пути, UI-навигацию и API одновременно.

---

## 2. Цели MVP
1) До кнопок стадий Flow пользователь выбирает контекст работы:
- **Initiative** (инициатива/кластер/задача).

2) **Run** создаётся автоматически при каждом запуске стадии (Idea/Spec/Plan/Execute/будущие Diagram шаги). Пользователь не создаёт run вручную; чтобы получить новую версию артефактов — он просто запускает ту же стадию ещё раз.

3) **Simple Chat** остаётся всегда доступным (без инициативы).

4) Инициативы создаются с **человекочитаемыми именами** (обязательное поле) и (опционально) описанием.

5) Артефакты сохраняются по каноничным путям: `initiative -> run -> stage -> artifacts`.

---

## 3. Термины (внутренние)
- **Project**: текущий workspace.
- **Initiative**: кластер/задача верхнего уровня (имеет Idea/модульную карту).
- **Run**: автоматическая попытка/версия артефактов внутри Initiative. Создаётся системой при старте стадии.
- **Stage**: шаг Flow (`simpleChat`, `idea`, `spec`, `plan`, `execute`, будущие diagram/map).

---

## 4. Идентификаторы, имена и имена папок

### 4.1 displayName / description (UX)
- `displayName`:
  - обязательное поле для initiative;
  - показывается в UI списках;
  - задаётся пользователем при создании.
- `description?`:
  - опционально;
  - показывается как tooltip/подсказка в списках.

### 4.2 Slug как имя папки
Требование: имена папок должны быть понятны пользователю.

- `initiativeSlug`:
  - вычисляется из `displayName` как `kebab-case + lowercase`;
  - используется как имя папки инициативы;
  - в MVP **стабилен** (переименование меняет `displayName`, но не папку).

- `runSlug`:
  - создаётся автоматически при старте стадии;
  - формат: `NNN-<model>`;
  - `NNN` — счётчик внутри инициативы, `001`, `002`, ...;
  - `<model>` — идентификатор модели провайдера:
    - Codex: полное имя модели (например `gpt-5.2-codex-high`),
    - Claude: alias `sonnet | opus | haiku`.
  - строка приводится к lowercase, недопустимые символы нормализуются в `-`.

### 4.3 runId (стабильный идентификатор)
- `runId`:
  - стабильный id (uuid/ulid);
  - хранится в `run.json`;
  - используется для выбора текущего run (внутренне).

---

## 5. Хранение (каноничные пути)
Корень: `.codeai-hub/initiatives/` (создаётся при первой инициативе).

### 5.1 Initiative
- `.codeai-hub/initiatives/<initiativeSlug>/initiative.json`
  - поля (минимум):
    - `initiativeSlug`: string
    - `displayName`: string
    - `description?`: string
    - `createdAt`, `updatedAt`: ISO
    - `currentRunId?`: string

### 5.2 Runs
- `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/run.json`
  - поля (минимум):
    - `runId`: string
    - `runSlug`: string
    - `displayName`: string (тот же `NNN-<model>`)
    - `description?`: string
    - `createdAt`: ISO

### 5.3 Артефакты по стадиям
- `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/<stage>/...`

Пример для idea:
- `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/idea.md`
- `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/virtual-simulation.md`
- `.codeai-hub/initiatives/<initiativeSlug>/runs/<runSlug>/idea/questionnaire.md`

> Примечание: шаблоны остаются в `~/.codeai-hub/templates/full-development-flow/...`, но пути артефактов в шаблонах/контрактах должны указывать на канон `/.codeai-hub/initiatives/...`.

---

## 6. Минимальный Core API (MVP)

### 6.1 Workspace context
Вызовы Initiatives/Runs должны однозначно знать, в какой workspace писать `.codeai-hub/...`.

MVP-стратегия:
- VS Code webview: `workspacePath` известен Extension Host и передаётся в Core (в payload запроса).
- standalone web-client: `workspacePath` инжектируется в `__CODEAI_CORE_CONFIG`.

### 6.2 Initiatives
- `GET /api/v1/orchestrator/initiatives` — список инициатив (slug + displayName + currentRun)
- `POST /api/v1/orchestrator/initiatives` — создать инициативу (displayName, description?)

### 6.3 Runs
- `GET /api/v1/orchestrator/initiatives/<initiativeSlug>/runs` — список run’ов (для диагностики/истории)
- `POST /api/v1/orchestrator/initiatives/<initiativeSlug>/runs/<runId>/select-current` — сделать run текущим (внутреннее)

> Важно: UI **не создаёт** run вручную. Run создаётся автоматически при запуске стадии (start Idea/Spec/Plan/Execute).

---

## 7. UI-изменения (vscode-webview + web-client)
### 7.1 Новый «контекст работы»
Требование UX:
- слева: dropdown инициативы (по `displayName`)
- справа: кнопка `+` (создать новую инициативу с именем и (опц.) описанием)
- **run selector отсутствует**

### 7.2 Разделение кнопок на зоны
- левая зона: `Simple Chat`
- правая зона: кнопки Flow (Idea/Spec/Plan/Execute)

Правило: Flow-кнопки доступны только при выбранной инициативе. Simple Chat — всегда.

### 7.3 Авто‑runs
При запуске стадии (после выбора провайдера) система автоматически:
- создаёт новый run `NNN-<model>`,
- назначает его текущим для инициативы,
- пишет артефакты в `.../runs/<runSlug>/<stage>/...`.

---

## 8. Замечания по будущему
- Набор стадий зависит от типа инициативы (приложение/кластер: Idea + Diagram шаги; модуль: полный Flow).
- UI позже получит историю run’ов и переключатель версий артефактов.

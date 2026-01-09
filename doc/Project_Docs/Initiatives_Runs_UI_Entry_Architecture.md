# Initiatives + Runs — Универсальный вход в Flow (MVP)

**Date:** 2026-01-09
**Status:** Draft

---

## 1. Проблема
Сейчас UI стартует Flow напрямую с кнопок стадий (Idea/Spec/Plan/Execute). Но реальный workspace может содержать несколько параллельных «веток разработки» (кластеров/инициатив), у каждой из которых:
- своя идея (Description),
- своя модульная карта,
- своя история попыток (runs/takes),
- свои артефакты по стадиям.

Если не ввести инициативы/раны как первичные сущности входа и хранения артефактов сейчас, позднее миграция станет дорогой: придётся менять пути, UI-навигацию и API одновременно.

---

## 2. Цели MVP
1) До кнопок стадий Flow пользователь выбирает контекст работы:
- **Initiative** (инициатива/кластер/задача)
- **Run** (попытка/итерация внутри инициативы)

2) **Simple Chat** остаётся всегда доступным (без инициативы/рана).

3) Инициативы и раны создаются с **человекочитаемыми именами** (обязательное поле) и (опционально) описанием.

4) Артефакты сохраняются по каноничным путям: `initiative -> run -> stage -> artifacts`.

---

## 3. Термины (внутренние)
- **Project**: текущий workspace.
- **Initiative**: кластер/задача верхнего уровня (имеет Idea/модульную карту).
- **Run**: отдельная попытка/итерация внутри Initiative (вариант решения, эксперимент, новая попытка).
- **Stage**: шаг Flow (`simpleChat`, `idea`, `spec`, `plan`, `execute`, будущие diagram/map).

---

## 4. Идентификаторы, имена и имена папок
### 4.1 displayName / description (UX)
- `displayName`:
  - обязательное поле для initiative и run;
  - показывается в UI списках;
  - задаётся пользователем при создании.
- `description?`:
  - опционально;
  - показывается как tooltip/подсказка в списках (чтобы различать похожие варианты).

### 4.2 Slug как имя папки
Требование: имена папок должны быть понятны пользователю.

- `initiativeSlug`:
  - вычисляется из `displayName` как `kebab-case + lowercase`;
  - используется как имя папки инициативы;
  - в MVP **стабилен** (переименование меняет `displayName`, но не папку).

- `runSlug`:
  - вычисляется из `displayName` как `kebab-case + lowercase`;
  - используется как имя папки run’а внутри инициативы.

Правило уникальности (MVP):
- если `initiativeSlug` уже существует — добавляем суффикс `-2`, `-3`, ...
- если `runSlug` уже существует в рамках инициативы — добавляем суффикс `-2`, `-3`, ...

### 4.3 runId (стабильный идентификатор)
- `runId`:
  - стабильный id (uuid/ulid);
  - хранится в `run.json`;
  - используется в API как ключ (UI оперирует `runId`, но показывает `displayName`).

---

## 5. Хранение (каноничные пути)
Корень: `.codeai-hub/full-development-flow/initiatives/`.

### 5.1 Initiative
- `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/initiative.json`
  - поля (минимум):
    - `initiativeSlug`: string
    - `displayName`: string
    - `description?`: string
    - `createdAt`, `updatedAt`: ISO
    - `currentRunId?`: string

### 5.2 Runs
- `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/runs/<runSlug>/run.json`
  - поля (минимум):
    - `runId`: string
    - `runSlug`: string
    - `displayName`: string
    - `description?`: string
    - `createdAt`: ISO

### 5.3 Артефакты по стадиям
- `.codeai-hub/full-development-flow/initiatives/<initiativeSlug>/runs/<runSlug>/<stage>/...`

Пример для idea:
- `.../idea/idea.md`
- `.../idea/virtual-simulation.md`
- `.../idea/questionnaire.md`

---

## 6. Минимальный Core API (MVP)

### 6.0 Workspace context (решение для MVP)
Вызовы Initiatives/Runs должны однозначно знать, в какой workspace писать `.codeai-hub/...`.

MVP-стратегия:
- VS Code webview: workspacePath известен Extension Host и передаётся в Core (в payload запроса).
- standalone web-client (CEF/Browser): workspacePath должен быть инжектирован в окружение (например, в `__CODEAI_CORE_CONFIG` или отдельный bootstrap payload).

Примечание: в реализации нужен явный контракт (где именно передаём workspacePath) и валидация, чтобы записи происходили строго внутри этого workspace.

### 6.1 Initiatives
- `GET /api/v1/orchestrator/initiatives` — список инициатив (slug + displayName + currentRun)
- `POST /api/v1/orchestrator/initiatives` — создать инициативу (displayName, description?) + (опционально) создать первый run

### 6.2 Runs
- `GET /api/v1/orchestrator/initiatives/<initiativeSlug>/runs`
- `POST /api/v1/orchestrator/initiatives/<initiativeSlug>/runs` — создать run (displayName, description?)
- `POST /api/v1/orchestrator/initiatives/<initiativeSlug>/runs/<runId>/select-current` — сделать run текущим

---

## 7. UI-изменения (vscode-webview + web-client)
### 7.1 Новый «контекст работы» (одна строка над кнопками)
Требование UX:
- слева: индикатор/иконка dropdown + текущая инициатива (по `displayName`)
- тут же: текущий run (по `displayName`) — потому что без выбора run нельзя «провалиться» в ветку работы
- справа: кнопка `+` (создать новую инициативу с именем и (опц.) описанием)
- рядом: `+ run` (создать новый run с именем и (опц.) описанием)

### 7.2 Разделение кнопок на зоны
- левая зона: `Simple Chat`
- правая зона: кнопки Flow (пока: Idea/Spec/Plan/Execute)

Правило: кнопки Flow доступны только при выбранных `initiativeSlug + runId`. Simple Chat — всегда.

### 7.3 Будущая эволюция (не в MVP)
- Состав кнопок Flow зависит от типа инициативы (кластер/приложение: сначала Description + Diagram/Interface; модуль: полный Spec/Plan/Execute).
- В правой зоне рядом с кнопками Flow появится кнопка «перейти к разработке модулей», где будет выбор модуля и отдельный набор шагов.

---

## 8. Замечания по будущему
- `project-manager` остаётся отдельным окном и позже переиспользует тот же Core API и те же пути.

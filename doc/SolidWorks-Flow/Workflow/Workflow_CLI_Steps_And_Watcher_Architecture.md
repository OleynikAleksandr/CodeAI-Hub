# Workflow: CLI Steps + Watcher (Architecture)

**Status:** Approved
**Updated:** 2026-01-18
**Owner:** Oleksandr + Codex
**Approval:** 2026-01-18 (user)

---

## 1) Проблема
Исторически Workflow для стадий (Description / Virtual Simulation / Diagrams) опирался на `structured output` и `artifact-upsert` через `artifacts[]`.

Фактическая проблема:
- `outputSchema` не гарантирует жёсткое соблюдение контракта на уровне LLM.
- В результате модель может вернуть payload, который не проходит allowlist слотов/валидаторов Core (пример: `slot=question1`) и запись артефакта ломается.
- Мы тратим время на «гонку» форматов вместо достижения цели Flow (качественные артефакты → хороший план микро‑задач).

## 2) Цель
Перейти на надёжный и простой подход:
- **Агенты создают артефакты напрямую** (через CLI tools / file write) по заранее определённым путям внутри `.codeai-hub/...` (без `runs`).
- **Watcher** наблюдает прогресс (файлы/события/гейты) и обновляет:
  - состояние workflow (для UI gating);
  - автоматизацию (например, авто‑валидаторы, авто‑подсказки).

## 3) Не‑цели
- Не делаем сейчас «идеальную» универсальную систему контрактов для всех провайдеров.
- Не пытаемся стандартизировать Markdown контент: допускается креативность.
- Не публикуем GitHub релизы (локальные релизы только по чеклисту).

## 4) Ключевое решение (Decision)
### 4.1. Для стадий Description/Virtual Simulation/Diagrams: no structured-output
- Для этих стадий **structured output выключаем**.
- Агент работает в «обычной» сессии и использует инструменты для:
  - чтения входных документов;
  - записи итогового файла артефакта.

### 4.2. Paths остаются каноничными (без runs)
Артефакты пишутся по канону (один “current” файл на шаг):
- `.codeai-hub/<workspaceSlug>/<stage>/questionnaire.md` (если применимо)
- `.codeai-hub/<workspaceSlug>/<stage>/<fileName>`

Примечание для шага `description`:
- `.codeai-hub/<workspaceSlug>/description/description.md` может существовать как временный draft;
- downstream шаги читают только `.codeai-hub/<workspaceSlug>/description/Final_Description.md`.

Слоты (`workspace.description`, `workspace.virtual_simulation`, `diagram.modules`, `diagram.facades`) остаются на уровне UI/логики, но запись осуществляется **файлом**, а не `artifact-upsert`.

## 5) Single-turn «Prompt Pack»
Поскольку каждый шаг заранее спланирован, стартовый запрос к агенту должен быть максимально детерминированным.

Подход (v1.1.442+ path-first):
- Core/UI формирует **один стартовый промпт**, куда включены:
  - короткая инструкция для стадии;
  - пути к анкете и входным документам (relative/absolute);
  - пути из `pre_read_documents` (если есть);
  - путь к шаблону артефакта;
  - точный абсолютный путь, куда агент должен записать итоговый файл.
- Core **не auto-attach** содержимое файлов: агент читает их сам средствами провайдера (без `/read`).

Важно:
- Агент может задавать уточняющие вопросы, но цель — **минимум турнов**.

## 6) Watcher: ответственность и события
### 6.1. Что должен уметь Watcher
- Отслеживать появление/изменение файлов артефактов в `.codeai-hub/<workspaceSlug>/**`.
- Определять «готовность» стадии по факту наличия файлов.
- Обновлять workflow state (для UI).

### 6.2. Источники событий
- FS events (watch) по папке `.codeai-hub/<workspaceSlug>/`.
- События сессий (start/stop, provider, модель).
- События гейтов (architecture check / ultracite / ts-prune / jscpd / check:links / builds).

### 6.3. API хуки (внутренний контракт)
Watcher предоставляет «шину событий» (in-process API) для подписчиков:
- UI (Project Manager) — для визуализации и gating.
- Automation (Core) — для автозапуска проверок/подсказок.

Минимальный набор событий:
- `workflow.step.started`
- `workflow.step.edited`
- `workflow.artifact.written`
- `workflow.stage.completed`
- `workflow.stage.invalidated`
- `workflow.gate.started`
- `workflow.gate.passed`
- `workflow.gate.failed`

## 7) Встраивание в систему
### 7.1. Где живёт Watcher
Опция A (предпочтительно): внутри Core (`@codeai-hub/core`) как модуль workflow watcher.
- Плюсы: единая точка правды, проще миграции формата state.
- Минусы: нужно аккуратно управлять watch‑жизненным циклом (workspace connect/disconnect).

### 7.2. Как обновляется UI
Project Manager читает workflow state через Core API.
Watcher обновляет state атомарно.

## 8) Безопасность
- Агентам разрешена запись только в allowlisted пути внутри `.codeai-hub/<workspaceSlug>/...`.
- Запись в произвольные файлы проекта запрещена по умолчанию (или требует явного enable).

## 9) План внедрения (высокоуровнево)
1) Добавить Watcher модуль + API событий.
2) Переключить Description/Virtual Simulation/Diagrams на «обычный чат + file write».
3) Обновить UI gating на основе watcher state.
4) Вернуть structured-output точечно, когда появится реальная польза (например, для «редактора‑консолидатора»).

# Workflow State Fast Restore (Project Manager) — MVP Architecture

**Status:** Draft (needs approval)
**Updated:** 2026-01-21
**Owner:** Oleksandr + Codex

---

## 1) Проблема
После рестарта Core Project Manager долго показывает «пустое/дефолтное» дерево workflow (особенно ветку `Description`), хотя артефакты (`Final_Description.md`, `description-step.json`) уже существуют на диске.

Фактическое проявление:
- после рестарта Core до ~60 секунд нет «реального дерева» (ветки `Description`/статусов), затем оно внезапно появляется.

## 2) Текущая причина (root cause)
Endpoint `GET /api/v1/orchestrator/workflow-state` в Core формирует расширенный ответ:
- `state` (in-memory workflow state)
- `description` (ветка Description из `.codeai-hub/<workspaceSlug>/description/description-step.json`)
- `continuity` (цепочки continuity из `.codeai-hub/<workspaceSlug>/continuity/...`)

Однако чтение `description`/`continuity` требует `workspaceRoot` (абсолютного пути проекта).
Сейчас Core пытается вывести `workspaceRoot` через `SessionManager` (по активным/загруженным сессиям). После рестарта это может быть недоступно сразу, поэтому `description=null` и UI не может восстановить «реальное дерево».

Дополнительно UX ухудшает polling в UI (например, раз в 15 секунд), что растягивает задержку.

## 3) Цель
Сделать восстановление workflow дерева после рестарта Core быстрым и детерминированным, без ожидания загрузки сессий.

## 4) Решение (MVP: быстрый и безопасный)
### 4.1 Контракт API
Расширить `GET /api/v1/orchestrator/workflow-state`:
- принимать опциональный query параметр `workspacePath` (абсолютный путь workspaceRoot).

Правило:
- если `workspacePath` передан и выглядит валидным, Core использует его как `workspaceRoot` для чтения `.codeai-hub/<workspaceSlug>/description/description-step.json` и `.codeai-hub/<workspaceSlug>/continuity/...`.
- если `workspacePath` не передан — текущий механизм остаётся (fallback через SessionManager).

### 4.2 Изменение в UI (Project Manager)
Project Manager уже знает `workspacePath` выбранного workspace, поэтому:
- при запросе workflow-state передавать `workspacePath` вместе с `workspaceSlug`.

### 4.3 Безопасность
- `workspacePath` принимается только как абсолютный путь.
- Core читает только allowlisted файлы внутри `.codeai-hub/<workspaceSlug>/...` через безопасные path join/валидации.

## 5) Верификация (manual)
- Перезапустить Core.
- Открыть Project Manager и выбрать workspace.
- Ожидаемое: ветка `Description` (артефакт + reviewer session) появляется почти сразу (после первого запроса workflow-state), без ожидания ~60s.

## 6) Опции vNext (сложный вариант)
После MVP-фикса принять решение, нужен ли более сложный вариант:
- Persist workflow state на диск (например `.codeai-hub/<workspaceSlug>/workflow/state.json`) и rehydrate на старте Core.

Критерии решения:
- если MVP решает проблему и не ломает безопасность/инварианты — сложный вариант откладываем.
- если нужна мгновенная реконструкция статусов/gates без событий watcher — рассматриваем persist/replay.

# Session Continuity Architecture — Auto-Handoff on Context Budget (CRITICAL)

**Version:** 1.1
**Date:** 2026-02-06
**Status:** Active baseline (Phase 98 continuity contract)

---

## 1. Problem Statement

У любой модели есть ограниченное контекстное окно. В долгоживущих workflow-сессиях (например, `Description → Reviewer`, `Spec/Plan/Execute`) неизбежно наступает момент, когда:
- контекст почти заполнен;
- качество ответов падает или модель начинает терять важные детали;
- продолжение работы становится рискованным (ошибки, галлюцинации, потеря договорённостей).

Нужно системно решить эту проблему один раз и применять ко **всем** агентам и провайдерам.

---

## 2. Goals

- Создать **отдельный модуль** `Session Continuity`, который обеспечивает непрерывность работы:
  - наблюдает метрики контекстного окна (token usage);
  - при достижении порога автоматически инициирует создание **handoff-отчёта**;
  - закрывает текущую сессию и открывает новую;
  - в новую сессию подаёт handoff-отчёт + специализированные инструкции агента;
  - агент читает отчёт, восстанавливает контекст и продолжает работу.

- Порог (MVP): когда осталось **≤ 25%** контекстного бюджета.

---

## 3. Non-Goals

- Не делаем “идеальный” подсчёт токенов на стороне Core для всех провайдеров. MVP использует доступные метрики `used/limit`.
- Не реализуем “вечный” runtime на одном и том же provider thread. Цель — безопасно переходить на новую provider-сессию при handoff.
- Resume в пределах текущего provider segment (например, reconnect/reattach с тем же `providerSessionId`) допустим и не считается handoff.
- Не делаем автокоммит/автогейты в рамках этого модуля (это отдельный поток работы).

---

## 4. Key Decisions

1) `Session Continuity` — **отдельный модуль Core**, независимый от конкретного агента/шага.
2) Триггер: `remainingRatio <= 0.25` (или эквивалент `usedRatio >= 0.75`).
3) Формат handoff-отчёта — Markdown с жёсткой структурой.
4) Handoff-отчёт должен учитывать **инструкции конкретного агента** и текущий контекст workflow (stage/step).
5) Для flow-node rollover lifecycle блокировки ввода передаётся stream-only через `continuity_lock(locked|unlocked)`; legacy `handoff:start|ready` допускается только как backward-compatibility path.
6) Turn lifecycle для UI нормализуется через `turn_state` (`running|idle`), но `idle` сам по себе не гарантирует unlock.
7) Unlock-mode contract:
   - **no-resume**: после финального ответа session terminal/read-only, unlock запрещён;
   - **resume-in-place**: unlock только после `turn_completed` + explicit Core confirmation `no rollover`;
   - **resume-via-rollover**: unlock только после первого bootstrap assistant answer в новой сессии.
8) При `resume_failed|resume_timeout` input не unlock; меняется только lock reason/copy.
9) Для description collector one-shot/no-resume всегда действует terminal/read-only policy.

---

## 5. Inputs / Outputs

### Inputs
- `SessionSnapshot.status.tokenUsage.used/limit` (или эквивалентные провайдерные stats).
- `SessionRef` / binding (providerId + providerSessionId) + unified session JSONL.
- “Agent instruction pack”: специализированные инструкции агента (prompt), которые должны быть повторно применены в новой сессии.
- Workflow context: `workspaceSlug`, `stageId`, `runSlug` (если есть), текущие артефакты шага.

### Outputs
- `handoff-report.md` (артефакт непрерывности).
- Новая сессия, продолжающая работу с восстановленным контекстом.

---

## 6. Data Model

### 6.1 Continuity chain

Для каждой исходной сессии поддерживается “цепочка” продолжений:

- `rootSessionId`
- `segments[]`:
  - `sessionId`
  - `providerId`
  - `providerSessionId`
  - `handoffReportPath` (для сегмента, который был создан handoff’ом)
  - `createdAt`

**Важно (Lazy activation):** `chain.json` создаётся/обновляется **только при первом outbound сообщении в провайдера** (user/system). Простое открытие/attach/resume без сообщений не должно создавать новые root-папки.

Также: если это повторное открытие той же provider-сессии (тот же `providerSessionId`), новый `segments[]` не добавляется (обновляется только `updatedAt`). Новый сегмент появляется только при реальной смене provider session id (handoff).

### 6.2 Handoff report path

MVP-целевой путь хранения отчёта (workspace артефакты):
- `.codeai-hub/<workspaceSlug>/continuity/<stageId>/<rootSessionId>/<ISO_TIMESTAMP>/handoff-report.md`

Примечание: это сознательно **артефакт**, а не внутренний лог — он нужен для восстановления контекста и диагностики.

---

## 7. Handoff Report Contract (MVP)

Отчёт генерируется агентом автоматически и должен быть коротким, но достаточным для продолжения.

Обязательные секции:
- `# Handoff Report — <agentId> / <stageId>`
- `## Current Objective`
- `## Work Summary`
- `## Decisions`
- `## Open Questions / Risks`
- `## Next Steps (ordered)`
- `## Key Files & Paths` (только пути, без больших вставок)
- `## Commands Run` (если релевантно)

Запрещено:
- длинные вставки кода/логов;
- повтор всего чата.

---

## 8. Flow (MVP)

1) `Session Continuity Monitor` регулярно оценивает `remainingRatio`.
2) Когда `remainingRatio <= 0.25`, система переводит сессию в режим **handoff pending**.
3) Система запускает “handoff prompt” для текущего агента (на основе его инструкций + текущего workflow контекста) и требует вывести `handoff-report.md` по контракту.
4) Core дожидается появления отчёта (watcher), затем закрывает текущую сессию и создаёт новую.
5) Новая сессия стартует с:
   - системных инструкций агента (как обычно);
   - контекста workflow;
   - `handoff-report.md` (как входной документ).
6) Агент подтверждает восстановление контекста и продолжает работу.

---

## 9. Integration Points

### 9.1 Core
- `Session Continuity Monitor` (порог + анти-дребезг).
- `Handoff Orchestrator` (генерация отчёта, сохранение, rollover в новую сессию).
- Persist состояния continuity chain.

### 9.2 Providers
- Поставляют метрики token usage (или их приближение).
- Должны эмитить turn lifecycle (`turn_started`, `turn_completed`, `turn_failed`) для корректного `turn_state` в UI.
- В рамках одного segment поддерживается resume/rebind с тем же `providerSessionId` (без создания нового сегмента).
- При rollover создаётся новый provider segment (новый `providerSessionId`).

### 9.3 UI (Project Manager)
- Показывает, что сессия “переключилась” (handoff) и предоставляет доступ к `handoff-report.md`.
- Может визуализировать цепочку сессий как историю под одним Step.
- Управляет блокировкой ввода snapshot-first (`turnState`, `continuityLockActive`, `continuityLockReason`, `continuityLockTransition.awaitingBootstrapTurn`) без эвристик по тексту сообщений.

---

## 10. Failure Modes

- Нет данных `tokenUsage.limit` → continuity отключается для сессии (лог + без падений).
- Handoff-отчёт невалиден/пустой → rollback: не создаём новую сессию автоматически, показываем предупреждение.
- Ошибка записи отчёта → не делаем rollover.

---

## 11. Notes

Этот модуль критичен для долгих workflows и должен считаться базовой инфраструктурой Core, как `Session Manager`.

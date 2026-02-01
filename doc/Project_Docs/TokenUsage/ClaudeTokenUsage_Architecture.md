# Claude Token Usage (Real-time) — Architecture (DRAFT)

**Date:** 2026-02-01
**Scope:** Claude provider (Claude Agent SDK)
**Status:** Updated after /context parity decision

---

## 1) Problem

В UI сессии провайдера требуется **в реальном времени** отображать состояние контекстного окна:

- Формат: `used / total (remaining%)`
- `used` — сколько токенов уже занято текущим контекстом сессии
- `total` — размер контекстного окна выбранной модели
- `remaining%` — процент оставшегося контекстного окна

Дополнительно: при достижении порога (`remaining% <= threshold%`) требуется триггерить **Session Continuity handoff** (отчёт + старт новой сессии). Порог должен быть настраиваемым в Settings → Claude.

---

## 2) Ground Truth (источник истины)

Мы работаем через **Claude Agent SDK**, но считать «занятое контекстное окно» по SDK `usage` нельзя надёжно:

- `sdk:result.usage` — это **totals по run** и может расходиться с тем, что Claude считает «текущим контекстом».
- Claude Code CLI `/context` — источник истины для авто‑компакта (и включает важные компоненты вроде system/tools/memory/skills/compact buffer).

Поэтому источником истины для `used/total` считаем **вывод команды `/context`** (Claude Code CLI), а не попытки суммировать usage‑поля в наших логах.

Ключевой факт: `/context` можно читать локально (через stream-json) без API вызова (`duration_api_ms: 0`).

---

## 3) Definitions

### 3.1 Token usage snapshot (минимальный контракт)

Нормализованная метрика, которую мы стримим в Core и показываем в UI:

- `tokenUsage.used`: number
- `tokenUsage.limit`: number

`remaining%` вычисляется в UI как:

`round((limit - used) / limit * 100)`

---

## 4) Data flow (end-to-end)

### 4.1 Provider → Core

Claude provider module:

1) После каждого завершённого turn (событие `result`) делает локальный запрос контекстного окна:

   `claude -p --verbose --output-format stream-json --resume <sessionId> "/context"`

2) Парсит из вывода строку вида:

   - `Tokens: 43.8k / 200.0k (22%)`  (процент в CLI — used%, мы используем только `used/limit`)

3) Публикует в Core provider-event с нормализованным payload:

- `tokenUsage.used` (в токенах)
- `tokenUsage.limit` (context window)

Примечание: throttling обязателен, чтобы не спамить запуском CLI (в текущей реализации — минимум раз в ~1.5s на сессию).

### 4.2 Core

Core принимает provider events и:

- обновляет `SessionStatusInfo.tokenUsage` для UI
- обновляет internal ContinuityMonitor
- при `remaining% <= threshold` инициирует handoff

### 4.3 UI

UI отображает:

- `used / limit (remaining%)`

---

## 5) Settings

Параметр порога handoff:

- `providers.claude.sessionContinuity.remainingPercentThreshold` (number)
  - default: 30
  - описание: «Когда оставшееся контекстное окно падает до этого значения или ниже, Core автоматически запрашивает handoff-отчёт и начинает новую сессию.»

---

## 6) Rollout plan

1) Claude: `/context` parity для `used/limit`.
2) UI: показывать `remaining%` (не `used%`).
3) (Позже) Codex/Gemini по аналогии, отдельными фазами.

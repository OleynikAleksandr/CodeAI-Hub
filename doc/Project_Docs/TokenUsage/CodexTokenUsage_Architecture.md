# Codex Token Usage (Real-time) — Architecture (DRAFT)

**Date:** 2026-02-01
**Scope:** Codex provider (`@codeai-hub/codex-module`)
**Status:** Draft

---

## 1) Problem

В UI сессии Codex нужно отображать состояние контекстного окна **в реальном времени**:

- Формат: `used / limit (remaining%)`
- `used` — сколько токенов занято текущим контекстом
- `limit` — размер контекстного окна текущей модели
- `remaining%` вычисляется как `round((limit - used) / limit * 100)`

Ключевое требование: это должно соответствовать тому, что показывает Codex CLI (а не «totals по run»).

---

## 2) Ground Truth (источник истины)

У Codex CLI нет `/context`, но есть `/status`, который выводит строку:

`Context window: 82% left (55.3K used / 258K)`

Эта строка содержит ровно те данные, которые нужны продукту: **used / limit** для текущего контекстного окна.

Важно:
- Нельзя подменять этот показатель totals из событий run (`total_token_usage.total_tokens` и т.п.), потому что это другая метрика.
- `/status` должен рассматриваться как source-of-truth для UI token usage (аналогично подходу Claude → `/context`).

---

## 3) Definitions

### 3.1 Token usage snapshot (нормализованный контракт)

Внутренний контракт, который Codex module стримит в Core:

- `tokenUsage.used: number`
- `tokenUsage.limit: number`

UI рассчитывает `remaining%` из этих значений.

### 3.2 Parsing rules (K/M суффиксы)

`/status` использует компактные числа:
- `55.3K` → `55300`
- `258K` → `258000`
- поддержка `M` (миллионы) обязательна
- десятичные дроби допустимы (`55.3K`)

---

## 4) Data flow (end-to-end)

### 4.1 Provider (Codex module) → Core

1) После завершения каждого turn (критерий: событие завершения turn в event stream / SDK callback), Codex module инициирует чтение `/status`.
2) Чтение выполняется **только для resumed session** (нужен `providerSessionId`/thread id).
3) Результат парсится, нормализуется в `{ used, limit }`.
4) Если snapshot изменился относительно последнего (или ещё не было snapshot) — отправляется provider-event в Core:
   - `stream_event` с `tokenUsage: { used, limit }`

### 4.2 Throttling

Чтобы не спамить запуском CLI, нужен throttling:
- минимум 1 попытка на сессию раз в ~1.5s (или больше)
- параллельные попытки для одного `providerSessionId` запрещены (in-flight lock)

### 4.3 Core → UI

Core принимает `tokenUsage` события и:
- обновляет `SessionStatusInfo.tokenUsage` для UI
- сохраняет last-known snapshot в continuity `chain.json` (см. Session 65)
- при `session:binding` восстанавливает snapshot и сразу стримит в UI

---

## 5) Codex session logs (filesystem contract)

Codex внутри CodeAI Hub работает с `CODEX_HOME`:

- `CODEX_HOME=~/.codeai-hub/providers/codex/home`

Сессии Codex CLI пишутся в:

- `~/.codeai-hub/providers/codex/home/sessions/YYYY/MM/DD/rollout-<timestamp>-<providerSessionId>.jsonl`

Примечания:
- `providerSessionId` — это UUID сессии Codex (thread id), который отображается в `/status` как `Session: ...`.
- Внутри `rollout-*.jsonl` присутствует `session_meta.payload.id` и `session_meta.payload.cwd`, что можно использовать для диагностики и (при необходимости) для корректного выбора cwd.

### 5.1 Resolver по `providerSessionId`

Нужен устойчивый resolver, который по `providerSessionId` находит rollout JSONL:

1) Предпочтительный путь: быстрый поиск по известным датам в пределах года (например, `sessions/2026/**/rollout-*-<id>.jsonl`).
2) Fallback: ограниченный scan по `CODEX_HOME/sessions` (с лимитами глубины/количества файлов), чтобы поддержать migrations/legacy.

Цель: обеспечить корректный `cwd` для CLI-вызовов и возможность debug (не источник истины для tokenUsage).

---

## 6) Anti-regression правила

1. **Не использовать totals по run как “context used”.**
2. `/status` parsing должен быть устойчив к форматированию (пробелы, рамки TUI, разные проценты).
3. Token usage update должен быть “silent” для UI: результат `/status` не должен появляться как пользовательское/ассистентское сообщение в истории.
4. На ошибках `/status` нельзя сбрасывать UI в `0` — только “нет обновления” (используем last-known snapshot).

---

## 7) Verification checklist

- В активной Codex-сессии UI показывает значения, совпадающие с `/status` (например, `55.3K / 258K`).
- После рестарта Core и повторного `session:binding` UI показывает last-known token usage (не 0).
- В multi-workspace сценарии token usage не “пропадает” (потому что он persistится в continuity по `providerSessionId`).

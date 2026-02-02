# Codex Token Usage (Real-time) — Architecture (DRAFT, revised)

**Date:** 2026-02-02
**Scope:** Codex provider (`@codeai-hub/codex-module`)
**Status:** Draft (revised after validating `/status` limitations)

---

## 1) Problem

В UI сессии Codex нужно отображать состояние контекстного окна **в реальном времени**:

- Формат: `used / limit (remaining%)`
- `used` — сколько токенов занято текущим контекстом
- `limit` — размер контекстного окна текущей модели
- `remaining%` вычисляется как `round((limit - used) / limit * 100)`

Ключевое требование: метрика должна быть консистентной и восстанавливаемой после рестартов Core (через continuity).

---

## 2) Ground Truth (источник истины)

### 2.1 Почему не `/status`

`/status` — это TUI slash-команда интерактивного Codex CLI.

Практическая проверка показала:
- в non-interactive режиме (`codex exec --json` / SDK) строка `Context window: ...` **не возвращается**;
- отправка текста `"/status"` в `codex exec` трактуется как обычный prompt и **портит контекст**.

Следовательно, `/status` нельзя использовать как программный source-of-truth внутри `@codeai-hub/codex-module`.

### 2.2 Source-of-truth: provider `token_count` (rollout JSONL)

Codex CLI пишет в rollout JSONL события `token_count`, которые появляются в конце turn.

Именно они содержат все нужные значения:
- `used` берём из `token_count.info.last_token_usage.total_tokens`
- `limit` берём из `token_count.info.model_context_window`

Важно: поле `total_token_usage` — накопительная метрика по run/сессии и **не должно** использоваться для `used`.

---

## 3) Definitions

### 3.1 Token usage snapshot (нормализованный контракт)

Контракт, который Codex module стримит в Core:

- `tokenUsage.used: number`
- `tokenUsage.limit: number`

### 3.2 remaining% (единственная формула для UI)

`remaining% = round((limit - used) / limit * 100)`

Примечание: процент, который показывает интерактивный TUI `/status`, может не совпадать с арифметикой по `used/limit`.
Для продукта авторитетны именно `used/limit` и вычисление процента по формуле выше.

---

## 4) Data flow (end-to-end)

### 4.1 Provider (Codex module) → Core

1) После завершения каждого turn (событие `turn.completed` в SDK event stream) Codex module инициирует refresh token usage.
2) Refresh читает rollout JSONL для текущей resumed session (`providerSessionId` = thread id).
3) Извлекает последний `token_count` snapshot → `{ used, limit }`.
4) Если snapshot изменился относительно последнего (или ещё не было snapshot) — отправляет provider-event в Core:
   - `stream_event` с `tokenUsage: { used, limit }`

### 4.2 Throttling

Чтобы не спамить файловым I/O и избежать гонок:
- throttling: минимум 1 попытка на сессию раз в ~1500ms (или больше)
- параллельные попытки для одного `providerSessionId` запрещены (in-flight lock)

### 4.3 Core → UI

Core принимает `tokenUsage` события и:
- обновляет `SessionStatusInfo.tokenUsage` для UI
- сохраняет last-known snapshot в continuity `chain.json` (см. Session 65)
- при `session:binding` восстанавливает snapshot и сразу стримит в UI

---

## 5) Codex rollout logs (filesystem contract)

### 5.1 CODEX_HOME

CodeAI Hub запускает Codex с изолированным домом:

- `CODEX_HOME=~/.codeai-hub/providers/codex/home`

### 5.2 Rollout JSONL path

Сессии Codex CLI пишутся в:

- `~/.codeai-hub/providers/codex/home/sessions/YYYY/MM/DD/rollout-<timestamp>-<providerSessionId>.jsonl`

Внутри файла присутствует `session_meta.payload.id` (тот же `providerSessionId`).

### 5.3 Resolver по `providerSessionId`

Нужен устойчивый resolver, который по `providerSessionId` находит rollout JSONL:

1) Primary: поиск точного пути по маске:
   - `CODEX_HOME/sessions/**/rollout-*-<providerSessionId>.jsonl`
2) Fallback: ограниченный scan по `CODEX_HOME/sessions` и подтверждение кандидата:
   - `session_meta.payload.id == providerSessionId`

---

## 6) Anti-regression правила

1) **Не использовать** `total_token_usage` как “context used” — только `last_token_usage.total_tokens`.
2) **Не вызывать** `/status` через `codex exec` (SDK) — это не команда, а prompt.
3) `%remaining` считаем **только** по формуле `round((limit - used)/limit*100)`.
4) На ошибках чтения rollout JSONL нельзя сбрасывать UI в `0` — только “нет обновления” (используем last-known snapshot).
5) Refresh должен быть internal-only: чтение rollout JSONL не должно создавать сообщений/записей в unified session history.

---

## 7) Verification checklist

- `used/limit` в UI совпадает со значениями в скобках интерактивного `/status` для той же resumed session.
- `%remaining` в UI совпадает с арифметикой по `used/limit`.
- После рестарта Core и повторного `session:binding` UI показывает last-known token usage (не 0).
- В multi-workspace сценарии token usage не “пропадает” (persistence/restore работает по `providerSessionId`).

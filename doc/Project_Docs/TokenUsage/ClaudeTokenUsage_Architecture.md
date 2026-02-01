# Claude Token Usage (Real-time) — Architecture (DRAFT)

**Date:** 2026-02-01
**Scope:** Claude provider (Claude Agent SDK)
**Status:** Draft for approval

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

Мы работаем через **Claude Agent SDK**.

Источник истины для real-time расхода контекста:
- Stream events от Claude/SDK, содержащие usage-метрики (input/output/cache tokens) во время генерации.

Источник истины для лимита контекстного окна:
- `contextWindow` из payload (например, итоговый `sdk:result` содержит `modelUsage.<modelId>.contextWindow`), либо заранее известный лимит для модели.

---

## 3) Definitions

### 3.1 Token usage snapshot

Нормализованная метрика, которую хранит Core и показывает UI:

- `usedTokens`: number
- `limitTokens`: number
- `remainingTokens`: number
- `remainingRatio`: number (0..1)
- `remainingPercent`: number (0..100)
- `updatedAt`: ISO timestamp

### 3.2 What counts as “used”

Для целей «оставшегося контекста» считаем:

`usedTokens = inputTokens + outputTokens + cacheReadInputTokens + cacheCreationInputTokens`

Это соответствует суммарному объёму контента, который реально “съедает” контекстное окно во время сессии.

---

## 4) Data flow (end-to-end)

### 4.1 Provider → Core

Claude provider module должен:

1) Включить стриминг “сырьевых” событий SDK (режим partial/stream events).
2) На каждом событии, где доступен usage, публиковать в Core provider-event с нормализованным payload:

- `tokenUsage.used` (в токенах)
- `tokenUsage.limit` (context window)
- `tokenUsage.updatedAt`

Важно: limit может быть неизвестен на ранних событиях; он должен быть получен как можно раньше (из modelUsage/contextWindow) и затем использоваться для всех последующих real-time апдейтов.

### 4.2 Core

Core принимает provider events и:

- обновляет `SessionStatusInfo.tokenUsage` для UI
- обновляет internal ContinuityMonitor
- при `remainingRatio <= threshold` инициирует handoff

Threshold:
- дефолт: `0.30` (30%)
- переопределяется настройкой пользователя (Settings → Claude)

### 4.3 UI

UI отображает:

- `used / limit (remaining%)`

Где `remaining% = round((limit - used) / limit * 100)`.

---

## 5) Settings

Добавить в Settings → Claude новый параметр:

- `sessionContinuity.remainingPercentThreshold` (number)
  - default: 30
  - range: 5..80 (предложение, можно уточнить)
  - описание: «Когда оставшееся контекстное окно падает до этого значения или ниже, Core автоматически запрашивает handoff-отчёт и начинает новую сессию.»

---

## 6) Rollout plan

1) Claude: real-time token usage (SDK stream events) + корректный limit (200k для стартового MVP, затем per-model).
2) UI: показывать remaining% вместо used%.
3) Settings: порог handoff в Claude settings.
4) (Позже) Codex/Gemini по аналогии, отдельными фазами.

# Codex Thread ID — Startup Lock на первый turn (гарантия «своего» thread_id)

**Date:** 2026-01-05
**Status:** Draft (needs approval)

---

## 1) Контекст
После внедрения **lock-on-first-turn** (см. `doc/Project_Docs/Codex_ThreadId_LockOnFirstTurn_Architecture.md`) мы перестали принимать перепривязки `thread_id` *после* первого bind.

Однако остаётся критическое окно гонки **на старте**:
- несколько Codex-сессий могут параллельно стартовать свой первый `thread.runStreamed(...)`;
- в этом окне до первого `thread.started` возможна ситуация, когда одна из сессий получает «чужой» `thread_id` (например, из-за конкуренции/состояния Codex CLI), и мы закрепляем его как “истину”.

**Вывод:** одних guardrails “lock-on-first-turn” недостаточно для 100% гарантии корректного первичного bind.

---

## 2) Цель
Дать детерминизм и гарантию, что **первый bind `thread_id`** для каждой Codex-сессии происходит без конкуренции с другими стартующими Codex-сессиями в рамках одного процесса CodeAI Hub.

Требования:
1. Глобальная сериализация **только** на окно «первый `thread.runStreamed` до получения первого `thread.started`».
2. Lock освобождается **сразу после bind `thread_id`** (не ждём `turn.completed`).
3. Гарантированный release при ошибке/таймауте (без дедлоков).
4. После bind — полная параллельность (никаких lock’ов на обычных turn).

---

## 3) Предлагаемое решение
### 3.1. Global startup lock (in-process mutex)
Добавить in-process mutex, общий для всего `@codeai-hub/codex-module`, который защищает **только** первую команду `thread.runStreamed(...)` для сессии, пока не получен первый `thread.started`.

**Где:** новый модуль `packages/Codex_Module/src/messaging/codex-startup-lock.ts`.

**API (контракт):**
- `acquire(owner: { sessionId: string }, options?: { timeoutMs?: number }): Promise<ReleaseFn>`
- `ReleaseFn(): void` — идемпотентный release.
- (опционально) `runExclusive(...)` как sugar.

**Семантика:**
- mutex глобальный на процесс (singleton), FIFO (или максимально честный порядок).
- по умолчанию включён **только** для сессий, у которых ещё нет `session.codexThreadId`.

### 3.2. Точка удержания и release
Lock держится:
- **с момента** фактического запуска первого `thread.runStreamed(...)` (перед вызовом),
- **до момента**, когда мы увидели первый `thread.started` и зафиксировали `session.codexThreadId`.

Release выполняется:
- сразу после обработки `thread.started` (первого) для этой сессии;
- либо при завершении/ошибке стрима до `thread.started`;
- либо по таймауту (с обязательным release + понятной ошибкой наружу).

### 3.3. Retry-политика
При отсутствии `thread.started` (CLI crash/exit, парсинг, обрыв стрима):
- lock гарантированно освобождается;
- следующий пользовательский message сможет повторить попытку старта (и снова возьмёт lock).

Опционально (если нужно): один автоматический retry “сразу” внутри одного user-turn (с backoff), но это увеличивает сложность и лучше оставить как последующий шаг.

---

## 4) Интеграция в текущую архитектуру
### 4.1. Message processor
В `packages/Codex_Module/src/messaging/message-processor.ts`:
- перед первым `thread.runStreamed(...)` для сессии (когда `session.codexThreadId` ещё не задан) — `await startupLock.acquire(...)`;
- при стриминге событий — при первом `thread.started`:
  - выполняется существующий bind (и lock-on-first-turn guardrails остаются как defense-in-depth),
  - выполняется `release()`.

### 4.2. SDK manager
В `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` (по TODO-плану):
- если текущая точка вызова `thread.runStreamed` находится вне message-processor, то lock должен оборачивать **реальный** запуск `runStreamed` (то есть максимально близко к месту, где стартует CLI и начинается чтение событий).

---

## 5) Параметры и таймауты
Рекомендуемые дефолты (под обсуждение):
- `STARTUP_LOCK_TIMEOUT_MS = 30_000` (30s): достаточно, чтобы получить `thread.started`, но коротко для UX.

Поведение на таймаут:
- release lock;
- завершить turn с ошибкой вида `Codex startup lock timeout: thread.started not received`.

---

## 6) Инварианты
1. В один момент времени только одна Codex-сессия может быть в окне «первый runStreamed до thread.started».
2. После первого bind `thread_id` сессия не блокируется никакими lock’ами.
3. Lock всегда освобождается (даже при исключениях/обрывах/таймаутах).
4. Существующий `lock-on-first-turn` продолжает защищать от перепривязок после bind.

---

## 7) Ограничения / Non-goals
- Mutex **не** решает конкуренцию между разными процессами CodeAI Hub (in-process only).
- Не вводим `CODEX_HOME per-session` и не добавляем JSONL-верификацию.

---

## 8) План внедрения (соответствует `doc/TODO/todo-plan.md`)
1. Зафиксировать этот документ (после апрува).
2. Реализовать `codex-startup-lock.ts` + интеграцию в message-processor / sdk-manager.
3. Прогнать гейты и таргетную сборку `npm run build --workspace @codeai-hub/codex-module`.

# Codex Thread ID — Lock-on-First-Turn (гарантия маршрутизации)

**Date:** 2026-01-04
**Status:** Draft (needs approval)

---

## 1) Проблема
В интеграции Codex (CLI/SDK) с CodeAI‑Hub наблюдался критический эффект: после начала сессии сообщения могли уходить в «чужой» thread.

Технически это возможно, когда:
- provider принимает `thread_id` из событий `thread.started` и **перепривязывает** активную сессию к новому ID;
- либо происходит коллизия временного `sessionId` на этапе до получения real `thread_id`.

Итог: Core обновляет `providerSessionId`, и дальнейшие сообщения маршрутизируются не туда.

## 2) Цель (101%)
1. Получить `thread_id` **только один раз** — на первом turn (`thread.started`) и считать его **единственным источником истины**.
2. После первого bind **никогда** не принимать новый `thread_id` и **всегда** продолжать разговор только в зафиксированном thread.
3. Убрать любые возможные коллизии временного ID (до первого bind), чтобы «чужой» thread не мог попасть в чужую сессию из‑за наших ключей.
4. Изолировать Codex state от внешних процессов пользователя (опционально, но рекомендуется как часть «101%»).

## 3) Решение

### A. Уникальный временный ID (до первого bind)
- Вместо `codex_${Date.now()}` генерируем `codex_${randomUUID()}`.
- Это исключает коллизии при параллельных/повторных `createSession()`.

### B. Lock thread_id на уровне Codex SDK patch
- В патче `Thread.runStreamedInternal` фиксируем правило:
  - если `this._id === null` и пришёл `thread.started` → присваиваем `this._id = thread_id`.
  - если `this._id !== null` → **игнорируем** любые последующие `thread.started` (даже если ID отличается).
- Тем самым `resume <thread_id>` всегда будет выполняться по первому полученному ID.

### C. Lock thread_id на уровне CodeAI‑Hub Codex module
- В `CodexMessageProcessor.handleThreadStarted()`:
  - если `session.codexThreadId` уже установлен и отличается от входящего `threadId` → **игнорируем** событие (логируем как anomaly), **не** делаем `updateSessionId()` и **не** эмитим `sessionIdChanged`.
  - если это первый bind → выполняем promotion `tempId → threadId` и эмитим `sessionIdChanged` ровно один раз.

### D. Изоляция CODEX_HOME (рекомендуется)
- По умолчанию Codex для CodeAI‑Hub использует отдельный home:
  - `~/.codeai-hub/providers/codex/home`
- При первом запуске автоматически мигрируем `auth.json` (и опционально `config.toml`) из legacy `~/.codex/`.
- Это снижает риск влияния внешних `codex` процессов (interactive CLI и др.) на состояние exec/resume.

## 4) Изменяемые файлы
- `packages/Codex_Module/src/session/session-lifecycle.ts` — временный ID: UUID.
- `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` — `thread_id` фиксируется один раз.
- `packages/Codex_Module/src/messaging/message-processor.ts` — promotion/`sessionIdChanged` только на первом bind.
- `packages/Codex_Module/src/auth/sdk-auth-manager.ts` — дефолтный CODEX_HOME под CodeAI‑Hub + миграция auth.

## 5) Инварианты после фикса
- После первого успешного `thread.started` все последующие сообщения используют **только** первый `thread_id`.
- Никакая сессия не может быть перепривязана к новому `thread_id` из‑за событий `thread.started`.
- Временные session IDs уникальны даже при параллельных create.


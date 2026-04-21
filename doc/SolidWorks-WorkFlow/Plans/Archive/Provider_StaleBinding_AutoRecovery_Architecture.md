# Provider Stale-Binding Auto-Recovery (Claude + Codex)

## Problem

После Core restart reopened workflow dialog имеет paper-binding (`providerSessionStatus: "ready"`) благодаря materializer'у из `1.2.39` (`BUG-2026-04-21-01`). Но первый user message тихо пропадает: `SessionRequestHandlerMessageDispatch.dispatchUserMessage` видит `ready` и идёт прямо в `adapter.sendMessage(...)`, минуя resume-шаг. Claude SDK Manager (in-memory Map сессий пустой после рестарта процесса) бросает plain `Error("Session <id> not found")`, а Codex app-server child process умирает вместе с Core — его thread registry также теряется. PM не получает `turn_state: "running"` (turn не стартовал), не получает `turn_failed` (classifier пометил `retryable: true` в ожидании auto-retry), input panel не блокируется, сообщение не записывается в JSONL.

Voucher scenario: workspace `CodeAI-Hub claude`, stage `diagram_modules`, release `1.2.41`, 2026-04-21 14:27 CEST. User acceptance regression.

## Root Cause

Flag `providerSessionStatus: "ready"` в 1.2.39 означал две разные вещи:
- для `materializeContinuityEntries` — "связка записана в journaled state ядра, paper-binding готов";
- для `dispatchUserMessage` — "provider hydrated, можно сразу слать".

Materializer сознательно не вызывает `adapter.resumeSession` (чтобы не грузить cold-start всех reopened dialog'ов), оставляя hydration ленивой — на первом user message. Но dispatch path не умеет различать "journaled-only" и "fully hydrated" состояния binding'а: оба помечены одинаковым `ready`. Resume-шаг пропускается, и запрос идёт в adapter с "мёртвым" с точки зрения provider-модуля `providerSessionId`.

Gemini этот класс багов закрыл в `1.2.8` через `GeminiSessionStaleBindingError` + one-shot auto-rebind retry в `MessageDispatch.dispatchUserMessage`. Claude и Codex не имеют такого detector'а: их adapter'ы бросают generic `Error`, classifier помечает `session_binding_recoverable / retryable: true`, но автоматического retry для generic errors на этом пути нет, и сообщение молча поглощается.

## Solution — одинаковый паттерн для обоих providers

Копия Gemini precedent'а, точечно:

### Phase 1 — Claude

1. Новый файл `packages/Claude_Module/src/provider/claude-session-stale-binding-error.ts`: класс `ClaudeSessionStaleBindingError extends Error` с полями `code: "CLAUDE_SESSION_STALE_BINDING"` и `providerSessionId: string`. Pattern-matcher `extractStaleProviderSessionId` на строку `Session <uuid> not found`.
2. `packages/Claude_Module/src/sdk/claude-sdk-manager.ts` — в `sendMessage` (строка ~157, where `sessions.getSession(sessionId)` возвращает undefined) заменить `throw new Error(...)` на `throw new ClaudeSessionStaleBindingError(sessionId)`. Все остальные пути SDK Manager не трогаем.
3. `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — расширить existing detector (`extractStaleProviderSessionId` + retry-ветка line ~187-248): принимать `code: "CLAUDE_SESSION_STALE_BINDING"` дополнительно к `GEMINI_SESSION_STALE_BINDING`. Retry-ветка вызывает `invalidateProviderBinding(sessionId)` + `ensureSessionReadyForSend(session)`, после чего send повторяется one-shot.

### Phase 2 — Codex

Codex app-server — long-lived child process, но он умирает вместе с Core на `Shutdown request`. После рестарта внутренний `facade.sessions` Map пустой, `thread/send` на старый `providerSessionId` (=thread id) проваливается. Точный error shape известен из app-server JSON-RPC протокола и требует мини-проверки в коде на момент реализации.

1. Новый файл `packages/Codex_AppServer_Module/src/provider/codex-session-stale-binding-error.ts`: класс `CodexSessionStaleBindingError extends Error` с `code: "CODEX_SESSION_STALE_BINDING"` и `providerSessionId: string`.
2. `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` (и/или `codex-app-server-facade.ts`) — где adapter получает от app-server "thread not found"-равный error от JSON-RPC, распознать и завернуть в `CodexSessionStaleBindingError` с правильным `providerSessionId`.
3. `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — добавить `CODEX_SESSION_STALE_BINDING` в existing detector. Retry-ветка та же.

### Regression coverage

По одному test-файлу на каждый provider в соответствующем модуле: stale-binding error shape (`code`, `providerSessionId`) + integration-style тест на dispatch retry-ветку, симметричный существующему Gemini test.

## Out of Scope

- Gemini — уже покрыт `1.2.8`, не трогаем.
- Eager resume в materializer — отклонён на этапе обсуждения: стоимость cold-start'а N×M reopened dialog'ов выше, чем one-shot retry при первом сообщении.
- Capability flag в `provider-descriptor-factory.ts` — не нужен. Detector работает через `.code` property, симметрично Gemini. Новый флаг добавил бы complexity без пользы.
- `providerSessionStatus: "ready"` semantics не меняем — materializer продолжает маркировать paper-binding как ready; dispatch доверяет флажку, но теперь корректно catch'ит stale-binding ошибку как one-shot recoverable.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `Plans/Archive/`. `SystemArchitecture.md` §3 Invariant 1 (snapshot-first lock contract с 1.2.39) и Invariant 10 (provider failure classification before teardown) расширить короткой строкой про stale-binding auto-recovery для всех трёх providers. `BugRegistry.md` — новая запись `BUG-2026-04-21-04` с forensics, root cause, fix, commits, guards. Release — `1.2.42` hotfix.

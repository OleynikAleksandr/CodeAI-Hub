# Codex PATH Fallback + Post-Rebind Usage Limits Refresh

## Problem 1 — Codex app-server spawn fails with ENOENT

На user acceptance релиза `1.2.42` Codex начал отвечать PM ошибкой `Provider codexCli unavailable`. `~/.codeai-hub/logs/codex/sdk-codex-app-server-*.jsonl` показывает `{"type":"spawn_error","payload":{"message":"spawn codex ENOENT"}}` при каждой попытке recovery scheduler'ом перезапустить app-server child process. В `core.log` — `Provider initialization failed` с `write EPIPE` в stack'е, потому что init handshake уходит в закрытый stdin мёртвого child'а. Первый spawn при старте Core (13:37:18) проходил успешно; после штатного `closeSession` при `sessions.size === 0` `process.stop` убил child'а; последующие re-spawn'ы из recovery-loop не могут найти бинарник.

**Root cause:** `CodexAppServerProcess.startInternal` делает `spawn("codex", ["app-server"], { env: { ...process.env, CODEX_HOME: ... } })`. Node lookup по имени binary полагается только на `process.env.PATH`. У VS Code extension host (и Core child'а) PATH не всегда содержит пользовательские npm-global / Homebrew директории (у пользователя `codex` живёт в `/Users/oleksandroliinyk/.npm-global/bin/codex`, `which codex` в shell находит, в spawn'е Core — нет). Это не регрессия 1.2.42 сама по себе, но stale-binding retry из 1.2.42 **зависит от того, что `adapter.resumeSession` может поднять app-server** — если binary не найден, retry нечего восстанавливать, и провайдер навсегда `unavailable` до ручного VS Code restart с правильным PATH.

## Problem 2 — usage_limits индикатор пустой после Core restart у Claude и Codex

Тот же user acceptance: usage_limits виджет в PM показывается пустым для Claude и Codex после установки `1.2.42`, Gemini работает. Core logs показывают `Usage limits refresh request received` + `Usage limits refresh dispatched to adapter` с `lifecycleTrigger: "binding_ready"`, но затем никаких признаков broadcast в UI.

**Root cause:** `binding_ready` refresh триггерится на paper-binding, восстановленном materializer'ом из `1.2.39`, — ДО того, как `adapter.resumeSession` провёл реальный handshake. Для Claude и Codex refresh path частично зависит от hydrated session:
- Claude: `ClaudeProviderAdapter.refreshUsageLimits` → `usageLimitsFacade.readStreamPayload({force:true})` → `ClaudeLiveHeadersReader` HTTP probe. Probe сам по себе не требует SDK session, но Gemini precedent показал, что без fallback'а на cached payload первый refresh на свежем процессе часто возвращает `null` (race cold start / retry policy).
- Codex: `CodexProviderAdapter.refreshUsageLimits` → `facade.refreshUsageLimits` → `process.request("account/rateLimits/read")`. После handshake guard (`handshakedThreadIds` из `1.2.42`) rateLimits-запрос не блокируется, но если app-server умер (Problem 1) — refresh без retry падает тихо.

После stale-binding retry из `1.2.42` adapter.resumeSession выполняет реальный handshake (Claude `createResumedSession`; Codex `thread/resume`), но **второго usage_limits refresh после rebind нет** — PM больше не посылает `binding_ready` trigger для того же binding'а, а Core dispatch retry-ветка не вызывает refresh самостоятельно.

Gemini не ломается потому что его initialization path (`gemini-session-manager.startManagedSession`) делает proactive refresh напрямую, независимо от Core trigger'а.

## Solution

### Phase 1 — Codex PATH augmentation

Минимальный fix в `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`:

1. Константа `CODEX_PATH_CANDIDATES` с типичными user install locations: `~/.npm-global/bin`, `/usr/local/bin`, `/opt/homebrew/bin`, `/usr/bin` (для Linux CI). Порядок приоритета — `process.env.PATH` первым, затем candidates для fallback.
2. В `startInternal()` перед `spawn` собрать `augmentedPath = [process.env.PATH, ...CODEX_PATH_CANDIDATES].filter(Boolean).filter(unique).join(path.delimiter)` и передать его в `env.PATH`.
3. `CODEX_EXECUTABLE` остаётся именем (`"codex"` / `"codex.cmd"`), ищем всё ещё через PATH lookup — просто PATH расширен. Не вводим absolute-path зашитый по системе.
4. Для Windows: добавить `%APPDATA%\npm` в candidates.

Без новых capability-флагов, без изменений `CodexAppServerFacade` или `CodexProviderAdapter`.

### Phase 2 — Post-rebind usage limits refresh

Минимальный fix в `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`:

1. В retry-ветке `retryAfterStaleBinding` (существующий path, расширенный в 1.2.42 до Claude/Codex) после успешного `ensureSessionReadyForSend` и перед retry `providerSend.dispatch` — триггерить `adapter.refreshUsageLimits` через новый helper (или existing callback если уже есть в deps).
2. Broadcast callback тот же, что используется при regular refresh — собирает `session:stream` event с `usage_limits` payload и кладёт в `this.deps.broadcaster`.
3. Helper принимает `Session`, `providerSessionId`, `adapter`, `broadcaster` — извлечь в отдельную функцию `triggerPostRebindUsageLimitsRefresh` для переиспользования и тестируемости.
4. Не трогаем `session-request-handler.ts` initial refresh path (`handleRefreshUsageLimits`) — там существующее поведение с lifecycle trigger логикой остаётся как есть.

Регрессионный coverage: unit-тест на `session-request-handler-message-dispatch.ts` что после stale-binding retry с успешным rebind вызов `adapter.refreshUsageLimits` происходит ровно один раз.

## Out of Scope

- Refactor `handleRefreshUsageLimits` в session-request-handler.ts — существующий lifecycle_trigger path остаётся рабочим для non-stale-binding случаев.
- Gemini — не трогаем, precedent работает.
- Eager resume всех reopened dialog'ов в materializer — отклонён ещё в 1.2.42 planning-doc как слишком дорогой cold-start.
- Absolute path к `codex` binary — PATH augmentation достаточно, не нужно hardcode'ить install location в бинарь Core.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `Plans/Archive/`. `SystemArchitecture.md` §3 Invariant 1 дополнить строкой про post-rebind usage_limits refresh (обязательный trigger после `ensureSessionReadyForSend` в stale-binding retry-ветке). `BugRegistry.md` — новая запись `BUG-2026-04-21-05` с двумя симптомами и fix-описанием. Release — `1.2.43` hotfix.

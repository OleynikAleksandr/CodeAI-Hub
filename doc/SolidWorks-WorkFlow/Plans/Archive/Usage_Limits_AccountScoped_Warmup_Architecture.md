# Usage Limits — Account-Scoped Cache + Single-Probe Warmup

## Problem

User acceptance на релизе `1.2.43`: passive path у всех трёх провайдеров работает — после первого turn'а widget заполняется корректным форматом `Session 23% (Resets Apr 21 at 11pm) / Weekly 43% (Resets Apr 23 at 11pm)`. Но до первого turn'а в живом Core процессе (сразу после Core restart, после открытия любого reopened dialog) widget у Claude и Codex показывает `Session 0% / Weekly 0%`. Gemini не страдает, потому что его путь делает proactive refresh в `startManagedSession`.

Риск: пользователь открывает reopened dialog, видит `0%`, отправляет сообщение, а на API — уже исчерпан лимит. API возвращает `rate_limit_error`, turn не стартует, prompt теряется.

Формат widget'а при наличии данных — не меняем: `Session N% (Resets ...)` / `Weekly M% (Resets ...)` — тот самый, что рендерит Gemini и Claude/Codex после первого turn'а.

## Root Cause

1. **Cache key привязан к `providerSessionId`, а не к провайдеру.** `ProviderUsageLimitsFacade.buildProviderUsageLimitScopeKey({providerId, providerSessionId})` — каждая session имеет отдельный scope. Rate limits у всех трёх провайдеров account-wide (один Claude Pro, один Codex Pro Lite, один Google GTX), а мы держим их как session-scoped. При переключении между dialog'ами / открытии нового dialog'а каждый раз холодный кэш, даже если для другой session того же провайдера уже был свежий payload.

2. **`binding_ready` refresh гоняется против hydration.** `SessionRequestHandler.handleRefreshUsageLimits` вызывается каждый раз на `binding_ready`. После `1.2.39` materializer paper-binding с `providerSessionStatus: "ready"` попадает в dispatch **до** реальной hydration (Claude SDK session не в Map, Codex app-server thread не handshaked). `adapter.refreshUsageLimits` возвращает null, broadcast не происходит, widget нормализует null в `0%` fallback.

3. **Нет warmup на провайдерном уровне.** Нет единственной точки "при первом появлении в Core процессе — наполни кэш одним probe". Поэтому widget остаётся пустым до тех пор, пока какой-нибудь turn не завершится успешно.

## Solution

### Phase 1 — Account-scoped usage limits cache

`packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts` + `packages/core/src/provider-usage-limits/provider-usage-limits-scope-key.ts` (или где сейчас `buildProviderUsageLimitScopeKey`): изменить ключ на `providerScopeKey = providerId` (без `providerSessionId`). Один HTTP probe у Claude или один push у Codex наполняет кэш для всего провайдера; все dialog'и / workspaces видят ту же цифру без лишних запросов.

`provider-usage-limits-bridge-factory.ts` тоже использует scopeKey — обновить helpers `getCachedCorePayload` / `readRuntimePayload`, чтобы они принимали `providerSessionId: string | null` только как optional breadcrumb, но не включали его в ключ.

### Phase 2 — Codex passive-only (убираем активные RPC)

Codex app-server `account/rateLimits/updated` push notification уже содержит полный payload (`primary.usedPercent`, `secondary.usedPercent`, `resetsAt`, `planType`). 7-8 push'ей за один turn — данных достаточно.

- `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` — `registerUsageLimitsSnapshot` уже срабатывает на push; достаточно убедиться, что cache-emission идёт в account-scope (Phase 1 это обеспечит).
- `CodexProviderAdapter.refreshUsageLimits` остаётся — но будет вызываться только как warmup (Phase 3), не на `binding_ready`.
- `CodexAppServerFacade.refreshUsageLimits` делает один `account/rateLimits/read` RPC — оставляем как path для warmup. На живом процессе после первого push'а этот RPC не нужен (кэш наполнен).

### Phase 3 — Provider-level warmup + удаление `binding_ready` шума

`packages/core/src/remote-bridge/handlers/session-request-handler.ts` — `handleRefreshUsageLimits`:
- если кэш уже заполнен (есть `getCachedStreamPayload`), replay из кэша — оставить как сейчас.
- если кэш пуст (cold cache), dispatch в adapter **один раз per provider per Core process**. Tracking через Set<providerId> inside `SessionRequestHandler` — после первого successful refresh провайдер помечен "warmed".
- subsequent `binding_ready` запросы для того же провайдера — игнорировать (log `"Usage limits refresh skipped: provider warmed"`). Никакого разнополого refresh на каждое открытие dialog'а.

Post-rebind refresh trigger из `1.2.43` (`triggerPostRebindUsageLimitsRefresh`) — не трогаем, он по-прежнему полезен в stale-binding ретрае (`rebind_recovery` trigger).

### Phase 4 — UI empty-cache fallback

`src/client/project-manager/components/sessions/session-id-bar.tsx` (или где сейчас рендерится widget): когда нормализованный `usageLimits` равен null / undefined / empty `{}` — показывать `—` (em-dash) вместо `0%`. Staleness indicator опционально (tooltip с last-updated time), но minimum — не врать `0%` при отсутствии данных.

### Phase 5 — SSOT + BugRegistry

`SystemArchitecture.md` §3 Invariant 1 — дописать account-scoped cache requirement + single-provider warmup policy. `BugRegistry.md` — запись `BUG-2026-04-21-06`.

## Out of Scope

- **Rate-limit error handler** на dispatch'е — полезный next step, но не в этом scope (требует изменения UI контракта для error display и восстановления input'а). Оставляем на отдельный cycle.
- **Persistence на диск** — не внедряем (обсудили с пользователем: cache только in-memory, account-level).
- **Gemini** — работает, не трогаем.
- **Staleness indicator в UI** — опциональный nice-to-have, не обязателен для этого cycle.

## Canonical Document Landing

После закрытия цикла planning-doc архивируется в `Plans/Archive/`. `SystemArchitecture.md` §3 Invariant 1 расширен. `BugRegistry.md` содержит запись `BUG-2026-04-21-06`. Release — `1.2.44`.

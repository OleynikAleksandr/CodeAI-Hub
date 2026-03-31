# Session 075 — Universal provider usage limits execution bootstrap

**Date:** 2026-03-15 09:33 (CET)
**Branch:** main
**Version:** 1.1.727

---

# 1. Work Done in This Session

## Work summary
- Проверен и уточнён planning-док `UniversalProviderUsageLimits_Module_Architecture.md` под утверждённый общий принцип: единый shared module, единый pipeline, live-source как primary, rollout/log только fallback.
- `doc/TODO/todo-plan.md` развёрнут из заглушки в execution-plan с фазами `shared core -> Claude -> Codex -> Gemini -> scope-key/UI hardening -> diagnostics/UI labels`.
- В конец `doc/TODO/todo-plan.md` добавлен отдельный Stream под локальную release-сборку по правилам `build-all.sh` + `build-release.sh --use-current-version`.
- Реализован первый shared contract слой `Phase 1 / Stream: Core facade boundary` в `packages/core/src/provider-usage-limits/`: canonical types, `providerScopeKey`, compat adapter.
- Реализован второй и третий слои `Phase 1 / Stream: Core facade boundary`: shared cache, change detector, facade skeleton, stream payload helper и canonical emission contract.
- Для `Claude` вынесен provider-specific shared слой в `packages/core/src/provider-usage-limits/providers/claude/`: live probe reader, shared normalizer и facade под единый contract.
- На boundary `core -> Claude adapter` протянут structural bridge для usage limits facade без циклической зависимости `Claude_Module -> core`.
- `Claude` message processor переведён на injected shared facade: локальные usage-limits cache/in-flight maps убраны, stream-event и turn-complete теперь питаются из shared module.
- В локально установленном `@anthropic-ai/claude-agent-sdk` найден и интегрирован `SDKRateLimitEvent`: теперь Claude usage limits предпочитают runtime event path, а synthetic probe остаётся fallback.
- Для `Codex` начат `Phase 3`: rollout JSONL path вынесен в `packages/core/src/provider-usage-limits/providers/codex/` как shared fallback strategy (`reader -> normalizer -> facade`), без переключения `Codex_Module` на shared facade на этом шаге.
- Для `Codex` добавлен shared runtime-first reader `codex_rpc`: shared facade теперь умеет предпочитать структурированный runtime payload (`codex_rpc`) и откатываться на rollout fallback, хотя wiring из `Codex_Module` ещё не подключён.
- `Codex_Module` переведён на shared usage-limits facade boundary: добавлены facade bridge types, injection в provider adapter и runtime payload bridge из raw Codex stream events (`token_count -> rate_limits`) в shared `codex_rpc` path.
- В `core/provider-registry` подключён `CodexUsageLimitsFacade` bridge, поэтому `Codex` теперь реально идёт через общий shared pipeline `reader -> normalizer -> shared snapshot -> compat stream payload`; старый rollout reader остаётся только compat fallback, если facade не инжектирован.
- Для `Codex` подтверждён официальный structured secondary source: `codex app-server --listen stdio://` отвечает на JSON-RPC `account/rateLimits/read` и возвращает `RateLimitSnapshot`; на его основе `codex_rpc` reader теперь делает short-lived `app-server` read, если runtime payload отсутствует.
- PTY `/status` больше не нужен как обязательный этап для первой delivery-версии `Codex` limits: strategy chain закрыт как `runtime payload -> app-server rateLimits/read -> rollout JSONL fallback`.
- Для `Gemini` подтверждён structured live-source без TUI parsing: локальный `Gemini CLI` config умеет `refreshUserQuota()`, а quota API возвращает `buckets` с `modelId`, `tokenType`, `remainingFraction` и `resetTime`.
- Реализован `Phase 4 / item 1`: в `packages/core/src/provider-usage-limits/providers/gemini/` добавлены `gemini-quota-api-reader.ts`, `gemini-usage-limits-normalizer.ts` и `gemini-usage-limits-facade.ts`.
- `Gemini` shared normalizer теперь строит provider-native snapshot из quota buckets и временно выбирает до трёх compat-окон (`primary/secondary/tertiary`) по active-model-aware приоритету без возврата к text/TUI parsing.
- Реализован `Phase 4 / item 3`: `GeminiProviderAdapter` теперь после `turn_completed` делает `force`-refresh через injected shared facade bridge и эмитит `stream_event` с `kind: "usage_limits"` в тот же session pipeline, что и Claude/Codex.
- В `core/provider-registry` добавлен `GeminiUsageLimitsFacade` bridge, а `Gemini_Module` получил типизированный usage-limits contract без прямой зависимости на `core`.
- Для `Gemini` формально de-scoped `Phase 4 / item 5`: локальный `statsCommand` в установленном `@google/gemini-cli` использует тот же quota API surface (`refreshUserQuota()`), поэтому независимый secondary fallback source для первой версии не найден.
- Реализован весь `Phase 5`: `providerScopeKey` теперь является каноническим usage-limits cache key и протянут в session status contract, shared stream payload и UI cache/fan-out.
- Initial snapshot, `Session ID bar` и binding rehydration теперь читают usage limits по `providerScopeKey` с compat fallback на legacy `providerSummary`, без возврата к display-label keying.
- После финального `build:webview` обновлён tracked bundle `media/react-chat.js`, чтобы webview-артефакт соответствовал новой scope-key логике.
- Реализован `Phase 6 / item 1`: shared usage-limits facade теперь возвращает source-aware diagnostics (`cache_hit`, `fresh_read`, `fallback_cached`, `unavailable`), stream payload прокидывает diagnostics в `data`, а `Codex` integration пишет facade/runtime result logs с `source`, `providerScopeKey` и diagnostics payload.
- Реализован `Phase 6 / item 3`: shared stream payload теперь несёт compat `usageLimitLabels`, UI/project-manager sync сохраняют их в session status и local cache, а `Session ID bar` показывает provider-aware labels вместо hardcoded `session/weekly`, сохраняя fallback для старых snapshots.
- Для соблюдения 300-line rule label parsing/comparison вынесены в `src/client/ui/src/session/usage-limit-labels.ts`; `app-host` и `project-manager` usage-limits sync остались под архитектурным лимитом.
- Запущен `Phase 7 / item 1`: release-facing docs (`README.md`, `CHANGELOG.md`, `Session075.md`) переведены на upcoming локальный релиз `1.1.727`, чтобы следующий шаг `build-all.sh` выполнялся уже из согласованного release baseline.
- Выполнен весь `Phase 7`: `./scripts/build-all.sh` поднял unified/workspace version до `1.1.727`, пересобрал provider/core/ui/launcher артефакты и обновил manifest pointers для локального release cache.
- Выполнен `./scripts/build-release.sh --use-current-version`; подтверждены `Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, собран VSIX `codeai-hub-1.1.727.vsix`.
- Финальный release-набор лежит в `doc/tmp/releases/`: `claude-module-1.1.727.tar.bz2`, `codex-module-1.1.727.tar.bz2`, `gemini-module-1.1.727.tar.bz2`, `codeai-hub-core-darwin-arm64-1.1.727.tar.bz2`, `CodeAIHubLauncher-macos-arm64-1.1.727.tar.bz2`, `vscode-webview-1.1.727.tar.bz2`, `project-manager-1.1.727.tar.bz2`.
- Во время post-release проверки `v1.1.727` подтверждено, что у `Codex` `token_usage` приходит сразу после первого turn-а, а отсутствие usage limits в PM/session UI вызвано не reader-ом, а transport-gap в websocket replay path.
- Реализован hotfix `Phase 8`: `WebSocketManager` теперь кеширует canonical `usage_limits` stream-events по `sessionId` и реплеит их после websocket connect и после смены workspace scope, как это уже делалось для `token_usage`.
- Для transport replay добавлен regression-test на реальный websocket lifecycle: out-of-scope `usage_limits` event не доставляется live, но корректно реплеится после scope switch и сохраняет `providerScopeKey`.

## Git commits
- `a930f36d feat(core): add provider usage limits shared contract`
- `59ca3a7a feat(core): add provider usage limits facade skeleton`
- `ca24d723 feat(core): add provider usage limits stream contract`
- `532c5ec7 feat(core): add claude usage limits shared facade`
- `5abbac4a feat(core): inject claude usage limits facade boundary`
- `fc29738d refactor(claude): route usage limits through shared facade`
- `74cd1551 feat(claude): prefer sdk rate limit events`
- `31182e9b feat(core): add codex rollout usage limits fallback`
- `206da7e1 feat(core): add codex runtime usage limits reader`
- `63930691 refactor(codex): add shared usage limits facade bridge`
- `bce0b865 feat(core): inject codex usage limits facade bridge`
- `f38b96db feat(core): add codex app-server rate limits fallback`
- `f4bfce78 feat(core): add gemini usage limits facade`
- `5f0e6dd0 feat(gemini): emit usage limits through shared contract`
- `e1ad78e5 feat(core): propagate provider scope key for usage limits`
- `8496d9e5 refactor(ui): use provider scope key for usage limits cache`
- `7223fdab refactor(ui): resolve usage limits by scope key`
- `4eb23982 build(ui): refresh webview bundle`
- `1a54eb29 docs(session): sync phase5 usage limits progress`
- `3afef37b feat(core): add usage limits diagnostics`
- `1d0d3a74 feat(ui): generalize provider usage limit labels`
- `d2a7b353 docs(session): sync phase6 usage limits progress`
- `7e56ac1d docs(release): prep universal usage limits release`
- `0b251c95 chore(release): build universal usage limits release`
- `33a2221a docs(session): record universal usage limits release build`
- `c9feab28 fix(core): replay usage limits after scope sync`

## Verification
- Выполнена вычитка planning-дока после правок.
- Выполнена вычитка нового `doc/TODO/todo-plan.md` после разворачивания фаз и release-stream.
- Перед стартом реализации проверены структура `packages/core`, паттерны существующих фасадов и границы зависимостей.
- Выполнена таргетная сборка `npm run build --workspace @codeai-hub/core` после добавления shared contract слоя.
- Выполнен ручной `npx ultracite fix` на новых файлах `provider-usage-limits/*` для стабилизации pre-commit formatting.
- Выполнены таргетные сборки `npm run build --workspace @codeai-hub/claude-module` и `npm run build --workspace @codeai-hub/core` после протяжки shared Claude facade через provider boundary.
- Повторно выполнены таргетные сборки `npm run build --workspace @codeai-hub/claude-module` и `npm run build --workspace @codeai-hub/core` после перевода `Claude` message processor на injected shared facade.
- Выполнен локальный поиск по `@anthropic-ai/claude-agent-sdk/sdk.d.ts`; подтверждено наличие `SDKRateLimitEvent` и `SDKRateLimitInfo` как runtime live-source кандидата.
- Выполнены таргетные сборки `npm run build --workspace @codeai-hub/claude-module` и `npm run build --workspace @codeai-hub/core` после переключения Claude usage limits на runtime event-preferred path.
- Выполнен просмотр реальных `Codex` rollout JSONL в `~/.codeai-hub/providers/codex/home/sessions/`; подтверждено, что `token_count` присутствует, но `rate_limits` может отсутствовать (`null`), поэтому shared fallback обязан быть non-destructive к кэшу.
- Выполнены `npx ultracite fix` и таргетная сборка `npm run build --workspace @codeai-hub/core` после добавления shared `Codex` rollout fallback слоя.
- Выполнен runtime-spike через `codex exec --experimental-json`; подтверждено, что stdout event stream не отдаёт `token_count/rate_limits`, то есть live-source не лежит в публичном SDK stdout-потоке.
- В `packages/Codex_Module/src/sdk/codex-sdk-patches.ts` подтверждено, что модуль использует raw JSON output `codex exec --experimental-json`, а не только типизированные `ThreadEvent`, что оставляет путь для будущего runtime payload bridge.
- В локальном `~/.codex/sessions/2026/03/14/rollout-2026-03-14T17-45-09-019ced3c-c63e-7a71-aec5-efdad038f50f.jsonl` найден реальный `token_count.rate_limits` payload (`primary/secondary`, `plan_type: team`) на `Codex Desktop 0.115.0-alpha.11`; это подтвердило canonical runtime payload shape для shared `codex_rpc` reader.
- Выполнены `npx ultracite fix` и таргетная сборка `npm run build --workspace @codeai-hub/core` после добавления shared `Codex` runtime reader и strategy order `runtime -> rollout fallback`.
- Выполнены `npm run build --workspace @codeai-hub/codex-module`, `npx ultracite fix` и повторная таргетная сборка `npm run build --workspace @codeai-hub/codex-module` после перевода `Codex_Module` на shared facade/runtime payload path.
- Выполнена таргетная сборка `npm run build --workspace @codeai-hub/core` после injection `CodexUsageLimitsFacade` bridge в `provider-registry`.
- Оба commit hooks (`refactor(codex): add shared usage limits facade bridge`, `feat(core): inject codex usage limits facade bridge`) прошли без обхода Husky; остались только стандартные repo-wide warnings по warning-zone files и ts-prune noise.
- Выполнен живой probe `codex app-server --listen stdio://`: подтверждено, что после `initialize` и `initialized` запрос `account/rateLimits/read` возвращает structured `rateLimits` / `rateLimitsByLimitId.codex` с `primary`, `secondary`, `planType` и epoch `resetsAt`.
- Выполнены `npx ultracite fix` и таргетная сборка `npm run build --workspace @codeai-hub/core` после расширения `codex-rpc-usage-limits-reader.ts` на `app-server` fallback.
- Выполнена ручная smoke-проверка через `node` against `packages/core/dist/.../codex-rpc-usage-limits-reader.js`; reader успешно вернул live snapshot с `source: codex_rpc`, окнами `primary/secondary` и ISO-normalized `resetsAt`.
- Выполнен живой validation-spike через локальный `@google/gemini-cli` / `@google/gemini-cli-core`: подтверждено, что `loadCliConfig -> refreshAuth -> initialize -> refreshUserQuota` возвращает structured quota `buckets` для Gemini account surface.
- Выполнены `npx ultracite fix` и таргетная сборка `npm run build --workspace @codeai-hub/core` после добавления shared `Gemini` quota API reader/facade.
- Выполнена ручная smoke-проверка через `node` against `packages/core/dist/.../gemini-quota-api-reader.js`; reader успешно вернул live snapshot с `source: gemini_quota_api`, provider-native labels и daily quota windows.
- Выполнены `npx ultracite fix`, `npm run build --workspace @codeai-hub/gemini-module` и `npm run build --workspace @codeai-hub/core` после подключения Gemini usage-limits bridge в provider/session pipeline.
- Первый end-to-end smoke `GeminiProviderAdapter` на `gemini-2.5-flash` упёрся в внешний `429 MODEL_CAPACITY_EXHAUSTED`, то есть упал до завершения turn и не мог подтвердить emission path.
- Повторный live smoke на `gemini-3-flash-preview` прошёл: после `turn_completed` реально пришёл `stream_event` с `data.kind = "usage_limits"` и `source: gemini_quota_api`.
- Выполнен локальный просмотр установленного `@google/gemini-cli`: `statsCommand` использует тот же `refreshUserQuota()` path, поэтому отдельный независимый fallback source для `Gemini` не подтверждён.
- Выполнена таргетная сборка `npm run build --workspace @codeai-hub/core` после введения `providerScopeKey` в shared session status/stream contract.
- Выполнены `npx ultracite fix` и `npm run typecheck:webview` после перевода UI local cache и stream fan-out на `providerScopeKey`; для соблюдения 300-line rule usage-limits sync app-host был вынесен в отдельный helper.
- Выполнены `npx ultracite fix`, `npm run typecheck:webview` и `npm run build:webview` после перевода initial snapshot, binding rehydration и `Session ID bar` на новый scope key.
- Выполнены `npx ultracite fix`, `npm run build --workspace @codeai-hub/core` и `npm run build --workspace @codeai-hub/codex-module` после добавления diagnostics path в shared facade, stream payload и `Codex` message processor.
- Выполнены `npx ultracite fix`, `npm run build --workspace @codeai-hub/core`, `npm run typecheck:webview` и `npm run build:webview` после протяжки provider-aware `usageLimitLabels` в shared payload, session status, local cache и `Session ID bar`.
- Отдельно подтверждено, что `src/client/ui/src/app-host/session-stream-usage-limits-sync.ts` и `src/client/project-manager/components/sessions/usage-limits-stream.ts` возвращены под лимит `<= 300` строк через helper extraction в `src/client/ui/src/session/usage-limit-labels.ts`.
- Выполнен `./scripts/build-all.sh`: version bump до `1.1.727`, пересборка `Claude/Codex/Gemini`, `core`, `vscode-webview`, `project-manager`, CEF launcher и синхронизация release tarball-ов в `~/.codeai-hub/releases/` и `doc/tmp/releases/`.
- Выполнен `./scripts/build-release.sh --use-current-version`; build output явно показал `Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`, после чего появился `codeai-hub-1.1.727.vsix`.
- Во время `build-release` advisory duplication check показал `3.12%` вместо порога `3%`, но сам release script отработал до конца и успешно собрал VSIX; критического падения релизного pipeline не произошло.
- Выполнен `npx ultracite fix packages/core/src/remote-bridge/handlers/websocket-manager.ts packages/core/src/remote-bridge/handlers/websocket-manager.test.ts` после добавления replay path для `usage_limits`.
- Выполнена таргетная сборка `npm run build --workspace @codeai-hub/core` после transport hotfix в `WebSocketManager`.
- Выполнен regression-test `node --test packages/core/dist/remote-bridge/handlers/websocket-manager.test.js`; подтверждено, что `usage_limits` реплеятся после смены workspace scope и не теряют `providerScopeKey`.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md`
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/SolidWorks-WorkFlow/Plans/UniversalProviderUsageLimits_Module_Architecture.md`
6. `doc/TODO/todo-plan.md`
7. `doc/Sessions/Session075.md` (THIS REPORT)

> Далее: `Phase 1`–`Phase 7` закрыты. Дополнительно закрыт `Phase 8` post-release hotfix: websocket replay path для `usage_limits` теперь симметричен `token_usage`, что закрывает подтверждённую проблему `Codex` limits в PM/session UI для релиза `v1.1.727`.
> Следующий рабочий шаг — новый scope после архивирования завершённого `todo-plan.md`; отдельным follow-up остаётся только `Claude`-специфичный симптом, где context/token usage materialize после reopen workspace, а не сразу live-потоком.

## Plans for next session
- Следующий implementation-step — не продолжение текущего плана, а новый planning-док в `doc/SolidWorks-WorkFlow/Plans/` под следующий утверждённый scope.
- Перед новой реализацией архивировать этот завершённый `doc/TODO/todo-plan.md` по правилам процесса и создать новый execution-plan только после утверждения нового planning-документа.
- Если после hotfix `c9feab28` `Codex` limits всё ещё не отображаются в PM/session UI, трассировать уже не reader и не websocket replay, а downstream sync путь `session:stream -> session status snapshot -> Session ID bar`.
- Отдельно разобрать `Claude`-симптом: почему `token_usage` / context-window counters materialize только после reopen workspace, хотя `Codex` их показывает сразу после первого turn-а.
- `Gemini` CLI/status fallback не возвращать в scope без нового независимого machine-readable source или подтверждённого operational gap в quota API path.
- PTY `/status` для `Codex` по-прежнему держать только как optional diagnostic path на случай регрессии `app-server`, а не как обязательную часть базовой архитектуры.

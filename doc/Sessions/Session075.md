# Session 075 — Universal provider usage limits execution bootstrap

**Date:** 2026-03-14 18:30 (CET)
**Branch:** main
**Version:** 1.1.726

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

> Далее: `Phase 1` закрыт. `Phase 2` закрыт.
> Текущий статус: в `Phase 3` закрыты rollout fallback, runtime reader и shared facade wiring (`31182e9b`, `206da7e1`, `63930691`, `bce0b865`).
> Следующий рабочий шаг — закрыть `Phase 3 / item 5`: добавить `Codex /status` fallback reader только после подтверждения стабильного формата `Session Stats`; если формат не удаётся подтвердить, нужно явно решить, оставляем ли `runtime + rollout fallback` как достаточный strategy chain для первой версии.

## Plans for next session
- Закрыть `Phase 3` через безопасный `Codex /status` fallback reader или официально переопределить scope, если подтверждённого формата `Session Stats` для Codex всё ещё нет.
- Если продолжать `/status` path, сначала собрать и зафиксировать реальные samples `Codex Session Stats`, а уже потом писать parser/normalizer.
- Если `/status` path окажется нестабильным, обновить planning-doc и `todo-plan.md`, чтобы `runtime + rollout fallback` считались допустимой первой delivery-версией для Codex.
- Не терять из фокуса будущий перевод UI-кеша на `providerScopeKey`, чтобы следующая интеграция не закрепила зависимость от `providerSummary`.

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

## Git commits
- `a930f36d feat(core): add provider usage limits shared contract`
- `59ca3a7a feat(core): add provider usage limits facade skeleton`
- `ca24d723 feat(core): add provider usage limits stream contract`
- `532c5ec7 feat(core): add claude usage limits shared facade`
- `5abbac4a feat(core): inject claude usage limits facade boundary`
- `fc29738d refactor(claude): route usage limits through shared facade`
- `74cd1551 feat(claude): prefer sdk rate limit events`
- `31182e9b feat(core): add codex rollout usage limits fallback`

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

> Далее: `Phase 1` закрыт. Следующий рабочий шаг — `Phase 2 / Stream: Claude shared strategy chain`.
> Далее: `Phase 2` закрыт.
> Текущий статус: `Phase 3 / item 1` закрыт коммитом `31182e9b`.
> Следующий рабочий шаг — `Phase 3 / item 3`: найти и реализовать `Codex` structured runtime/API reader как primary source, а rollout оставить fallback.

## Plans for next session
- Продолжить `Phase 3` с `Codex` runtime/API source как primary candidate и встроить его в shared strategy order поверх уже добавленного rollout fallback.
- Отдельно проверить, можно ли использовать live `event_msg/token_count.rate_limits` или иной runtime signal из `Codex` SDK раньше, чем PTY `/status`.
- Не терять из фокуса будущий перевод UI-кеша на `providerScopeKey`, чтобы следующая интеграция не закрепила зависимость от `providerSummary`.

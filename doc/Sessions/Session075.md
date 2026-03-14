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
- В локально установленном `@anthropic-ai/claude-agent-sdk` найден `SDKRateLimitEvent`, который выглядит как более правильный live runtime source для следующего шага вместо synthetic probe-only path.

## Git commits
- `a930f36d feat(core): add provider usage limits shared contract`
- `59ca3a7a feat(core): add provider usage limits facade skeleton`
- `ca24d723 feat(core): add provider usage limits stream contract`
- `532c5ec7 feat(core): add claude usage limits shared facade`
- `5abbac4a feat(core): inject claude usage limits facade boundary`
- `fc29738d refactor(claude): route usage limits through shared facade`

## Verification
- Выполнена вычитка planning-дока после правок.
- Выполнена вычитка нового `doc/TODO/todo-plan.md` после разворачивания фаз и release-stream.
- Перед стартом реализации проверены структура `packages/core`, паттерны существующих фасадов и границы зависимостей.
- Выполнена таргетная сборка `npm run build --workspace @codeai-hub/core` после добавления shared contract слоя.
- Выполнен ручной `npx ultracite fix` на новых файлах `provider-usage-limits/*` для стабилизации pre-commit formatting.
- Выполнены таргетные сборки `npm run build --workspace @codeai-hub/claude-module` и `npm run build --workspace @codeai-hub/core` после протяжки shared Claude facade через provider boundary.
- Повторно выполнены таргетные сборки `npm run build --workspace @codeai-hub/claude-module` и `npm run build --workspace @codeai-hub/core` после перевода `Claude` message processor на injected shared facade.
- Выполнен локальный поиск по `@anthropic-ai/claude-agent-sdk/sdk.d.ts`; подтверждено наличие `SDKRateLimitEvent` и `SDKRateLimitInfo` как runtime live-source кандидата.

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

## Plans for next session
- Закрыть `Phase 2 / item 7`: проверить, можно ли использовать `SDKRateLimitEvent` как primary live-source для Claude usage limits без тяжёлой переделки bridge.
- Если `SDKRateLimitEvent` практичен, перевести Claude с synthetic probe-preferred path на runtime event-preferred path, оставив probe только fallback.
- После завершения Claude-phase переходить к `Phase 3` и готовить shared Codex strategy chain, не теряя из фокуса будущий перевод UI-кеша на `providerScopeKey`.

# Session 037 — Usage Limits Stabilization (All Providers)

**Date:** 2026-04-12 14:00 (CEST)
**Branch:** main
**Version:** 1.1.965
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary

### Fix: Codex rate limits — direct HTTP reader
- Root cause: Codex CLI v0.120.0 `app-server` RPC fails on `plan_type: "prolite"` — deserialization error, always returns null
- Solution: new `CodexLiveUsageReader` makes `GET chatgpt.com/backend-api/wham/usage` with Bearer token from `auth.json`, bypassing CLI entirely
- Deleted `codex-rpc-usage-limits-reader.ts`, replaced with `codex-live-usage-reader.ts` in `CodexUsageLimitsFacade`

### Fix: Gemini rate limits — module loading + model whitelist
- Root cause 1: `gemini-quota-api-reader.ts` loaded config/settings from `@google/gemini-cli` which switched to bundled format in v0.37.1 (no `dist/src/config/`). Now tries `gemini-cli-core` first with fallback
- Root cause 2: model whitelist had only 2 models; quota API returns 7; all unrecognized were silently dropped
- Added `gemini-3.1-flash-lite-preview` to whitelist and model registry (Settings)
- Supports `Config` constructor pattern alongside legacy `loadCliConfig()`

### Feat: Proactive usage limits on session create/resume
- All three providers now fetch usage limits immediately on session create/resume (fire-and-forget)
- Codex: `proactiveRefresh()` bypasses threadId check (HTTP reader is account-level)
- Claude: proactive on resume only (new sessions start with temp_ ID)
- Gemini: proactive on create/resume via `refreshUsageLimitsAfterTurn`

### Feat: Usage limits refresh on step switch
- New `session:refreshUsageLimits` message type from UI to backend
- `SessionIdBar` component triggers refresh via `onRefreshUsageLimits(providerId)` callback on mount — uses `status.models[0].providerId` which is always available
- Handler calls adapter's `refreshUsageLimits(broadcast)` → adapter calls facade → broadcast result to all clients
- Standalone path (no session in memory): adapter calls facade directly with synthetic IDs

### UI: Third limit row for Gemini
- Session ID bar shows tertiary limit row when data present
- CSS: `flex-shrink: 0` + dynamic height instead of fixed 32px
- `LimitRow` component extracted to reduce cognitive complexity

## Git commits
(REFERENCE ONLY: `Execution Scope Status: COMPLETED`)
- `09c413a4c fix: replace Codex RPC rate limits with direct HTTP reader and add proactive refresh`
- `139f48fdc fix: proactive usage limits refresh bypasses threadId check`
- `1cec1f11b fix: expand Gemini model whitelist and add proactive usage limits refresh`
- `3bd283080 fix: Gemini quota reader loads config from gemini-cli-core with fallbacks`
- `d0091bc36 fix: prevent session ID bar from shrinking with 3 limit rows`
- `4bde1786c feat: refresh usage limits on active session change`
- `d8a7aef92 fix: decouple usage limits refresh from session identity`
- `4c561dc32 fix: trigger usage limits refresh from SessionIdBar via providerId`
- Version bumps: `5ac981930`, `9598e458f`, `ddb592459`, `ebecf3943`, `86669eaa6`, `6145561b5`, `92407a51d`, `7ef1b6ce6`, `f6bf019f8`, `5c6e3517d`, `83ec3bd74`
- Diagnostic (temporary): `4c3335e36`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем агент обязан согласовать с пользователем новый scope.
- После этого агент обязан открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc.

## Architecture gap identified — Session UI Cluster

Обнаружена архитектурная дыра: данные для интерфейса сессии собираются из множества разрозненных мест (snapshots state, sessions state, dialog JSONL, workspace snapshots, stream events, localStorage cache). Нет единого модуля-фасада, который владеет полной правдой о сессии.

**Проблема:** каждая новая фича (лимиты, смена провайдера, блокировки) требует заново выяснять откуда брать данные. При добавлении функции "смена провайдера/модели по клику" проблема усилится.

**Рекомендация:** создать кластер **Session UI** с фасадом `SessionInterfaceFacade`:
- Собирает все данные из всех источников в единый `SessionInterfaceState`
- Каждая панель (ID bar, dialog, status, input) — модуль, получает свой slice данных через фасад
- Добавление панели = новый модуль, подключение к фасаду
- Смена провайдера, refresh лимитов = один метод на фасаде

**Приоритет следующей сессии:** создать planning-документ для Session UI Cluster в `doc/SolidWorks-WorkFlow/Plans/`, утвердить контракт фасада, и строить следующую фичу (смена провайдера/модели) уже на правильной архитектуре.

## Key files modified this session
- `packages/core/src/provider-usage-limits/providers/codex/codex-live-usage-reader.ts` — NEW: HTTP reader
- `packages/core/src/provider-usage-limits/providers/codex/codex-usage-limits-facade.ts` — replaced RPC with HTTP
- `packages/core/src/provider-usage-limits/providers/gemini/gemini-quota-api-reader.ts` — gemini-cli-core fallback
- `packages/core/src/provider-usage-limits/providers/gemini/gemini-usage-limits-normalizer.ts` — whitelist + filter
- `packages/core/src/provider-registry/provider-module-loader.types.ts` — `refreshUsageLimits` on ProviderAdapter
- `packages/core/src/remote-bridge/remote-bridge-message-router.ts` — session:refreshUsageLimits routing
- `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — handleRefreshUsageLimits
- `packages/core/src/remote-bridge/session-stream-contracts.ts` — new message type
- `packages/Codex_Module/src/provider/codex-provider-adapter.ts` — refreshUsageLimits via facade
- `packages/Claude_Module/src/provider/claude-provider-adapter.ts` — refreshUsageLimits via facade
- `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts` — refreshUsageLimits via facade
- `src/client/ui/src/session/session-id-bar.tsx` — onRefreshUsageLimits callback, 3rd row, LimitRow component
- `src/client/ui/src/session/session-view.tsx` — onRefreshUsageLimits prop
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx` — handleRefreshUsageLimits
- `src/client/project-manager/api.ts` — refreshUsageLimits method
- `src/types/gemini-model-registry.ts` — gemini-3.1-flash-lite-preview model
- `media/session-view.css` — flex-shrink: 0, dynamic height

## Known issues (not resolved)

**Usage limits refresh при переключении шагов НЕ РАБОТАЕТ корректно в v1.1.965:**
- При переключении между Description и Virtual Simulation в одном Workspace (один провайдер Claude) — лимиты показываются разные (старые закэшированные значения из localStorage, а не свежие)
- Механизм `session:refreshUsageLimits` → adapter → facade → broadcast реализован, но не даёт правильного результата в UI — вероятно event не доходит до нужного snapshot или snapshot не обновляется
- Root cause: архитектурная дыра — данные для интерфейса сессии разбросаны по множеству независимых state'ов, нет единого source of truth

**Что работает:**
- Codex: лимиты появляются после первого turn (HTTP reader стабилен)
- Gemini: лимиты появляются после первого turn (quota API через gemini-cli-core работает)
- Claude: лимиты появляются после первого turn
- Proactive refresh при создании новой сессии — работает для всех провайдеров

**Что не работает:**
- Refresh лимитов при переключении шагов (focusSession на существующую сессию)
- Единообразное отображение лимитов во всех сессиях одного провайдера
- Эти проблемы требуют архитектурного решения (Session UI Cluster), а не точечных фиксов

# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Usage_Limits_AccountScoped_Warmup_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 1
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_PATH_And_PostRebind_UsageLimits_Architecture.md` (precedent 1.2.43)
  - `packages/core/src/provider-usage-limits/provider-usage-limits-facade.ts` (cache + scopeKey)
  - `packages/core/src/provider-registry/provider-usage-limits-bridge-factory.ts` (per-provider bridge impls)
  - `packages/core/src/remote-bridge/handlers/session-request-handler.ts` (handleRefreshUsageLimits)
  - `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts` (registerUsageLimitsSnapshot)
  - `src/client/project-manager/components/sessions/` или `src/client/ui/src/session/` (UI widget)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- **Gates (автоматически через Husky hooks):** pre-commit (`./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`); pre-push (`npm run check:dup`, `npm run check:links`).
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Account-scoped usage limits cache

### Stream: scopeKey rescope
1. [SKIPPED] `buildProviderUsageLimitScopeKey` уже возвращает `{providerId}:global` — кэш per-provider account-scoped с момента коммита `070139b9e`. Rescope не требуется. Phase 2 может полагаться на этот факт.

## Phase 2 — Single-probe warmup + binding_ready dedup

### Stream: handleRefreshUsageLimits
1. [DONE] `UsageLimitsWarmupTracker` + extract `handleRefreshUsageLimitsFlow` в отдельные helpers (чтобы удержать `session-request-handler.ts` под 500-строковым лимитом). Dedup `binding_ready` через Set<providerId>; остальные triggers проходят. Regression-тест покрывает failed warmup + turn_completed pass-through (scope: 4 файла — 2 NEW + 2 MODIFY).
2. [DONE] Git Commit: `feat: limit usage-limits refresh to one warmup probe per provider` (hash: `d9e7114a4`)

## Phase 3 — UI empty-cache fallback

### Stream: widget
1. [SKIPPED] Проверено: `usage-limits-stream.ts.readBucket` уже возвращает null когда `percentUsed === null`, и `session-id-bar.tsx.renderLimitLabel` уже отсекает `percentUsed === null` от рендера процента (`${label} ${N}%` vs просто `${label}`). `hasUsageLimits` скрывает row целиком когда ВСЕ bucket'ы null. Следовательно, UI **уже** показывает честное состояние: нет payload → нет row; payload есть и нулевой → `Session 0% (Resets …)` (legitimate начало 5-часового окна). Модификация не нужна. Phase 2 dedup закрывает спам fake-нулевых payload'ов от racey binding_ready probe'ов.

## Phase 4 — SSOT + BugRegistry sync

### Stream: Docs
1. [IN_PROGRESS] `SystemArchitecture.md` §3 Invariant 1 — single-probe warmup policy. `BugRegistry.md` — запись `BUG-2026-04-21-06` (scope: 2 файла).
2. [TODO] Git Commit: `docs: record single-probe usage limits warmup invariant` (hash: TBD)

## Phase 5 — Release 1.2.44

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.44 ДО build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for account-scoped usage limits warmup (1.2.44)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`.
4. [TODO] Git Commit: `build: release 1.2.44` (hash: TBD)
5. [TODO] User acceptance: PM open → widget показывает актуальные цифры у всех трёх провайдеров без первого turn'а; переключение между dialog'ами не триггерит повторные HTTP probe.

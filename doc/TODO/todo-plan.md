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
1. [TODO] `buildProviderUsageLimitScopeKey` — убрать `providerSessionId` из ключа (или принимать его как optional breadcrumb). Обновить все call-sites в `provider-usage-limits-bridge-factory.ts` / `provider-usage-limits-facade.ts` / `session-provider-binding-service.ts` (scope: ≤3 файла).
2. [TODO] Git Commit: `refactor: scope usage limits cache per-provider instead of per-session` (hash: TBD)

## Phase 2 — Single-probe warmup + binding_ready dedup

### Stream: handleRefreshUsageLimits
1. [TODO] `SessionRequestHandler`: внутри `handleRefreshUsageLimits` ввести `warmedProviders: Set<string>`. На `binding_ready` trigger: если cached payload есть — replay; если кэш пуст и провайдер не в `warmedProviders` — один dispatch и помечаем провайдера warmed; если провайдер уже warmed — skip с info-логом (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts` — 1 файл).
2. [TODO] Git Commit: `feat: limit usage-limits refresh to one warmup probe per provider` (hash: TBD)
3. [TODO] Regression-тест на `SessionRequestHandler.handleRefreshUsageLimits`: первый binding_ready dispatch'ит, второй-пятый для того же провайдера — skip (scope: `session-request-handler.test.ts` или новый `-usage-warmup.test.ts` — 1 файл).
4. [TODO] Git Commit: `test: cover single-probe warmup policy for usage limits refresh` (hash: TBD)

## Phase 3 — UI empty-cache fallback

### Stream: widget
1. [TODO] Заменить рендер `0%` на `—` когда `usageLimits` null/empty (scope: UI widget file — 1 файл, возможно + нормализатор в `core-bridge/normalizers.ts` если фильтр делается там).
2. [TODO] Git Commit: `fix: render dash instead of 0% when usage limits cache is empty` (hash: TBD)

## Phase 4 — SSOT + BugRegistry sync

### Stream: Docs
1. [TODO] `SystemArchitecture.md` §3 Invariant 1 — account-scoped cache + single-probe warmup policy. `BugRegistry.md` — запись `BUG-2026-04-21-06` (scope: 2 файла).
2. [TODO] Git Commit: `docs: record account-scoped usage limits cache invariant` (hash: TBD)

## Phase 5 — Release 1.2.44

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.44 ДО build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for account-scoped usage limits warmup (1.2.44)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`.
4. [TODO] Git Commit: `build: release 1.2.44` (hash: TBD)
5. [TODO] User acceptance: PM open → widget показывает актуальные цифры у всех трёх провайдеров без первого turn'а; переключение между dialog'ами не триггерит повторные HTTP probe.

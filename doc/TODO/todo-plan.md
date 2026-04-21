# План разработки (Development TODO Plan)

**Execution Scope Status:** ACTIVE

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Codex_PATH_And_PostRebind_UsageLimits_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` §3 Invariant 1 (snapshot-first lock + stale-binding auto-recovery)
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Provider_StaleBinding_AutoRecovery_Architecture.md` (precedent 1.2.42 — где добавлена retry-ветка)
  - `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts` (spawn + env)
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` (retry-ветка + broadcaster)
  - `packages/Claude_Module/src/provider/claude-provider-adapter.ts` (refreshUsageLimits shape)
  - `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts` (refreshUsageLimits shape)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача затрагивает не более 3 файлов.
- **Gates (автоматически через Husky hooks):** pre-commit (`./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`); pre-push (`npm run check:dup`, `npm run check:links`).
- Phase завершается на чистом дереве: `./scripts/build-all.sh` + `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Codex PATH augmentation

### Stream: spawn PATH
1. [TODO] Добавить `CODEX_PATH_CANDIDATES` и augmentation в `CodexAppServerProcess.startInternal` (scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts` — 1 файл).
2. [TODO] Git Commit: `fix: resolve codex binary via augmented PATH in app-server spawn` (hash: TBD)

**Phase 1 closure:** `npm run build --workspace packages/Codex_AppServer_Module` зелёный.

## Phase 2 — Post-rebind usage_limits refresh

### Stream: dispatch retry
1. [TODO] Добавить helper `triggerPostRebindUsageLimitsRefresh` + вызов в retry-ветке после `ensureSessionReadyForSend` до retry `providerSend.dispatch` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` — 1 файл).
2. [TODO] Git Commit: `feat: trigger usage limits refresh after stale-binding rebind` (hash: TBD)
3. [TODO] Regression-тест на `session-request-handler-message-dispatch` — retry path вызывает refreshUsageLimits ровно один раз (scope: создаём новый `.test.ts` рядом — 1 файл).
4. [TODO] Git Commit: `test: cover post-rebind usage limits refresh trigger` (hash: TBD)

**Phase 2 closure:** `npm run build --workspace packages/core` зелёный, regression проходит.

## Phase 3 — SSOT + BugRegistry sync

### Stream: Docs
1. [TODO] `SystemArchitecture.md` §3 Invariant 1 — добавить post-rebind usage_limits refresh как часть stale-binding auto-recovery contract. `BugRegistry.md` — запись `BUG-2026-04-21-05` (2 симптома: Codex spawn ENOENT + Claude/Codex limits пустые после cold-start) (scope: 2 файла).
2. [TODO] Git Commit: `docs: record post-rebind usage limits + codex path invariants` (hash: TBD)

## Phase 4 — Release 1.2.43

### Stream: Release
1. [TODO] README.md + CHANGELOG.md под 1.2.43 ДО build-all.sh (scope: 2 файла).
2. [TODO] Git Commit: `docs: prepare release notes for codex path and post-rebind usage limits (1.2.43)` (hash: TBD)
3. [TODO] `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version`.
4. [TODO] Git Commit: `build: release 1.2.43` (hash: TBD)
5. [TODO] User acceptance: Codex провайдер больше не зависает в `Provider codexCli unavailable` после PATH mismatch; Claude/Codex usage_limits виджет показывает цифры после Core restart в reopened dialog.

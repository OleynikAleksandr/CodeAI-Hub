# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/ModelLabel_FlickerFix_1.2.13.md`
- **Read this context before implementation:**
  - `packages/core/src/remote-bridge/handlers/session-provider-event-router.ts` (Путь A — raw modelId broadcast)
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts` (Путь B — effective identity; source of enrichment)
  - `packages/core/src/remote-bridge/handlers/session-request-handler-runtime-core.ts` (wiring site)
  - `packages/core/src/config/provider-turn-config-resolver.ts` (`buildProviderEffectiveModelId`)
  - `src/client/ui/src/session/model-info-builder.ts` (UI label consumer — для понимания контракта)
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` (Invariant 26 extension)
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Gates автоматически через Husky.
- Real-time документация: обновляем SSOT в том же коммите что и код.

## Phase 1 — Model Label Flicker Fix 1.2.13 (owner: Claude, updated: 2026-04-17)

### Stream 1: Release notes pre-bump to 1.2.13
1. [TODO] README.md + CHANGELOG.md на v1.2.13 с описанием UI label flicker fix. — scope: 2 файла; commit: `docs: prepare 1.2.13 release notes for model label flicker fix`
2. [TODO] Git Commit: `docs: prepare 1.2.13 release notes for model label flicker fix` (hash: TBD)

### Stream 2: Enrich broadcastRuntimeModelUpdate with effective identity
1. [TODO] В `session-request-handler-applied-turn-config.ts` добавить public `resolveEffectiveModelId(providerId, targetModelId)`. В `session-provider-event-router.ts` добавить optional deps `resolveEffectiveModelId` и вызов в `broadcastRuntimeModelUpdate`. В `session-request-handler-runtime-core.ts` прокинуть wiring. — scope: 3 файла; commit: `fix(core): broadcast effective modelId on runtime model update to stabilise UI label`
2. [TODO] Git Commit: `fix(core): broadcast effective modelId on runtime model update to stabilise UI label` (hash: TBD)

### Stream 3: SSOT promotion + planning archive
1. [TODO] SystemArchitecture.md Invariant 26 extension. Archive planning doc + Docs_Index entry. — scope: 3 файла; commit: `docs: extend Invariant 26 with runtime model-update enrichment contract + archive 1.2.13 plan`
2. [TODO] Git Commit: `docs: extend Invariant 26 with runtime model-update enrichment contract + archive 1.2.13 plan` (hash: TBD)

### Stream 4: Release build 1.2.13
1. [TODO] build-all.sh + build-release.sh.
2. [TODO] Git Commit: `chore: bump version to 1.2.13 for model label flicker fix release` (hash: TBD)
3. [TODO] Archive todo-plan; reset empty.
4. [TODO] Git Commit: `docs: close 1.2.13 todo-plan after build` (hash: TBD)

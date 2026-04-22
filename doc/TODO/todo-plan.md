# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/UsageLimits_PreTurn_DialogOpen_Refresh_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/SessionInputLock_RuntimeMaterialization_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Usage_Limits_AccountScoped_Warmup_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_PATH_And_PostRebind_UsageLimits_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_MultiWorkspace_Performance_And_EventDriven_UsageRefresh_1.2.19.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream. В каждом Stream каждая подзадача затрагивает не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту разработки задача выходит за пределы 3 файлов, Stream нужно переписать и разбить на более мелкие подзадачи до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные проверки перед закрытием Stream/Phase:**
  - PM/UI: `npm run build:webview`
  - Type-check UI: `npm run typecheck:webview`
  - Затронутые пакеты: `npm run build --workspace <package>`
- **Commit:** после зелёных gate'ов и синхронного обновления документации.
- **Real-time Документация:** любые архитектурные изменения по usage telemetry/open-time refresh должны попадать в SSOT в том же commit, что и код.
- `doc/TODO/todo-plan.md` обновляется в реальном времени после каждого закрытого пункта и каждого commit.

## Phase 1 — PM provider-scoped usage telemetry seeding (owner: Codex, updated: 2026-04-22)
### Stream: Provider Cache And Snapshot Seed
1. [DONE] Сохранить `usage_limits` в PM provider-scoped cache даже если source snapshot ещё не создан, и перестать терять replay, пришедший между `workspace:select` и dialog bootstrap — scope: `src/client/project-manager/components/sessions/usage-limits-stream.ts`, `src/client/project-manager/components/sessions/dialog-session-bootstrap.ts`, `src/client/project-manager/components/sessions/usage-limits-stream.test.ts`; ожидаемый commit message: `feat: preserve provider usage telemetry for reopened sessions`
2. [DONE] Git Commit: `feat: preserve provider usage telemetry for reopened sessions` (hash: `beac93077`)
3. [DONE] Seed-ить новые runtime/dialog snapshots из provider-scoped usage cache и ввести явный pending/unavailable state для usage bar без fake `0%`, сохранив `Resets ...` в скобках для 5-часового и недельного окна при наличии `resetsAt` — scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts`, `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`, `src/client/ui/src/session/session-id-bar.tsx`; ожидаемый commit message: `feat: seed reopened session usage bars from provider cache`
4. [DONE] Git Commit: `feat: seed reopened session usage bars from provider cache` (hash: `c196fead0`)
5. [DONE] Добавить PM regression coverage для replay-before-snapshot, provider-wide seeding, reopened dialog display state и reset labels в скобках для 5-часового/недельного окна — scope: `src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`, `src/client/ui/src/session/session-id-bar.test.tsx`, `src/client/ui/src/session/session-id-bar.tsx`; ожидаемый commit message: `test: cover reopened session usage telemetry seeding`
6. [DONE] Git Commit: `test: cover reopened session usage telemetry seeding` (hash: `727862ee6`)

## Phase 2 — Core pre-turn refresh on explicit dialog activation (owner: Codex, updated: 2026-04-22)
### Stream: Dialog-Opened Cheap Refresh
1. [DONE] Переиспользовать transport `session:refreshUsageLimits` на explicit dialog activation event, чтобы reopened session запрашивала pre-turn refresh только после фактического открытия пользователем — scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/api.ts`, `packages/core/src/remote-bridge/remote-bridge-message-router.ts`; ожидаемый commit message: `feat: request pre-turn usage refresh on dialog open`
2. [DONE] Git Commit: `feat: request pre-turn usage refresh on dialog open` (hash: `08032f0a3`)
3. [DONE] Обновить Core usage-refresh lifecycle для `dialog_opened`: immediate cached replay, cold/stale cheap refresh и отсутствие permanent suppression после пустого warmup probe — scope: `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-refresh.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler-usage-limits-warmup.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.usage-limits.test.ts`; ожидаемый commit message: `fix: refresh usage limits when reopening cold dialogs`
4. [DONE] Git Commit: `fix: refresh usage limits when reopening cold dialogs` (hash: `fa3406583`)

## Phase 3 — SSOT sync and verification (owner: Codex, updated: 2026-04-22)
### Stream: Pre-Turn Usage Refresh Contract
1. [DONE] Проверить, требуется ли отдельный provider-bridge hardening для Claude/Codex на open-time refresh path; результат: кодовый патч не нужен, потому что adapters уже держат account-scoped cheap refresh без eager session hydration — scope: `packages/Claude_Module/src/provider/claude-provider-adapter.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`, `packages/core/src/provider-registry/provider-usage-limits-bridge-factory.ts`; ожидаемый commit message: `fix: keep provider usage refresh account scoped on dialog open`
2. [DONE] Git Commit: `fix: keep provider usage refresh account scoped on dialog open` (hash: `N/A — audit confirmed existing contract`)
3. [DONE] Синхронизировать SSOT с новым pre-turn contract для reopened dialogs и provider-scoped seeding в PM — scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`, `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`; ожидаемый commit message: `docs: define pre-turn usage refresh for reopened dialogs`
4. [DONE] Git Commit: `docs: define pre-turn usage refresh for reopened dialogs` (hash: `17de3e10f`)
5. [DONE] Закрыть verification по ключевым сценариям: same-workspace reopened dialog, cross-workspace reopened dialog, Core restart, cold computer restart assumptions — scope: пакеты `src/client/project-manager`, `packages/core`, `packages/Claude_Module`, `packages/Codex_AppServer_Module`; ожидаемый commit message: `test: verify pre-turn usage refresh scenarios`
6. [IN_PROGRESS] Git Commit: `test: verify pre-turn usage refresh scenarios` (hash: TBD)

## Phase 4 — Release build stream (owner: Codex, updated: 2026-04-22)
### Stream: Release 1.2.45
1. [TODO] Подготовить prerelease metadata для будущей версии `1.2.45`: обновить `README.md` (`Current Release`), `CHANGELOG.md` (`## [1.2.45]`) и зафиксировать planning-doc текущего scope в репозитории — scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/Plans/UsageLimits_PreTurn_DialogOpen_Refresh_Architecture.md`; ожидаемый commit message: `docs: prepare 1.2.45 release metadata`
2. [TODO] Git Commit: `docs: prepare 1.2.45 release metadata` (hash: TBD)
3. [TODO] Выполнить release build checklist: clean tree, `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить артефакты и закоммитить version/package changes релиза `1.2.45` — scope: release scripts + versioned manifests/build artifacts; ожидаемый commit message: `chore: release 1.2.45`
4. [TODO] Git Commit: `chore: release 1.2.45` (hash: TBD)

# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_AppServer_Module_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Clusters/CoreOrchestrator.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionContinuity.md`
  - `doc/SolidWorks-WorkFlow/Contracts/WorkspaceRuntime.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_AppServer_Module_Architecture.md`
  - `doc/Sessions/Session053.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзадача Stream затрагивает больше 3 файлов, такая задача должна быть разбита на более мелкие и список задач в Stream переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, hash).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке, чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления `todo-plan.md` и связанной документации из `doc/` до коммита.
- Phase завершается на чистом дереве: `./scripts/build-all.sh`, перенос release-артефактов в `doc/tmp/releases/`, фиксация результатов в `doc/Sessions/`.
- `doc/TODO/todo-plan.md` необходимо постоянно обновлять в реальном времени: после каждой подзадачи и каждого коммита.

## Phase 1 — Запуск execution cycle (owner: Codex, updated: 2026-04-19)
### Stream: Документарный старт
1. [DONE] Зафиксировать approved planning-doc, обновление `Docs_Index` и новый active `todo-plan.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_AppServer_Module_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; ожидаемый commit message: `docs: open codex app-server execution cycle`
2. [DONE] Git Commit: `docs: open codex app-server execution cycle` (hash: `758fc7b07`)

### Stream: Provider-neutral immediate binding
3. [DONE] Вынести immediate binding из hardcoded provider-id logic в provider capability; scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-registry/provider-descriptor-factory.ts`, `packages/core/src/remote-bridge/handlers/session-provider-session-resolver.ts`; ожидаемый commit message: `refactor: generalize provider immediate binding`
4. [DONE] Git Commit: `refactor: generalize provider immediate binding` (hash: `53c4aa934`)

## Phase 2 — Parallel module scaffold (owner: Codex, updated: 2026-04-19)
### Stream: Package skeleton
5. [DONE] Создать сборочный scaffold нового пакета app-server; scope: `packages/Codex_AppServer_Module/package.json`, `packages/Codex_AppServer_Module/tsconfig.json`, `packages/Codex_AppServer_Module/src/index.ts`; ожидаемый commit message: `feat: scaffold codex app-server module`
6. [DONE] Git Commit: `feat: scaffold codex app-server module` (hash: `e97122bc5`)

### Stream: Public adapter baseline
7. [DONE] Добавить совместимый adapter/options surface для Core; scope: `packages/Codex_AppServer_Module/src/index.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`, `packages/Codex_AppServer_Module/src/types/index.ts`; ожидаемый commit message: `feat: add codex app-server adapter baseline`
8. [DONE] Git Commit: `feat: add codex app-server adapter baseline` (hash: `2210826eb`)

## Phase 3 — Transport runtime (owner: Codex, updated: 2026-04-19)
### Stream: App-server runtime core
9. [DONE] Реализовать long-lived app-server runtime: process lifecycle, JSONL request/notification handling, thread/turn calls, финальный dialog mapping, token usage / usage limits stream events и provider-adapter binding; scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-event-router.ts`, `packages/Codex_AppServer_Module/src/app-server/codex-app-server-facade.ts`, `packages/Codex_AppServer_Module/src/provider/codex-provider-adapter.ts`; ожидаемый commit message: `feat: add codex app-server transport core`
10. [DONE] Git Commit: `feat: add codex app-server transport core` (hash: `b7fb5be51`)

### Stream: Core package switch
11. [DONE] Переключить Core import/bundled dependency seam на новый app-server package без смены provider contract `codexCli`; scope: `packages/core/package.json`, `packages/core/src/provider-registry/provider-module-loader.ts`, `package-lock.json`; ожидаемый commit message: `build: wire core to codex app-server package`
12. [DONE] Git Commit: `build: wire core to codex app-server package` (hash: `8a42ecd40`)

## Phase 4 — Event normalization and telemetry (owner: Codex, updated: 2026-04-19)
### Stream: Packaging seam
13. [DONE] Дожать packaging scripts для нового app-server workspace без смены внешнего codex artifact contract; scope: `scripts/build-core.sh`, `scripts/build-codex-module.sh`, `scripts/build-release.sh`; ожидаемый commit message: `build: switch codex packaging to app-server module`
14. [DONE] Git Commit: `build: switch codex packaging to app-server module` (hash: `5decedc37`)

### Stream: Core dependency cleanup
15. [DONE] Убрать legacy `@codeai-hub/codex-module` из Core type/dependency surface, сохранив тот же provider contract `codexCli`; scope: `packages/core/package.json`, `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-registry/provider-installer-paths.ts`; ожидаемый commit message: `refactor: remove legacy codex module core dependency`
16. [DONE] Git Commit: `refactor: remove legacy codex module core dependency` (hash: `07484eb8a`)

### Stream: Build orchestration
17. [DONE] Синхронизировать `build-all`/lockfile/runtime packaging с новым workspace package после удаления legacy зависимости; scope: `scripts/build-all.sh`, `scripts/build-core.sh`, `package-lock.json`; ожидаемый commit message: `build: align codex app-server release pipeline`
18. [DONE] Git Commit: `build: align codex app-server release pipeline` (hash: `5b337b78d`)

## Phase 5 — Release switch and validation (owner: Codex, updated: 2026-04-19)
### Stream: Release notes
19. [DONE] Подготовить release-note surface под будущую версию `1.2.22`; scope: `README.md`, `CHANGELOG.md`; ожидаемый commit message: `docs: prepare 1.2.22 release notes`
20. [DONE] Git Commit: `docs: prepare 1.2.22 release notes` (hash: `02cf2cfc0`)

### Stream: Codex architecture docs
21. [DONE] Синхронизировать канонические Codex SSOT-доки под новый app-server transport и текущий provider contract; scope: `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`; ожидаемый commit message: `docs: sync codex app-server architecture ssot`
22. [DONE] Git Commit: `docs: sync codex app-server architecture ssot` (hash: `076d69406`)

### Stream: Release build
23. [DONE] Выполнить таргетные сборки затронутых пакетов, затем `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать release-line `1.2.22` и обновить `todo-plan.md`; scope: `packages/Codex_AppServer_Module`, `packages/core`, `release manifests/versioned artifacts`; ожидаемый commit message: `build: release 1.2.22`
24. [DONE] Git Commit: `build: release 1.2.22` (hash: `a7f1ec825`)

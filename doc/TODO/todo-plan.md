# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`, `doc/Sessions/Session122.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 26 — Idea / Idea Collector Legacy Cleanup (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать предыдущий `todo-plan` после prompt/help regression scope, создать planning-doc с классификацией `Idea` / `Idea Collector` legacy слоя и открыть новый execution plan под cleanup текущего `Description` workflow naming, compat-bridge и dead legacy path (scope: `doc/TODO/Archive/todo-plan-up-to-phase25-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start idea collector legacy cleanup scope`).
2. [DONE] Git Commit: `docs(plan): start idea collector legacy cleanup scope` (hash: `65373d56`)

### Stream: Rename active PM Description pipeline
1. [DONE] Переименовать живой PM submit service текущего `Description` шага в explicit `description-*` naming, сохранив миграционный bridge для существующих импортов на время migration (scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `refactor(pm): rename description submit service`).
2. [DONE] Git Commit: `refactor(pm): rename description submit service` (hash: `d1c9962e`)
3. [DONE] Переименовать provider picker текущего `Description` шага в explicit `description-*` naming, сохранив миграционный bridge для существующих импортов на время migration (scope: `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`, `src/client/project-manager/components/description/description-provider-picker.tsx`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `refactor(pm): rename description provider picker`).
4. [DONE] Git Commit: `refactor(pm): rename description provider picker` (hash: `8ef20445`)
5. [DONE] Переименовать template parser/render helpers текущего `Description` flow в explicit `description-*` naming и переключить текущий PM import на новый path без удаления legacy helper (scope: `src/client/ui/src/services/idea-questionnaire-template.ts`, `src/client/ui/src/services/description-questionnaire-template.ts`, `src/client/project-manager/services/description-questionnaire-service.ts`; expected commit: `refactor(ui): rename description questionnaire template helpers`).
6. [DONE] Git Commit: `refactor(ui): rename description questionnaire template helpers` (hash: `803fd87c`)
7. [DONE] Переименовать current questionnaire view текущего `Description` flow в explicit `description-*` naming и переключить PM panel на новый path без удаления legacy view (scope: `src/client/ui/src/components/idea-questionnaire/idea-questionnaire-view.tsx`, `src/client/ui/src/components/description-questionnaire/description-questionnaire-view.tsx`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `refactor(ui): rename description questionnaire view`).
8. [DONE] Git Commit: `refactor(ui): rename description questionnaire view` (hash: `0a8ba760`)
9. [DONE] Переименовать current questionnaire messaging helpers текущего `Description` flow в explicit `description-*` naming и переключить PM submit service на новый path без удаления legacy helper (scope: `src/client/ui/src/services/idea-questionnaire-messages.ts`, `src/client/ui/src/services/description-questionnaire-messages.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`; expected commit: `refactor(ui): rename description questionnaire messaging helpers`).
10. [DONE] Git Commit: `refactor(ui): rename description questionnaire messaging helpers` (hash: `de3901ff`)

### Stream: Remove active compat bridges from current workflow
1. [DONE] Переключить PM pre-submit bootstrap c `/idea-contract` и `stage: "idea"` на explicit `Description` contract/session semantics и убрать `idea -> description` schema remap в current PM flow (scope: `src/client/project-manager/services/description-questionnaire-service.ts`, `src/client/project-manager/components/sessions/session-schema-stage.ts`, `src/client/project-manager/components/sessions/session-message-sender.ts`; expected commit: `refactor(workflow): switch description bootstrap off idea alias`).
2. [DONE] Git Commit: `refactor(workflow): switch description bootstrap off idea alias` (hash: `21099afb`)
3. [DONE] Сузить runtime compat-layer после migration callers: `idea-contract` должен стать либо redirect-only alias, либо быть удалён, если активных callers больше нет (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `src/client/ui/src/services/idea-collector-contract.ts`; expected commit: `refactor(core): narrow legacy idea contract bridge`).
4. [DONE] Git Commit: `refactor(core): narrow legacy idea contract bridge` (hash: `78aa4866`)

### Stream: Remove disabled legacy home-view flow
1. [DONE] Удалить legacy `Idea/Spec/Plan/Execute` command wiring из home-view transport и оставить Project Manager единственной supported workflow entry surface (scope: `src/extension-module/home-view-message-router/command-handler.ts`, `src/extension-module/home-view-message-router/message-types.ts`, `src/client/ui/src/components/action-bar/index.tsx`; expected commit: `refactor(home-view): drop legacy flow commands`).
2. [DONE] Git Commit: `refactor(home-view): drop legacy flow commands` (hash: `080ae09b`)
3. [DONE] Снять disabled `FullAppHost` flow-wizard/questionnaire path, который всё ещё тащит `idea` semantics, но не является частью current product surface (scope: `src/client/ui/src/app-host.tsx`, `src/client/ui/src/app-host/session-region.tsx`, `src/client/ui/src/app-host/use-provider-picker-open-handler.ts`; expected commit: `refactor(ui): remove disabled full flow host`).
4. [DONE] Git Commit: `refactor(ui): remove disabled full flow host` (hash: `ae3c2103`)

### Stream: Provider + package cleanup for legacy Idea Collector layer
1. [DONE] Переименовать provider-side parser structured output из `Idea Collector` terminology в нейтральную workflow terminology без изменения текущего parse behavior (scope: `packages/Claude_Module/src/messaging/idea-collector-structured-output.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit: `refactor(claude): neutralize workflow structured output naming`).
2. [DONE] Git Commit: `refactor(claude): neutralize workflow structured output naming` (hash: `ee820f6a`)
3. [DONE] Убрать stale workspace/build references на удаляемый `@codeai-hub/idea-collector`, чтобы root workspace, Core dependency graph и packaging scripts больше не ожидали наличие этого пакета (scope: `package.json`, `packages/core/package.json`, `scripts/build-core.sh`; expected commit: `refactor(build): drop idea collector workspace references`).
4. [DONE] Git Commit: `refactor(build): drop idea collector workspace references` (hash: `e616d9a0`)
5. [DONE] Удалить orphaned `packages/agents/idea-collector` package, обновить lockfile и оставить в Core только runtime legacy alias `idea-contract`, не зависящий от удалённого пакета (scope: `packages/agents/idea-collector`, `package-lock.json`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected commit: `refactor(core): remove legacy idea collector package`).
6. [DONE] Git Commit: `refactor(core): remove legacy idea collector package` (hash: `e048058f`)

### Stream: Residual active naming + packaging cleanup
1. [DONE] Удалить оставшиеся stale build/staging references на удалённый `@codeai-hub/idea-collector`, чтобы релизная сборка больше не пыталась собирать и линковать несуществующий пакет (scope: `scripts/build-core.sh`; expected commit: `fix(build): remove stale idea collector staging refs`).
2. [DONE] Git Commit: `fix(build): remove stale idea collector staging refs` (hash: `8e51fe53`)
3. [DONE] Перенести живой PM submit/start flow на explicit `DescriptionSubmitService`, оставив legacy `idea-collector-submit-service` только как compat alias (scope: `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`; expected commit: `refactor(pm): promote description submit service`).
4. [DONE] Git Commit: `refactor(pm): promote description submit service` (hash: `9bcf59dd`)
5. [DONE] Переименовать active callback wiring и pending-session state текущего `Description` шага, чтобы в PM больше не осталось `onIdeaSession*` / `handleIdeaSession*` имен в живом flow (scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit: `refactor(pm): rename description session callbacks`).
6. [DONE] Git Commit: `refactor(pm): rename description session callbacks` (hash: `97ea1e51`)
7. [DONE] Ввести explicit `Description` provider accessor для живого PM flow и переключить текущие questionnaire/workflow callers с legacy `getIdeaCollectorProviders` naming (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/provider-snapshot.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit: `refactor(pm): add description provider accessor`).
8. [DONE] Git Commit: `refactor(pm): add description provider accessor` (hash: `5f12150d`)
9. [DONE] Переключить текущие workflow start/fix surfaces на новый provider accessor, чтобы `Idea Collector` naming больше не участвовал в active start/repair flow (scope: `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; expected commit: `refactor(pm): switch workflow provider callers to description accessor`).
10. [DONE] Git Commit: `refactor(pm): switch workflow provider callers to description accessor` (hash: `0face257`)
11. [DONE] Убрать user-facing `Idea Collector` copy из provider picker текущего `Description` шага, а legacy file оставить только как compat wrapper или удалить после переноса текущего render source (scope: `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`, `src/client/project-manager/components/description/description-provider-picker.tsx`; expected commit: `refactor(pm): remove idea collector copy from provider picker`).
12. [DONE] Git Commit: `refactor(pm): remove idea collector copy from provider picker` (hash: `480bd5fb`)
13. [DONE] Удалить unused legacy provider accessor `getIdeaCollectorProviders` и соответствующий snapshot alias, раз у текущего PM flow больше нет callers (scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/provider-snapshot.ts`; expected commit: `refactor(pm): remove unused idea provider accessor`).
14. [DONE] Git Commit: `refactor(pm): remove unused idea provider accessor` (hash: `8514dcb5`)
15. [DONE] Удалить unused PM wrapper files `idea-collector-submit-service.ts` и `idea-collector-provider-picker.tsx`, раз после migration текущих callers они больше не импортируются (scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/description/idea-collector-provider-picker.tsx`; expected commit: `refactor(pm): remove unused idea wrappers`).
16. [DONE] Git Commit: `refactor(pm): remove unused idea wrappers` (hash: `8aa419c1`)

### Stream: Docs and SSOT cleanup
1. [DONE] Обновить active SSOT, чтобы `Idea` / `Idea Collector` оставались только историей или compat note, а не текущей семантикой шага `Description` (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`; expected commit: `docs(workflow): remove idea legacy semantics from active ssot`).
2. [TODO] Git Commit: `docs(workflow): remove idea legacy semantics from active ssot` (hash: TBD)
3. [TODO] Синхронизировать docs index и redirect-notes с новым cleanup boundary: legacy redirect files оставить только как compat links, без product-semantics drift (scope: `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`, `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`; expected commit: `docs(compat): classify idea legacy redirects`).
4. [TODO] Git Commit: `docs(compat): classify idea legacy redirects` (hash: TBD)

### Stream: Release build after Idea legacy cleanup
1. [TODO] На чистом дереве прогнать таргетные проверки/сборки для PM/UI/Core/Provider слоёв, затронутых cleanup-ом, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; после успеха обновить `README.md`, `CHANGELOG.md`, `doc/Sessions/Session123.md` и `todo-plan.md`, зафиксировав новый локальный релиз и baseline для post-cleanup regression (scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session123.md`; expected commit: `chore(release): prepare idea legacy cleanup release`).
2. [TODO] Git Commit: `chore(release): prepare idea legacy cleanup release` (hash: TBD)

## Notes
- Archived previous completed rollout plan:
  - `doc/TODO/Archive/todo-plan-up-to-phase25-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/IdeaCollector_LegacyCleanup_Architecture.md`
- Current validated release baseline before this scope:
  - `codeai-hub-1.1.761.vsix`
- Previous prompt-surface observations from `Phase 25` are now superseded by explicit cleanup of the mixed `Idea` / `Idea Collector` legacy layer around the current `Description` workflow.

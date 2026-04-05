# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Application_Foundation_Envelope_Architecture.md`
- This plan covers only the **first implementation wave** of `Application Foundation Envelope`.
- Scope of this wave: stage shell only.
- Explicitly deferred from this wave:
  - `application-envelope.flow.json`
  - visual projection / renderer / editor
  - downstream branch-level specification steps
- Keep each micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before closing the phase, run targeted tests/builds only for touched areas; full release pipeline is not part of this wave.

## Phase 1 — Application Foundation Envelope Stage Shell (owner: Codex, updated: 2026-04-05)

### Stream: Core Stage Contract
1. [DONE] Add the `application_foundation_envelope` stage id to workflow watcher primitives and declare the new step in the workflow CLI contract; scope: `packages/core/src/workflow/watcher/watcher-types.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`; expected commit message: `feat: declare application foundation envelope workflow stage`
2. [IN_PROGRESS] Git Commit: `feat: declare application foundation envelope workflow stage` (hash: TBD)
3. [TODO] Add stage ordering to the workflow state store and document the new step placement in SSOT overview docs; scope: `packages/core/src/workflow/state/workflow-state-store.ts`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `feat: track application foundation envelope workflow order`
4. [TODO] Git Commit: `feat: track application foundation envelope workflow order` (hash: TBD)
5. [TODO] Add workflow gating and cold-start hydration for the new stage after `Diagram Modules` aggregate readiness; scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit message: `feat: gate application foundation envelope after diagram modules`
6. [TODO] Git Commit: `feat: gate application foundation envelope after diagram modules` (hash: TBD)
7. [TODO] Add canonical artifact path support for `application-foundation-envelope.md`; scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`; expected commit message: `feat: allow application foundation envelope artifact paths`
8. [TODO] Git Commit: `feat: allow application foundation envelope artifact paths` (hash: TBD)

### Stream: Core Contract Endpoint And Persistence
1. [TODO] Add prompt source asset, generator manifest entry, and regenerate bundled templates for the new step; scope: `packages/core/src/templates/source/application-foundation-envelope-prompt.md`, `scripts/generate-bundled-templates.js`, `packages/core/src/templates/bundled-templates.ts`; expected commit message: `feat: bundle application foundation envelope prompt`
2. [TODO] Git Commit: `feat: bundle application foundation envelope prompt` (hash: TBD)
3. [TODO] Expose workflow contract builder and HTTP endpoint for the new step; scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.application-foundation-envelope.test.ts`; expected commit message: `feat: expose application foundation envelope contract`
4. [TODO] Git Commit: `feat: expose application foundation envelope contract` (hash: TBD)
5. [TODO] Add artifact validation and upsert slot for the canonical envelope markdown; scope: `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`; expected commit message: `feat: persist application foundation envelope artifacts`
6. [TODO] Git Commit: `feat: persist application foundation envelope artifacts` (hash: TBD)

### Stream: Project Manager Service Wiring
1. [TODO] Extend client workflow stage ids/order, workflow contract endpoints, and prompt-pack target file mapping; scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit message: `feat: add application foundation envelope client contracts`
2. [TODO] Git Commit: `feat: add application foundation envelope client contracts` (hash: TBD)
3. [TODO] Add start-service entry for the new stage and cover it with service-level tests; scope: `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit message: `feat: start application foundation envelope from project manager`
4. [TODO] Git Commit: `feat: start application foundation envelope from project manager` (hash: TBD)

### Stream: Project Manager UI Shell
1. [TODO] Add the new toolbar button after `Diagram Modules` and wire tool-to-stage routing; scope: `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/components/layout/main-area-utils.ts`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `feat: add application foundation envelope toolbar step`
2. [TODO] Git Commit: `feat: add application foundation envelope toolbar step` (hash: TBD)
3. [TODO] Extend workflow tree labels, priority resolution, and auto-select order for the new stage; scope: `src/client/project-manager/components/layout/workspace-tree-model.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`; expected commit message: `feat: expose application foundation envelope in workflow tree`
4. [TODO] Git Commit: `feat: expose application foundation envelope in workflow tree` (hash: TBD)
5. [TODO] Add branch-node sync and stage-child wiring for the new stage; scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/use-stage-panel-sync.ts`; expected commit message: `feat: sync application foundation envelope stage nodes`
6. [TODO] Git Commit: `feat: sync application foundation envelope stage nodes` (hash: TBD)
7. [TODO] Create the panel shell, help panel, and artifact-availability hook for `application-foundation-envelope.md`; scope: `src/client/project-manager/components/application-foundation-envelope/application-foundation-envelope-panel.tsx`, `src/client/project-manager/components/application-foundation-envelope/application-foundation-envelope-help.tsx`, `src/client/project-manager/components/layout/use-application-foundation-envelope-artifact-availability.ts`; expected commit message: `feat: add application foundation envelope panel shell`
8. [TODO] Git Commit: `feat: add application foundation envelope panel shell` (hash: TBD)
9. [TODO] Integrate the new panel into main content and repair flow; scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/shared/stage-artifact-content-view.tsx`, `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; expected commit message: `feat: integrate application foundation envelope artifact view`
10. [TODO] Git Commit: `feat: integrate application foundation envelope artifact view` (hash: TBD)

### Stream: Verification
1. [TODO] Run targeted tests for touched workflow/core/project-manager files and update this plan with results before closing the phase; scope: `packages/core`, `src/client/project-manager`; expected commit message: `test: verify application foundation envelope stage shell`
2. [TODO] Git Commit: `test: verify application foundation envelope stage shell` (hash: TBD)

### Stream: Release Build
1. [TODO] Sync release notes for the `Application Foundation Envelope` stage-shell release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare application foundation envelope stage shell notes`
2. [TODO] Git Commit: `docs(release): prepare application foundation envelope stage shell notes` (hash: TBD)
3. [TODO] Build and package the release after all streams are green; scope: release scripts + versioned artifacts; expected commit message: `build(release): assemble application foundation envelope stage shell release`
4. [TODO] Git Commit: `build(release): assemble application foundation envelope stage shell release` (hash: TBD)
5. [TODO] Record the release session report and close the phase; scope: `doc/Sessions/Session042.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(session): record application foundation envelope stage shell release`
6. [TODO] Git Commit: `docs(session): record application foundation envelope stage shell release` (hash: TBD)

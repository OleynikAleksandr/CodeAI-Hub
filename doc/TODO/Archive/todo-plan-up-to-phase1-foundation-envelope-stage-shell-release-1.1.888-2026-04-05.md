# Development TODO Plan

## Execution Rules
- Required reading before each new fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`
- This plan covers only the **first implementation wave** of `Foundation Envelope`.
- Scope of this wave: stage shell only.
- Explicitly deferred from this wave:
  - `foundation-envelope.flow.json`
  - visual projection / renderer / editor
  - downstream branch-level specification steps
- Keep each micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before closing the phase, run targeted tests/builds only for touched areas; the full release pipeline is handled only in the dedicated `Release Build` stream.

## Phase 1 — Foundation Envelope Stage Shell (owner: Codex, updated: 2026-04-05)

### Stream: Core Stage Contract
1. [DONE] Add the `foundation_envelope` stage id to workflow watcher primitives and declare the new step in the workflow CLI contract; scope: `packages/core/src/workflow/watcher/watcher-types.ts`, `packages/core/src/workflow/watcher/workflow-watcher.ts`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`; expected commit message: `feat: declare foundation envelope workflow stage`
2. [DONE] Git Commit: `feat: declare foundation envelope workflow stage` (hash: `ea2ff32e`)
3. [DONE] Add stage ordering to the workflow state store and document the new step placement in SSOT overview docs; scope: `packages/core/src/workflow/state/workflow-state-store.ts`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit message: `feat: track foundation envelope workflow order`
4. [DONE] Git Commit: `feat: track foundation envelope workflow order` (hash: `03a999581`)
5. [DONE] Compute `diagramModulesProgress.aggregateReady` and gate `foundation_envelope` on it in `/workflow-state`; scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; expected commit message: `feat: gate foundation envelope after diagram modules`
6. [DONE] Git Commit: `feat: gate foundation envelope after diagram modules` (hash: `a69e2055d`)
7. [DONE] Add canonical artifact path and filesystem hydration support for `foundation-envelope.md`; scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`; expected commit message: `feat: hydrate foundation envelope artifacts`
8. [DONE] Git Commit: `feat: hydrate foundation envelope artifacts` (hash: `f1ae28aa7`)
9. [DONE] Cover canonical envelope path resolution and cold-start artifact hydration in tests and workflow contract docs; scope: `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`; expected commit message: `test: cover foundation envelope artifact hydration`
10. [DONE] Git Commit: `test: cover foundation envelope artifact hydration` (hash: `6599c4321`)

### Stream: Core Contract Endpoint And Persistence
1. [DONE] Add prompt source asset, generator manifest entry, and regenerate bundled templates for the new step; scope: `packages/core/src/templates/source/foundation-envelope-prompt.md`, `scripts/generate-bundled-templates.js`, `packages/core/src/templates/bundled-templates.ts`; expected commit message: `feat: bundle foundation envelope prompt`
2. [DONE] Git Commit: `feat: bundle foundation envelope prompt` (hash: `1d5a7ef52`)
3. [DONE] Expose workflow contract builder and HTTP endpoint for the new step; scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.foundation-envelope.test.ts`; expected commit message: `feat: expose foundation envelope contract`
4. [DONE] Git Commit: `feat: expose foundation envelope contract` (hash: `516ce640b`)
5. [DONE] Add artifact validation and upsert slot for the canonical envelope markdown; scope: `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`; expected commit message: `feat: persist foundation envelope artifacts`
6. [DONE] Git Commit: `feat: persist foundation envelope artifacts` (hash: `45291588d`)

### Stream: Project Manager Service Wiring
1. [DONE] Extend client workflow stage ids/order, workflow contract endpoints, and prompt-pack target file mapping; scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/description-submit-service.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`; expected commit message: `feat: add foundation envelope client contracts`
2. [DONE] Git Commit: `feat: add foundation envelope client contracts` (hash: `fe10e0025`)
3. [DONE] Add the project-manager start-service entry for `foundation_envelope` and cover gating/session selection at service level; scope: `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit message: `feat: start foundation envelope from project manager`
4. [DONE] Git Commit: `feat: start foundation envelope from project manager` (hash: `04f044509`)
5. [DONE] Align prompt-pack template-hint rules for `foundation_envelope` and cover the canonical target artifact in client tests; scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`; expected commit message: `test: cover foundation envelope prompt pack`
6. [DONE] Git Commit: `test: cover foundation envelope prompt pack` (hash: `6ae948399`)

### Stream: Project Manager UI Shell
1. [DONE] Add the new toolbar button after `Diagram Modules` and wire tool-to-stage routing; scope: `src/client/project-manager/components/layout/use-workflow-tool-select.ts`, `src/client/project-manager/components/layout/main-area-utils.ts`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `feat: add foundation envelope toolbar step`
2. [DONE] Git Commit: `feat: add foundation envelope toolbar step` (hash: `9341dc527`)
3. [DONE] Extend workflow tree labels and blocked-title rendering for the new stage; scope: `src/client/project-manager/components/layout/workspace-tree-model.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `feat: label foundation envelope tree stage`
4. [DONE] Git Commit: `feat: label foundation envelope tree stage` (hash: `86ca4d222`)
5. [DONE] Extend main-area stage priority resolution and workspace auto-select order for the new stage, and remove the now-unused shared continuity-chain export; scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; expected commit message: `feat: prioritize foundation envelope UI recovery`
6. [DONE] Git Commit: `feat: prioritize foundation envelope UI recovery` (hash: `9936228b2`)
7. [DONE] Add branch-node sync and stage-child wiring for the new stage; scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`; expected commit message: `feat: sync foundation envelope stage nodes`
8. [DONE] Git Commit: `feat: sync foundation envelope stage nodes` (hash: `a4e51c7be`)
9. [DONE] Create the panel shell with inline help and connect it to the main content entry point for `foundation-envelope.md`; scope: `src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`; expected commit message: `feat: add foundation envelope panel shell`
10. [DONE] Git Commit: `feat: add foundation envelope panel shell` (hash: `da7e68977`)
11. [DONE] Extend the shared artifact repair flow for `foundation-envelope.md`; scope: `src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx`, `src/client/project-manager/components/shared/stage-artifact-content-view.tsx`, `src/client/project-manager/components/shared/stage-artifact-fix-button.tsx`; expected commit message: `feat: integrate foundation envelope artifact view`
12. [DONE] Git Commit: `feat: integrate foundation envelope artifact view` (hash: `d43b49531`)

### Stream: Verification
1. [DONE] Align the remaining workflow test fixtures with the new `foundation_envelope` stage key so `typecheck:webview` can pass again; scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit message: `test: align foundation envelope workflow fixtures`
2. [DONE] Git Commit: `test: align foundation envelope workflow fixtures` (hash: `a16b496a4`)
3. [DONE] Run targeted tests/builds for touched workflow/core/project-manager files, update this plan with the concrete results, and close verification; scope: targeted `tsx` tests, `npm run typecheck:webview`, `npm run build:project-manager`, `npm run build --workspace=@codeai-hub/core`; results: PASS (`npx tsx --test packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts packages/core/src/workflow/paths/workflow-artifact-paths.test.ts packages/core/src/remote-bridge/handlers/idea-contract-service.foundation-envelope.test.ts packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`, `npx tsx --test src/client/project-manager/services/workflow-step-start-service.gating.test.ts src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`, `npm run typecheck:webview`, `npm run build:project-manager`, `npm run build --workspace=@codeai-hub/core`); expected commit message: `test: verify foundation envelope stage shell`
4. [DONE] Git Commit: `test: verify foundation envelope stage shell` (hash: `ef8a9f747`)

### Stream: Release Build
1. [DONE] Sync release notes for the `Foundation Envelope` stage-shell release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare foundation envelope stage shell notes`
2. [DONE] Git Commit: `docs(release): prepare foundation envelope stage shell notes` (hash: `614d1c897`)
3. [DONE] Commit the pending planning-governance and plans-index docs so release build can start from a clean tree; scope: `AGENTS.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs(plans): tighten planning closeout governance`
4. [DONE] Git Commit: `docs(plans): tighten planning closeout governance` (hash: `5922cdf85`)
5. [DONE] Commit the active planning baseline docs referenced by this release wave; scope: `doc/Sessions/Session040.md`, `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Implementation_Foundation_Architecture.md`; expected commit message: `docs(plans): record foundation envelope planning baseline`
6. [DONE] Git Commit: `docs(plans): record foundation envelope planning baseline` (hash: `1604ef73c`)
7. [DONE] Commit the planning-to-execution transition session report before release packaging; scope: `doc/Sessions/Session041.md`; expected commit message: `docs(session): record foundation envelope planning scope`
8. [DONE] Git Commit: `docs(session): record foundation envelope planning scope` (hash: `0b1b7f9ea`)
9. [DONE] Run `./scripts/build-all.sh` on a clean tree, prepare unified version `1.1.888`, and materialize release tarballs/manifests for the stage-shell wave; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): assemble foundation envelope stage shell release`
10. [DONE] Git Commit: `build(release): assemble foundation envelope stage shell release` (hash: `9a6ab9557`)
11. [DONE] Run `./scripts/build-release.sh --use-current-version`, verify the final VSIX/package outputs, archive the completed execution plan, seed a new empty `todo-plan.md`, record the release session report, and close the phase; scope: `doc/TODO/Archive/todo-plan-up-to-phase1-foundation-envelope-stage-shell-release-1.1.888-2026-04-05.md`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session042.md`; results: PASS (`./scripts/build-release.sh --use-current-version`), VSIX: `codeai-hub-1.1.888.vsix`, release tarballs present in `doc/tmp/releases/`; expected commit message: `docs(session): record foundation envelope stage shell release`
12. [DONE] Git Commit: `docs(session): record foundation envelope stage shell release` (hash: `TBD - this commit`)

# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_VisualProjection_Architecture.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`
  - `doc/SolidWorks-WorkFlow/System/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/DevelopmentTree_BranchWorkflow_Architecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- `TODO Plan` состоит из `Phase` и `Stream`; каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация/изменения и отдельный `Git Commit:` пункт.
- Если по факту подзадача выходит за пределы 3 файлов, её нужно разбить до начала реализации.
- В этот execution cycle изменения agent instructions для `Foundation Envelope` являются обязательной частью scope: нельзя внедрять visual projection, сохранив markdown-only prompt.
- Семантический SSOT шага остаётся в `foundation-envelope.md`; `foundation-envelope.flow.json` должен оставаться runtime-owned layout/view sidecar и не участвовать в semantic gating.
- Husky hooks обязательны:
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- Таргетные ручные проверки перед закрытием scope:
  - `npm run build --workspace=@codeai-hub/core`
  - `npm run build:webview`
  - `npm run typecheck:webview`
- Любое изменение логики или архитектурной границы должно синхронно обновлять релевантные документы из `doc/` и `doc/TODO/todo-plan.md` до коммита.
- `doc/TODO/todo-plan.md` необходимо постоянно обновлять в реальном времени: после каждой подзадачи и после каждого commit.

## Phase 1 — Foundation Envelope Visual Projection (owner: Codex, updated: 2026-04-07)

### Stream: Contract Activation
1. [DONE] Update `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/Plans/Foundation_Envelope_Architecture.md`, and `doc/TODO/todo-plan.md`; scope: activate `foundation-envelope.flow.json` and runtime visual projection for `Foundation Envelope` while keeping `foundation-envelope.md` as semantic SSOT; expected commit message: `docs(workflow): activate foundation envelope visual projection`
2. [DONE] Git Commit: `docs(workflow): activate foundation envelope visual projection` (hash: `6b314b960`)
3. [DONE] Update `packages/core/src/templates/source/foundation-envelope-prompt.md`, `src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx`, and `doc/TODO/todo-plan.md`; scope: require projection-friendly markdown structure, remove markdown-only guidance, and keep `.flow.json` runtime-owned instead of agent-generated; expected commit message: `docs(prompt): require projection-ready foundation envelope`
4. [DONE] Git Commit: `docs(prompt): require projection-ready foundation envelope` (hash: `04e5f8c8c`)

### Stream: Artifact Surface And Loader Generalization
5. [DONE] Update `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, and `doc/TODO/todo-plan.md`; scope: add `foundation-envelope.flow.json` to workflow artifact typing and allowlist without changing semantic gating rules; expected commit message: `feat(workflow): add foundation envelope flow artifact`
6. [DONE] Git Commit: `feat(workflow): add foundation envelope flow artifact` (hash: `d10f2755e`)
7. [DONE] Update `packages/core/src/remote-bridge/handlers/http-api-artifact-validation.ts`, `packages/core/src/remote-bridge/handlers/http-api-system-routes.ts`, and `doc/TODO/todo-plan.md`; scope: validate and route `Foundation Envelope` sidecar reads/writes through the existing workflow artifact endpoints; expected commit message: `feat(core): route foundation envelope sidecar`
8. [DONE] Git Commit: `feat(core): route foundation envelope sidecar` (hash: `82dd18ce4`)
9. [DONE] Update `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, and `doc/TODO/todo-plan.md`; scope: generalize shared diagram stage path/loading logic so `foundation_envelope` can load markdown plus sidecar through the diagram editor pipeline; expected commit message: `refactor(pm): generalize diagram stage loader`
10. [DONE] Git Commit: `refactor(pm): generalize diagram stage loader` (hash: `88e57f9b6`)

### Stream: Foundation Envelope Model And Projection
11. [DONE] Add `packages/core/src/workflow/foundation-envelope/foundation-envelope-model.ts`, `packages/core/src/workflow/foundation-envelope/foundation-envelope-markdown-parser.ts`, and `doc/TODO/todo-plan.md`; scope: define the FE visual domain model and a compatibility parser for the current markdown/table shape plus the new projection-friendly fields; expected commit message: `feat(core): parse foundation envelope model`
12. [DONE] Git Commit: `feat(core): parse foundation envelope model` (hash: `269ddf5be`)
13. [DONE] Add `src/client/project-manager/components/foundation-envelope/foundation-envelope-react-flow.types.ts`, `src/client/project-manager/components/foundation-envelope/foundation-envelope-to-react-flow.ts`, and `doc/TODO/todo-plan.md`; scope: project `Application Root`, `Shared Zones`, `Product Parts`, and `Integration Seams` into React Flow nodes/edges with technology-status badges; expected commit message: `feat(pm): project foundation envelope graph`
14. [TODO] Git Commit: `feat(pm): project foundation envelope graph` (hash: TBD)

### Stream: PM Rendering And Persistence
15. [TODO] Update `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, and `doc/TODO/todo-plan.md`; scope: support FE sidecar persistence, stage-specific repair copy, and shared scaffold behavior for `foundation_envelope`; expected commit message: `feat(pm): persist foundation envelope layout`
16. [TODO] Git Commit: `feat(pm): persist foundation envelope layout` (hash: TBD)
17. [TODO] Update `src/client/project-manager/components/foundation-envelope/foundation-envelope-panel.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, and `doc/TODO/todo-plan.md`; scope: switch `Foundation Envelope` `Artifacts` from raw markdown view to diagram-first rendering with help fallback when the semantic artifact is missing; expected commit message: `feat(pm): render foundation envelope diagram`
18. [TODO] Git Commit: `feat(pm): render foundation envelope diagram` (hash: TBD)

### Stream: Regression Coverage And Verification
19. [TODO] Update `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`, and `doc/TODO/todo-plan.md`; scope: cover FE flow-sidecar path resolution and workspace artifact upsert behavior; expected commit message: `test(core): cover foundation envelope flow artifact`
20. [TODO] Git Commit: `test(core): cover foundation envelope flow artifact` (hash: TBD)
21. [TODO] Update `src/client/project-manager/components/foundation-envelope/foundation-envelope-localization.test.ts`, `src/client/project-manager/components/layout/foundation-envelope-tree-parity.test.ts`, and `doc/TODO/todo-plan.md`; scope: keep FE help/tree wiring aligned while the diagram becomes the default `Artifacts` surface; expected commit message: `test(pm): keep foundation envelope panel parity`
22. [TODO] Git Commit: `test(pm): keep foundation envelope panel parity` (hash: TBD)
23. [TODO] Run `npm run build --workspace=@codeai-hub/core`, `npm run build:webview`, `npm run typecheck:webview`, and update `doc/TODO/todo-plan.md`; scope: targeted verification for FE visual projection across core + PM/webview surfaces before scope closeout; expected commit message: `test(pm): verify foundation envelope visual projection`
24. [TODO] Git Commit: `test(pm): verify foundation envelope visual projection` (hash: TBD)

### Stream: Release Build And Scope Closeout
25. [TODO] Update `README.md`, `CHANGELOG.md`, and `doc/TODO/todo-plan.md`; scope: synchronize release-facing documents before the final release build for the FE visual projection wave; expected commit message: `docs(release): sync foundation envelope visual projection docs`
26. [TODO] Git Commit: `docs(release): sync foundation envelope visual projection docs` (hash: TBD)
27. [TODO] Update `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, and `doc/TODO/todo-plan.md`; scope: synchronize canonical SSOT documents before release packaging so shipped behavior and docs stay aligned; expected commit message: `docs(ssot): sync foundation envelope visual projection release contract`
28. [TODO] Git Commit: `docs(ssot): sync foundation envelope visual projection release contract` (hash: TBD)
29. [TODO] Run `./scripts/build-all.sh` and update `doc/TODO/todo-plan.md`; scope: execute the mandatory release build pipeline, allow version/materialization updates, and record the result before final packaging; expected commit message: `build(release): cut foundation envelope visual projection artifacts`
30. [TODO] Git Commit: `build(release): cut foundation envelope visual projection artifacts` (hash: TBD)
31. [TODO] Run `./scripts/build-release.sh --use-current-version` and update `doc/TODO/todo-plan.md`; scope: package the final VSIX from a clean tree and confirm the release checklist passes for this scope; expected commit message: `build(release): package foundation envelope visual projection`
32. [TODO] Git Commit: `build(release): package foundation envelope visual projection` (hash: TBD)
33. [TODO] Archive the completed execution cycle in `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, and `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: close the FE visual projection scope only after release artifacts are built, packaged, and validated; expected commit message: `docs(closeout): archive foundation envelope visual projection scope`
34. [TODO] Git Commit: `docs(closeout): archive foundation envelope visual projection scope` (hash: TBD)

# Development TODO Plan

## Execution Rules
- Required reading before each fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Claude_Thinking_Message_Classification_Fix.md`
- Keep each micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before release handoff, run targeted builds/tests for touched packages, then `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Claude Thinking Message Classification (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
1. [DONE] Record the provider-native classification bug where Claude `thinking -> text -> tool_use` is split into `Thinking -> Assistant`; scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Thinking_Message_Classification_Fix.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define claude thinking classification scope`
2. [DONE] Git Commit: `docs(plan): define claude thinking classification scope` (hash: `f544ba79`)

### Stream: Claude Router Classification
3. [DONE] Reclassify same-message Claude pre-tool text as `thinking` when the provider-native message already emitted `thinking`; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/claude-thinking-dialog-emitter.ts`, `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`; expected commit: `fix(claude): classify thinking continuations correctly`
4. [DONE] Git Commit: `fix(claude): classify thinking continuations correctly` (hash: `69c6e71f`)

### Stream: PM Help Color Release Tail
5. [DONE] Update Project Manager help/spravka text color to `rgba(100, 130, 155, 1)` while keeping the current size/weight contract; scope: `packages/ui/project-manager/styles.css`, `doc/TODO/todo-plan.md`; expected commit: `style(pm): retune help text color`
6. [DONE] Git Commit: `style(pm): retune help text color` (hash: `02dda079`)

### Stream: Release Docs And Packaging
7. [DONE] Sync release notes for the PM help-color patch release; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prepare pm help color patch notes`
8. [DONE] Git Commit: `docs(release): prepare pm help color patch notes` (hash: `fc36f68c`)
9. [DONE] Build and package the release after all active streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble pm help color patch release`
10. [DONE] Git Commit: `build(release): assemble pm help color patch release` (hash: `8fe5a2a9`)
11. [DONE] Record the session report after packaging; scope: `doc/Sessions/Session035.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record pm help color patch release`
12. [TODO] Git Commit: `docs(session): record pm help color patch release` (hash: TBD)

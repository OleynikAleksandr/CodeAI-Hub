# Development TODO Plan

## Execution Rules
- Required reading before each fix:
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Claude_Thinking_Translation_And_Display_Architecture.md`
- Keep each implementation micro-task within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs in real time when logic or architecture changes.
- Before release handoff, run targeted builds/tests for touched packages, then `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.

## Phase 1 — Claude Thinking Translation Reliability (owner: Codex, updated: 2026-04-04)

### Stream: Planning Intake
1. [DONE] Create approved planning doc for Claude long-thinking translation and display chunking; scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Thinking_Translation_And_Display_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): define claude thinking translation scope`
2. [DONE] Git Commit: `docs(plan): define claude thinking translation scope` (hash: `dc3a2019`)

### Stream: Claude Thinking Translation And Display
3. [DONE] Implement chunked Claude reasoning translation, readable dialog chunk emission, and localized pre-tool assistant progress text; scope: `packages/Claude_Module/src/messaging/*`, `packages/Claude_Module/src/types/index.ts`; expected commit: `fix(claude): localize and chunk visible thinking`
4. [DONE] Git Commit: `fix(claude): localize and chunk visible thinking` (hash: `68db1998`)

### Stream: PM Help Style Release Tail
5. [DONE] Land the requested Project Manager help-text visual tweak in the release train; scope: `packages/ui/project-manager/styles.css`; expected commit: `style(pm): refine help text presentation`
6. [DONE] Git Commit: `style(pm): refine help text presentation` (hash: `18818f28`)

### Stream: Release Docs And Packaging
7. [TODO] Sync architecture and active execution docs for the Claude thinking fix release; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): sync claude thinking translation ssot`
8. [TODO] Git Commit: `docs(architecture): sync claude thinking translation ssot` (hash: TBD)
9. [TODO] Sync release notes and session report for the Claude thinking fix release; scope: `README.md`, `CHANGELOG.md`, `doc/Sessions/Session034.md`; expected commit: `docs(session): record claude thinking translation release`
10. [TODO] Git Commit: `docs(session): record claude thinking translation release` (hash: TBD)
11. [TODO] Build and package the release after all streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble claude thinking translation fix release`
12. [TODO] Git Commit: `build(release): assemble claude thinking translation fix release` (hash: TBD)

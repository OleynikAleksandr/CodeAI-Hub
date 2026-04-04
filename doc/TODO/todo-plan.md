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
2. [TODO] Git Commit: `docs(plan): define claude thinking translation scope` (hash: TBD)

### Stream: Translation Chunking
3. [TODO] Implement chunked Claude reasoning translation for long text; scope: `packages/Claude_Module/src/messaging/claude-thought-translation-adapter.ts`, `packages/Claude_Module/src/messaging/claude-thought-translation-adapter.test.ts`; expected commit: `fix(claude): chunk long thinking translation`
4. [TODO] Git Commit: `fix(claude): chunk long thinking translation` (hash: TBD)

### Stream: Thinking Display Chunking
5. [TODO] Emit Claude visible thinking in readable dialog chunks; scope: `packages/Claude_Module/src/messaging/claude-stream-event-router.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`; expected commit: `fix(claude): chunk visible thinking bubbles`
6. [TODO] Git Commit: `fix(claude): chunk visible thinking bubbles` (hash: TBD)

### Stream: PM Help Style Release Tail
7. [TODO] Land the requested Project Manager help-text visual tweak in the release train; scope: `packages/ui/project-manager/styles.css`; expected commit: `style(pm): refine help text presentation`
8. [TODO] Git Commit: `style(pm): refine help text presentation` (hash: TBD)

### Stream: Release Docs And Packaging
9. [TODO] Sync architecture/session/release docs for the Claude thinking fix release; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/Sessions/Session034.md`, `README.md`; expected commit: `docs(session): record claude thinking translation release`
10. [TODO] Git Commit: `docs(session): record claude thinking translation release` (hash: TBD)
11. [TODO] Build and package the release after all streams are green; scope: release scripts + versioned artifacts; expected commit: `build(release): assemble claude thinking translation fix release`
12. [TODO] Git Commit: `build(release): assemble claude thinking translation fix release` (hash: TBD)

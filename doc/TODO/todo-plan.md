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

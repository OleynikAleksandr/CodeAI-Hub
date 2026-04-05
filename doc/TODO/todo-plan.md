# Development TODO Plan

## Execution Rules
- **Required reading (read before each fix):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- This TODO Plan is organized into Phases and Streams. Each implementation item must stay within a micro-scope of no more than 3 edited files.
- Each implementation item must be followed by a separate `Git Commit:` item so commits cannot be skipped.
- If a planned item expands beyond 3 files, split the item before continuing.
- Quality gates run through Husky hooks on normal `git commit` / `git push`; manual reruns are diagnostic only unless the stream closeout requires a targeted build.
- Targeted verification is mandatory before stream or phase closeout, and release validation must end with a packaged VSIX.
- Real-time documentation updates are required whenever logic or architecture meaning changes.
- Phase closeout requires a clean working tree, `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, and session/report updates in the same execution cycle.
- After this TODO plan is fully closed, run the required Plans closeout review and archive the completed plan before restoring a placeholder `todo-plan.md`.

## Phase 1 — Codex Empty Terminal Answer Hotfix (owner: Codex, updated: 2026-04-05)

### Stream: Scope And Intake
1. [DONE] Create the planning intake for the Codex empty-terminal-answer bug and register it in `doc/SolidWorks-WorkFlow/Docs_Index.md` (scope: `doc/SolidWorks-WorkFlow/Plans/Codex_EmptyTerminalAnswer_Recovery_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(plans): add codex empty terminal answer recovery scope`)
2. [DONE] Git Commit: `docs(plans): add codex empty terminal answer recovery scope` (hash: `e543d2a27`)
3. [DONE] Replace the placeholder `doc/TODO/todo-plan.md` with the sliced execution plan for this hotfix, including a dedicated release stream (scope: `doc/TODO/todo-plan.md`; expected commit: `docs(todo): slice codex empty terminal answer hotfix plan`)
4. [DONE] Git Commit: `docs(todo): slice codex empty terminal answer hotfix plan` (hash: `890f9b5e1`)

### Stream: Codex Turn Recovery
1. [DONE] Add a narrow Codex router fallback that preserves a substantive assistant candidate when a later reasoning tail is followed by an empty terminal assistant completion (scope: `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`; expected commit: `fix(codex): preserve substantive assistant on empty terminal turn`)
2. [DONE] Git Commit: `fix(codex): preserve substantive assistant on empty terminal turn` (hash: `c9ee21491`)
3. [DONE] Add a regression test for the observed sequence `substantive agent_message -> reasoning tail -> progress check -> empty terminal agent_message` (scope: `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit: `test(codex): cover empty terminal assistant recovery`)
4. [TODO] Git Commit: `test(codex): cover empty terminal assistant recovery` (hash: TBD)

### Stream: Verification And Release
1. [TODO] Run targeted verification for the Codex messaging hotfix and confirm the affected package build is green (scope: `packages/Codex_Module`; expected commit: no code commit, verification only)
2. [TODO] Update session/release documentation and archive/close this execution plan after the hotfix is packaged (scope: `doc/Sessions/Session047.md`, `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`; expected commit: `docs(session): record codex empty terminal answer hotfix release`)
3. [TODO] Git Commit: `docs(session): record codex empty terminal answer hotfix release` (hash: TBD)
4. [TODO] Run the release stream: `./scripts/build-all.sh` followed by `./scripts/build-release.sh --use-current-version`, collect the new VSIX and fresh release artifacts for user verification (scope: release artifacts / packaged runtime; expected commit: versioning artifacts included in the release closeout commit)

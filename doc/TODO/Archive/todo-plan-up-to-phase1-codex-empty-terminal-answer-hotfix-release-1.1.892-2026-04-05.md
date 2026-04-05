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
3. [DONE] Add regression coverage for the observed sequence `substantive agent_message -> reasoning tail -> progress check -> empty terminal agent_message`, splitting the dedicated empty-terminal case into its own test file to preserve the micro-file-size guard (scope: `packages/Codex_Module/src/messaging/message-processor.test.ts`, `packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts`; expected commit: `test(codex): cover empty terminal assistant recovery`)
4. [DONE] Git Commit: `test(codex): cover empty terminal assistant recovery` (hash: `3d5a4fa2c`)

### Stream: Verification And Release
1. [DONE] Run targeted verification for the Codex messaging hotfix and confirm the affected package build is green (scope: `packages/Codex_Module`; results: PASS (`npx tsx --test packages/Codex_Module/src/messaging/message-processor.test.ts packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts`, `npm run build --workspace @codeai-hub/codex-module`); expected commit: no code commit, verification only)
2. [DONE] Prepare the `1.1.892` release metadata, changelog notes, and version-bumped manifests so the tree is clean for packaging (scope: `README.md`, `CHANGELOG.md`, release-generated version/manifest files, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare 1.1.892 hotfix packaging`)
3. [DONE] Git Commit: `chore(release): prepare 1.1.892 hotfix packaging` (hash: `5949b0388`)
4. [DONE] Run the release stream: `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, collect the new VSIX and fresh release artifacts for user verification (scope: release artifacts / packaged runtime; results: PASS (`./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`), packaged artifact `codeai-hub-1.1.892.vsix`, fresh tarballs present in `doc/tmp/releases/`, release markers confirmed (`Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`), advisory broken links remain in `doc/Sessions/Session040.md` and `doc/Sessions/Session041.md`; expected commit: no code commit, packaging only)
5. [DONE] Move the completed hotfix planning intake into `Plans/Archive`, update `doc/SolidWorks-WorkFlow/Docs_Index.md`, and keep this execution plan open until the archive move is committed (scope: `doc/SolidWorks-WorkFlow/Plans/Codex_EmptyTerminalAnswer_Recovery_Architecture.md` -> `doc/SolidWorks-WorkFlow/Plans/Archive/Codex_EmptyTerminalAnswer_Recovery_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plans): archive codex empty terminal answer recovery scope`)
6. [DONE] Git Commit: `docs(plans): archive codex empty terminal answer recovery scope` (hash: `f74bc8695`)
7. [DONE] Archive the completed TODO, restore the active placeholder, and record `doc/Sessions/Session047.md` after the planning-doc archive move is committed (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-up-to-phase1-codex-empty-terminal-answer-hotfix-release-1.1.892-2026-04-05.md`, `doc/Sessions/Session047.md`; expected commit: `docs(session): record codex empty terminal answer hotfix release`)
8. [DONE] Git Commit: `docs(session): record codex empty terminal answer hotfix release` (hash: TBD)

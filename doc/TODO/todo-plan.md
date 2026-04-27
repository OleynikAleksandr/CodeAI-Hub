# Development TODO Plan

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Provider_SDK_Logs_Removal_Refactor_1.2.94.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Plans/Provider_SDK_Logs_Removal_Refactor_1.2.94.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Modules/Gemini.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the context source for the current execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Every task must touch no more than 3 files. If implementation proves wider, split the task before editing.
- Every implementation task is followed by a separate `Git Commit` item.
- Do not bypass Husky hooks or quality gates.
- Do not manually edit package versions; release scripts own version bumps.
- Keep docs synchronized in the same commit when logic changes.

## Phase 1 - Codex Runtime Cutout (owner: Codex, updated: 2026-04-27)

### Stream: Remove Codex SDK transport logger path

1. [TODO] Remove the Codex no-op SDK logger from runtime construction and calls; scope: `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-session-logger.ts`, `packages/Codex_AppServer_Module/src/app-server/process/codex-app-server-process.test.ts`; expected commit message: `fix: remove codex sdk transport logger`
2. [TODO] Git Commit: `fix: remove codex sdk transport logger` (hash: TBD)

## Phase 2 - Claude SDK Log Removal (owner: Codex, updated: 2026-04-27)

### Stream: Remove Claude file-backed SDK logger

3. [TODO] Stop Claude runtime from constructing SDK file loggers; scope: `packages/Claude_Module/src/session/session-manager.ts`, `packages/Claude_Module/src/sdk/claude-sdk-manager.ts`; expected commit message: `fix: stop creating claude sdk loggers`
4. [TODO] Git Commit: `fix: stop creating claude sdk loggers` (hash: TBD)
5. [TODO] Remove Claude logger calls from runtime processing; scope: `packages/Claude_Module/src/session/types.ts`, `packages/Claude_Module/src/session/session-manager.ts`, `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `fix: remove claude sdk logger runtime surface`
6. [TODO] Git Commit: `fix: remove claude sdk logger runtime surface` (hash: TBD)
7. [TODO] Delete Claude SDK logger implementation and direct logger tests; scope: `packages/Claude_Module/src/logging/sdk-session-logger.ts`, `packages/Claude_Module/src/logging/sdk-session-logger.test.ts`, `packages/Claude_Module/src/messaging/message-processor.test.ts`; expected commit message: `test: remove claude sdk logger tests`
8. [TODO] Git Commit: `test: remove claude sdk logger tests` (hash: TBD)
9. [TODO] Remove remaining Claude test logger mocks if TypeScript still references the removed logger surface; scope: `packages/Claude_Module/src/messaging/message-processor.stop.test.ts`, `packages/Claude_Module/src/messaging/message-processor.translation.test.ts`, `packages/Claude_Module/src/messaging/message-processor.pretool-thinking.translation.test.ts`; expected commit message: `test: clean claude message processor logger mocks`
10. [TODO] Git Commit: `test: clean claude message processor logger mocks` (hash: TBD)

## Phase 3 - Gemini SDK Log Removal (owner: Codex, updated: 2026-04-27)

### Stream: Remove Gemini raw session logger

11. [TODO] Stop Gemini runtime from constructing raw SDK session loggers; scope: `packages/Gemini_Module/src/provider/gemini-provider-adapter.ts`; expected commit message: `fix: stop creating gemini sdk loggers`
12. [TODO] Git Commit: `fix: stop creating gemini sdk loggers` (hash: TBD)
13. [TODO] Remove Gemini logger lifecycle and user-input calls from session management; scope: `packages/Gemini_Module/src/session/gemini-session-manager.ts`, `packages/Gemini_Module/src/session/gemini-session-store.ts`, `packages/Gemini_Module/src/session/gemini-session-lifecycle.ts`; expected commit message: `fix: remove gemini session logger lifecycle`
14. [TODO] Git Commit: `fix: remove gemini session logger lifecycle` (hash: TBD)
15. [TODO] Remove Gemini logger calls from turn/tool/assistant processing; scope: `packages/Gemini_Module/src/session/gemini-tool-call-orchestrator.ts`, `packages/Gemini_Module/src/messaging/message-processor.ts`, `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.ts`; expected commit message: `fix: remove gemini raw event logger calls`
16. [TODO] Git Commit: `fix: remove gemini raw event logger calls` (hash: TBD)
17. [TODO] Remove Gemini logger calls from system normalization and direct logger mocks; scope: `packages/Gemini_Module/src/messaging/gemini-system-event-normalizer.ts`, `packages/Gemini_Module/src/messaging/message-processor.test.ts`, `packages/Gemini_Module/src/messaging/gemini-assistant-event-normalizer.inline-thought.test.ts`; expected commit message: `test: clean gemini logger mocks`
18. [TODO] Git Commit: `test: clean gemini logger mocks` (hash: TBD)
19. [TODO] Delete Gemini logger implementation and option/type threading; scope: `packages/Gemini_Module/src/logging/session-logger.ts`, `packages/Gemini_Module/src/session/types.ts`, `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts`; expected commit message: `fix: remove gemini sdk logger type surface`
20. [TODO] Git Commit: `fix: remove gemini sdk logger type surface` (hash: TBD)

## Phase 4 - Documentation And Verification (owner: Codex, updated: 2026-04-27)

### Stream: Update SSOT and release

21. [TODO] Update provider module SSOT docs to state that provider SDK/raw logs under `~/.codeai-hub/logs/{claude,codex,gemini}` are removed, not disabled; scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Modules/Gemini.md`; expected commit message: `docs: record provider sdk log removal`
22. [TODO] Git Commit: `docs: record provider sdk log removal` (hash: TBD)
23. [TODO] Update system/contracts/index docs and run targeted provider builds; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/Codex_ResponseMode_Settings_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs: update provider diagnostics contract`
24. [TODO] Git Commit: `docs: update provider diagnostics contract` (hash: TBD)
25. [TODO] Run cleanup verification query and targeted provider builds, then record results in this plan; scope: provider package build commands, `doc/TODO/todo-plan.md`; expected commit message: `test: verify provider sdk log removal`
26. [TODO] Git Commit: `test: verify provider sdk log removal` (hash: TBD)
27. [TODO] Prepare release docs for the next version before build-all; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare provider sdk log removal release`
28. [TODO] Git Commit: `docs: prepare provider sdk log removal release` (hash: TBD)
29. [TODO] Build release with normal version bump; scope: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, `doc/tmp/releases/`; expected commit message: `chore: build provider sdk log removal release`
30. [TODO] Git Commit: `chore: build provider sdk log removal release` (hash: TBD)

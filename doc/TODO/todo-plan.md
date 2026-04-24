# Development TODO Plan

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_Codex_Turn_Context_Hotfix_1.2.67.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Only this list is the document source for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Each implementation task touches no more than 3 files.
- Each implementation task is followed by a separate `Git Commit` item.
- Targeted verification is required before closing the stream.

## Phase 1 — Codex Native Capture Turn Context Hotfix (owner: Codex, updated: 2026-04-24)

### Stream: Planning
1. [DONE] Create hotfix planning doc and active TODO plan (scope: `doc/SolidWorks-WorkFlow/Plans/Native_Request_Capture_Codex_Turn_Context_Hotfix_1.2.67.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan codex native capture turn context hotfix`)
2. [DONE] Git Commit: `docs: plan codex native capture turn context hotfix` (hash: `a5d758f9f`)

### Stream: Core Capture Artifacts
3. [DONE] Split native capture Markdown formatting out of the near-limit writer (scope: `packages/core/src/provider-network-capture/native-request-capture-writer.ts`, `packages/core/src/provider-network-capture/native-request-capture-markdown.ts`, `doc/TODO/todo-plan.md`; commit: `refactor: split native capture markdown formatting`)
4. [DONE] Git Commit: `refactor: split native capture markdown formatting` (hash: `047a07981`)
5. [DONE] Add provider diagnostic context writer persistence (scope: `packages/core/src/provider-network-capture/native-request-capture-markdown.ts`, `packages/core/src/provider-network-capture/native-request-capture-writer.ts`, `packages/core/src/provider-network-capture/native-request-capture-writer.test.ts`; commit: `feat: record provider diagnostic context in native capture`)
6. [DONE] Git Commit: `feat: record provider diagnostic context in native capture` (hash: `837ffcbc7`)
7. [DONE] Wire diagnostic context callback through the capture facade (scope: `packages/core/src/provider-registry/provider-module-loader.types.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.ts`, `packages/core/src/provider-network-capture/native-request-capture-facade.test.ts`; commit: `feat: wire native capture diagnostic context callback`)
8. [DONE] Git Commit: `feat: wire native capture diagnostic context callback` (hash: `0d34249bf`)

### Stream: Codex App Server Diagnostics
9. [IN_PROGRESS] Record Codex app-server thread and turn payloads during diagnostic capture (scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`; commit: `feat: include codex app-server turn payload in capture`)
10. [TODO] Git Commit: `feat: include codex app-server turn payload in capture` (hash: TBD)

### Stream: Documentation And Verification
11. [TODO] Sync SSOT docs for Codex native capture context (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: document codex native capture turn context`)
12. [TODO] Git Commit: `docs: document codex native capture turn context` (hash: TBD)
13. [TODO] Run targeted verification for Core/Codex capture diagnostics (scope: `packages/core`, `packages/Codex_AppServer_Module`; commit: no commit expected unless fixes are needed)
14. [TODO] Closeout scope, archive planning/TODO, and decide release packaging (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/`; commit: `docs: close codex native capture turn context hotfix`)
15. [TODO] Git Commit: `docs: close codex native capture turn context hotfix` (hash: TBD)

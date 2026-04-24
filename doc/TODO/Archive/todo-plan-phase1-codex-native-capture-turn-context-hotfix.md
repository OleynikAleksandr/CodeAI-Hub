# Development TODO Plan

**Execution Scope Status:** COMPLETED
**Scope:** Codex Native Capture Turn Context Hotfix
**Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_Codex_Turn_Context_Hotfix_1.2.67.md`
**Target release:** `1.2.67`

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Native_Request_Capture_Codex_Turn_Context_Hotfix_1.2.67.md`
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
9. [DONE] Record Codex app-server thread and turn payloads during diagnostic capture (scope: `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.ts`, `packages/Codex_AppServer_Module/src/diagnostics/codex-native-request-capture-service.test.ts`; commit: `feat: include codex app-server turn payload in capture`)
10. [DONE] Git Commit: `feat: include codex app-server turn payload in capture` (hash: `69fda6ccd`)

### Stream: Documentation And Verification
11. [DONE] Sync SSOT docs for Codex native capture context (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Modules/Codex.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; commit: `docs: document codex native capture turn context`)
12. [DONE] Git Commit: `docs: document codex native capture turn context` (hash: `4d8681d9f`)
13. [DONE] Run targeted verification for Core/Codex capture diagnostics (scope: `packages/core`, `packages/Codex_AppServer_Module`; result: `npm run build --workspace @codeai-hub/codex-app-server-module`, `npm run build --workspace @codeai-hub/core`, `node --test packages/core/dist/provider-network-capture/native-request-capture-writer.test.js packages/core/dist/provider-network-capture/native-request-capture-facade.test.js packages/core/dist/provider-network-capture/native-request-capture-websocket.test.js`, `node --test packages/Codex_AppServer_Module/dist/diagnostics/codex-native-request-capture-service.test.js`; note: initial parallel Core/Codex build raced on Codex dist cleanup, sequential rerun passed; commit: no commit expected unless fixes are needed)
14. [DONE] Prepare release docs for `1.2.67` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare codex native capture context release`)
15. [DONE] Git Commit: `docs: prepare codex native capture context release` (hash: `12ff3b636`)
16. [DONE] Build release `1.2.67` with `./scripts/build-all.sh` and `./scripts/build-release.sh --use-current-version` (scope: release scripts/package artifacts; result: `./scripts/build-all.sh` passed, `./scripts/build-release.sh --use-current-version` passed, VSIX `codeai-hub-1.2.67.vsix`; commit: `chore: build codex native capture context release assets`)
17. [DONE] Git Commit: `chore: build codex native capture context release assets` (hash: `64a62f0ee`)
18. [DONE] Closeout scope, archive planning/TODO, and create session report (scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/`, `doc/Sessions/`; commit: `docs: close codex native capture turn context hotfix`)
19. [DONE] Git Commit: `docs: close codex native capture turn context hotfix` (hash: TBD)

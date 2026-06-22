# Plan Closeout: standalone-workspace-chats-release-1.2.566-2026-06-21

**Created:** 2026-06-22T08:17:49.849Z
**Acceptance:** User retested 1.2.579, confirmed the remaining white close flash is deferred, and explicitly requested closing this topic/session and pushing the release to GitHub.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** phase1.stream59.task1
**Expected Commit:** docs: close standalone chat release scope
**Last Recorded Commit:** self
**Planning Source Disposition:** already_archived
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "standalone-workspace-chats-release-1.2.566-2026-06-21",
  "branch": "main",
  "baseHead": "5a5259c00",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md",
  "currentTaskId": "phase1.stream59.task1",
  "expectedCommitMessage": "docs: close standalone chat release scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md`
- **Read this context before implementation:**
  - `AGENTS.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/Standalone_Workspace_Chats_Planning.md`
- Only this list is the recovery context for this execution cycle.

## Execution Rules
- **Required reading before every fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Keep each task scoped to no more than 3 files or packages.
- Each implementation task is followed by a separate `Git Commit: ...` line.
- Run `npm run plan:validate` before every `npm run plan:commit -- "<Expected Commit>"`.
- User explicitly requested a new release build on 2026-06-21; this satisfies the Release Build Confirmation Gate.

## Phase 1 - Release 1.2.566 / 1.2.568 Repair (owner: Codex, updated: 2026-06-21)
### Stream: Release Plan Setup
1. [DONE] `phase1.stream1.task1` Create the active release execution plan for standalone workspace chats (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: start standalone chat release 1.2.566`).
2. [DONE] `phase1.stream1.commit1` Git Commit: `docs: start standalone chat release 1.2.566` (hash: self)

### Stream: Release Metadata
3. [DONE] `phase1.stream2.task1` Update README Current Release and CHANGELOG for version 1.2.566 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.566`).
   - Evidence 2026-06-21: README Current Release and CHANGELOG now describe standalone workspace chats for `1.2.566`.
4. [DONE] `phase1.stream2.commit1` Git Commit: `docs: prepare release 1.2.566` (hash: self)

### Stream: Release Build
5. [DONE] `phase1.stream3.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.566`).
   - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.566`.
   - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including SDK exclusions, local artefact validation, markdown links, production dependency pruning, VSIX runtime package surface verification, and package creation.
   - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.566.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
6. [DONE] `phase1.stream3.commit1` Git Commit: `chore: release 1.2.566` (hash: self)

### Stream: User Visual Acceptance Testing
7. [DONE] `phase1.stream4.task1` User installs and retests `codeai-hub-1.2.566.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
   - Evidence 2026-06-21: user confirmed the main Workflow/Chat behavior works, but found duplicate/extra rows in the Chat list after creating another standalone chat.

### Stream: Chat List Retest Bugfix
8. [DONE] `phase1.stream5.task1` Deduplicate standalone chat list rows by ignoring translation overlay logs, merging live sessions with history by both `session.id` and `providerSessionId`, and filtering live sessions to the selected workspace (scope: `packages/core/src/unified-session/standalone-workspace-chat-list.ts, packages/core/src/unified-session/standalone-workspace-chat-list.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: deduplicate standalone chat list`).
   - Evidence 2026-06-21: `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts` PASS.
   - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
   - Evidence 2026-06-21: regression coverage includes translation overlay rows, live/history alias rows, and renamed-history rows that previously opened an empty resumed session instead of the live chat.
9. [DONE] `phase1.stream5.commit1` Git Commit: `fix: deduplicate standalone chat list` (hash: self)

### Stream: Release Rebuild Confirmation
10. [DONE] `phase1.stream6.task1` After the fix is committed, request explicit user confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
   - Evidence 2026-06-21: user explicitly confirmed rebuilding a new release candidate after the standalone chat list bugfix.

### Stream: Release Metadata 1.2.567
11. [DONE] `phase1.stream7.task1` Update README Current Release and CHANGELOG for version 1.2.567 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.567`).
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe standalone chat list dedupe repair for `1.2.567`.
12. [DONE] `phase1.stream7.commit1` Git Commit: `docs: prepare release 1.2.567` (hash: self)

### Stream: Release Build 1.2.567
13. [DONE] `phase1.stream8.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.567`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.567`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including SDK exclusions, local artefact validation, markdown links, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.567.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
14. [DONE] `phase1.stream8.commit1` Git Commit: `chore: release 1.2.567` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.567
15. [DONE] `phase1.stream9.task1` User installs and retests `codeai-hub-1.2.567.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user confirmed duplicate standalone chat rows are fixed, then reported immediate rename refresh, new-chat auto-open, card meta text, and right-click rename/delete follow-up issues.

### Stream: Standalone Chat Row Actions
16. [DONE] `phase1.stream10.task1` Add Core support for standalone chat custom titles and history deletion without renaming provider session files (scope: `packages/core/src/unified-session/standalone-workspace-chat-list.ts, packages/core/src/unified-session/standalone-workspace-chat-list.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: add standalone chat rename delete actions`).
    - Evidence 2026-06-21: `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts` PASS with custom title and delete sidecar coverage.
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
17. [DONE] `phase1.stream10.commit1` Git Commit: `fix: add standalone chat rename delete actions` (hash: self)
18. [DONE] `phase1.stream11.task1` Expose standalone chat rename/delete HTTP actions and fix Project Manager chat list refresh, auto-open, meta text, and context menu behavior (scope: `packages/core/src/remote-bridge/handlers/http-api-session-routes.ts, src/client/project-manager/components/layout/workspace-chat-list*.ts*, doc/TODO/todo-plan.md`; expected commit: `fix: wire standalone chat row actions`).
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
19. [DONE] `phase1.stream11.commit1` Git Commit: `fix: wire standalone chat row actions` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.568
20. [DONE] `phase1.stream12.task1` After the follow-up fixes are committed, request explicit user confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user explicitly confirmed building a new release after the follow-up standalone chat row fixes.

### Stream: Release Metadata 1.2.568
21. [DONE] `phase1.stream13.task1` Update README Current Release and CHANGELOG for version 1.2.568 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.568`).
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe standalone chat row actions and immediate refresh/open fixes for `1.2.568`.
22. [DONE] `phase1.stream13.commit1` Git Commit: `docs: prepare release 1.2.568` (hash: self)

### Stream: Release Build 1.2.568
23. [DONE] `phase1.stream14.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.568`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.568`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed and produced `codeai-hub-1.2.568.vsix`.
    - Evidence 2026-06-21: `unzip -t codeai-hub-1.2.568.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.568.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
24. [DONE] `phase1.stream14.commit1` Git Commit: `chore: release 1.2.568` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.568
25. [DONE] `phase1.stream15.task1` User installs and retests `codeai-hub-1.2.568.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user found two defects in `1.2.568`: new standalone chat auto-opens a blank white detached window until reopened from the list, and the Chat row context menu Rename path crashes Project Manager on macOS.

### Stream: 1.2.568 Retest Guardrail
26. [DONE] `phase1.stream16.task1` Record the Project Manager/CEF native dialog guardrail in the always-read project instructions (scope: `AGENTS.md, doc/TODO/todo-plan.md`; expected commit: `docs: record project manager cef dialog rule`).
27. [DONE] `phase1.stream16.commit1` Git Commit: `docs: record project manager cef dialog rule` (hash: self)

### Stream: 1.2.568 Retest Bugfix
28. [DONE] `phase1.stream17.task1` Fix standalone chat auto-open placeholder and replace native rename/delete dialogs with in-app menu/dialog state (scope: `src/client/project-manager/components/layout/workspace-chat-list*.ts*, packages/ui/project-manager/styles.css, doc/TODO/todo-plan.md`; expected commit: `fix: stabilize standalone chat launch actions`).
    - Evidence 2026-06-21: standalone chat placeholder now opens the Project Manager standalone shell URL instead of `about:blank` before switching to the real `sessionId`.
    - Evidence 2026-06-21: Chat row Rename/Delete no longer call native `window.prompt` or `window.confirm`; both actions use an in-app React menu/dialog.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
    - Evidence 2026-06-21: `rg "window\\.prompt|window\\.confirm|window\\.alert|prompt\\(|confirm\\(|alert\\(" src/client/project-manager packages/ui/project-manager -n` found no Project Manager native dialog usage.
29. [DONE] `phase1.stream17.commit1` Git Commit: `fix: stabilize standalone chat launch actions` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.569
30. [DONE] `phase1.stream18.task1` Add the required release rebuild confirmation gate after the `1.2.568` retest bugfix (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add 1.2.569 release confirmation gate`).
31. [DONE] `phase1.stream18.commit1` Git Commit: `docs: add 1.2.569 release confirmation gate` (hash: self)
32. [DONE] `phase1.stream19.task1` Ask the user for explicit confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none). Result: User explicitly confirmed building the next release candidate: 'И собери новый релиз.'

### Stream: Release Metadata 1.2.569
33. [DONE] `phase1.stream20.task1` Update README Current Release and CHANGELOG for version 1.2.569 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.569`).
    - Evidence 2026-06-21: user explicitly confirmed building a new release after the `1.2.568` retest fixes.
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe standalone chat launch stability and in-app row action dialogs for `1.2.569`.
34. [DONE] `phase1.stream20.commit1` Git Commit: `docs: prepare release 1.2.569` (hash: self)

### Stream: Release Build 1.2.569
35. [DONE] `phase1.stream21.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.569`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.569`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.569.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.569.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
36. [DONE] `phase1.stream21.commit1` Git Commit: `chore: release 1.2.569` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.569
37. [DONE] `phase1.stream22.task1` User installs and retests `codeai-hub-1.2.569.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user confirmed the detached window is no longer blank, but it stays on the pending "No active session" shell after New Chat until the window is closed and reopened from the chat list.

### Stream: 1.2.569 Pending Window Repair Intake
38. [DONE] `phase1.stream23.task1` Add a repair stream for the pending standalone chat window retest defect (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add pending standalone window repair`).
39. [DONE] `phase1.stream23.commit1` Git Commit: `docs: add pending standalone window repair` (hash: self)

### Stream: 1.2.569 Pending Window Bugfix
40. [DONE] `phase1.stream24.task1` Make pending standalone chat windows adopt the real session created by Core instead of relying on parent-driven popup navigation (scope: `src/client/project-manager/app.tsx, src/client/project-manager/components/layout/workspace-chat-list*.ts*, doc/TODO/todo-plan.md`; expected commit: `fix: adopt pending standalone chat session`).
    - Evidence 2026-06-21: pending standalone window URL now carries provider/session metadata and listens for repeated parent `postMessage` readiness events plus Core `session:created`.
    - Evidence 2026-06-21: pending standalone window renders a neutral "Creating chat session..." state and swaps to the real `sessionId` locally instead of relying on parent-driven `location.href`.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
41. [DONE] `phase1.stream24.commit1` Git Commit: `fix: adopt pending standalone chat session` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.570
42. [DONE] `phase1.stream25.task1` Ask the user for explicit confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: release build remains paused because user found another `1.2.569` retest defect: standalone chat Rename accepts the edit but the row title returns to the previous auto title.

### Stream: 1.2.569 Rename Persistence Repair Intake
43. [DONE] `phase1.stream26.task1` Add a repair stream for the standalone chat rename persistence retest defect (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add standalone chat rename persistence repair`).
44. [DONE] `phase1.stream26.commit1` Git Commit: `docs: add standalone chat rename persistence repair` (hash: self)

### Stream: 1.2.569 Rename Persistence Bugfix
45. [DONE] `phase1.stream27.task1` Make standalone chat list summaries expose the real history-backed session id after live/history alias merging so Rename/Delete target the visible chat history sidecars (scope: `packages/core/src/unified-session/standalone-workspace-chat-list.ts, packages/core/src/unified-session/standalone-workspace-chat-list.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: persist standalone chat rename over live refresh`).
    - Evidence 2026-06-21: live/history alias merge now keeps the history-backed `providerSessionId` when an existing history row is matched, so Rename/Delete target the visible chat history sidecars.
    - Evidence 2026-06-21: regression coverage renames a matched live/history alias row and verifies a fresh `listStandaloneWorkspaceChats` call keeps the custom title instead of returning to the auto title.
    - Evidence 2026-06-21: `node --test --import tsx packages/core/src/unified-session/standalone-workspace-chat-list.test.ts` PASS.
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
46. [DONE] `phase1.stream27.commit1` Git Commit: `fix: persist standalone chat rename over live refresh` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.570
47. [DONE] `phase1.stream28.task1` Ask the user for explicit confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user explicitly confirmed building the next release candidate after the rename persistence fix: "Исправишь? Собери новый релиз."

### Stream: Release Metadata 1.2.570
48. [DONE] `phase1.stream29.task1` Update README Current Release and CHANGELOG for version 1.2.570 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.570`).
49. [DONE] `phase1.stream29.commit1` Git Commit: `docs: prepare release 1.2.570` (hash: self)

### Stream: Release Build 1.2.570
50. [DONE] `phase1.stream30.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.570`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.570`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.570.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.570.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
51. [DONE] `phase1.stream30.commit1` Git Commit: `chore: release 1.2.570` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.570
52. [DONE] `phase1.stream31.task1` User installs and retests `codeai-hub-1.2.570.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user found the remaining standalone New Chat defect still present in `1.2.570`: the detached window opens but stays on "Creating chat session... Waiting for Core to attach this chat window."

### Stream: 1.2.570 Pending Window Attach Repair Intake
53. [DONE] `phase1.stream32.task1` Add a repair stream for the standalone New Chat pending window attach defect (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add standalone pending window attach repair`).
54. [DONE] `phase1.stream32.commit1` Git Commit: `docs: add standalone pending window attach repair` (hash: self)

### Stream: 1.2.570 Pending Window Attach Bugfix
55. [DONE] `phase1.stream33.task1` Make detached standalone pending windows adopt the created session from normalized Core events or workspace chat list polling instead of relying on parent postMessage only (scope: `src/client/project-manager/app.tsx, src/client/project-manager/standalone-session-resolver.ts, src/client/project-manager/standalone-session-resolver.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: attach standalone pending chat windows`).
    - Evidence 2026-06-21: detached standalone pending windows now normalize raw Core `session:created` payloads before matching, so `providerId/providerSessionId` events are accepted as `providerIds/binding`.
    - Evidence 2026-06-21: pending windows also poll `/api/v1/standalone-chats` and adopt the matching `liveSessionId`, so the UI no longer depends on cross-window `postMessage` delivery.
    - Evidence 2026-06-21: `node --test --import tsx src/client/project-manager/standalone-session-resolver.test.ts` PASS.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
56. [DONE] `phase1.stream33.commit1` Git Commit: `fix: attach standalone pending chat windows` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.571
57. [DONE] `phase1.stream34.task1` Ask the user for explicit confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user explicitly confirmed building the next release candidate after the pending window attach fix: "Исправившись, собери новый релиз."

### Stream: Release Metadata 1.2.571
58. [DONE] `phase1.stream35.task1` Update README Current Release and CHANGELOG for version 1.2.571 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.571`).
59. [DONE] `phase1.stream35.commit1` Git Commit: `docs: prepare release 1.2.571` (hash: self)

### Stream: Release Build 1.2.571
60. [DONE] `phase1.stream36.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.571`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.571`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.571.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.571.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
61. [DONE] `phase1.stream36.commit1` Git Commit: `chore: release 1.2.571` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.571
62. [DONE] `phase1.stream37.task1` User installs and retests `codeai-hub-1.2.571.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user confirmed detached standalone chat session UI opens normally in `1.2.571`, then reported that Project Manager visibly refreshes when the detached chat sends or receives messages.

### Stream: 1.2.571 Detached Chat Refresh Isolation Repair Intake
63. [DONE] `phase1.stream38.task1` Add a repair stream for the detached standalone chat events refreshing the main Project Manager workflow UI (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add detached chat refresh isolation repair`).
64. [DONE] `phase1.stream38.commit1` Git Commit: `docs: add detached chat refresh isolation repair` (hash: self)

### Stream: 1.2.571 Local Provider Chunk Replay Repair Intake
65. [DONE] `phase1.stream39.task1` Add a repair stream for GLM and local-model standalone chat history replay showing each streamed assistant chunk as a separate UI card after reopening the session (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add local provider chunk replay repair`).
66. [DONE] `phase1.stream39.commit1` Git Commit: `docs: add local provider chunk replay repair` (hash: self)

### Stream: 1.2.571 Detached Chat Refresh Isolation Bugfix
67. [DONE] `phase1.stream40.task1` Add Core stream scope metadata so standalone chat events can be distinguished from workflow session events (scope: `packages/core/src/remote-bridge/session-stream-contracts.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`; expected commit: `fix: tag standalone chat stream events`).
    - Evidence 2026-06-21: Core `session:message` broadcasts now include the session workspace/stage/run/initiative scope for both visible user messages and provider messages.
    - Evidence 2026-06-21: `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts` PASS.
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
68. [DONE] `phase1.stream40.commit1` Git Commit: `fix: tag standalone chat stream events` (hash: self)
69. [DONE] `phase1.stream40.task2` Filter Project Manager workflow refresh and runtime session state updates away from standalone detached chat events (scope: `src/client/project-manager/components/layout/workflow-state-refresh-events.ts, src/client/project-manager/components/layout/workspace-chat-list.tsx, src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`; expected commit: `fix: ignore detached chat events in workflow panels`).
    - Evidence 2026-06-21: workflow-state refresh ignores standalone `session:message` scope events, so detached chat user turns no longer request workflow polling.
    - Evidence 2026-06-21: Project Manager runtime session panels now hydrate/adopt only sessions in the active view scope: current workflow stage for main PM, exact `visibleSessionId` for detached chat windows.
    - Evidence 2026-06-21: Chat sidebar refreshes only for standalone events in the selected workspace and uses silent reloads for stream updates.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `node --test --import tsx src/client/project-manager/components/layout/workflow-navigation.test.ts` PASS.
70. [DONE] `phase1.stream40.commit2` Git Commit: `fix: ignore detached chat events in workflow panels` (hash: self)

### Stream: 1.2.571 Local Provider Chunk Replay Bugfix
71. [DONE] `phase1.stream41.task1` Make replayed GLM/local-model assistant output coalesce persisted live chunks into one assistant turn instead of one UI card per chunk after reopening the session (scope: `packages/core/src/unified-session/storage.ts, packages/core/src/unified-session/live-message-coalescer.ts, packages/core/src/unified-session/storage.test.ts`; expected commit: `fix: coalesce local provider replay chunks`).
    - Evidence 2026-06-21: Core `readMessages()` now coalesces adjacent persisted assistant `tag: live` records before returning replay history, so existing GLM/local histories render as one assistant turn per response.
    - Evidence 2026-06-21: `node --test --import tsx packages/core/src/unified-session/storage.test.ts` PASS.
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check packages/core/src/unified-session/storage.ts packages/core/src/unified-session/live-message-coalescer.ts packages/core/src/unified-session/storage.test.ts` PASS.
72. [DONE] `phase1.stream41.commit1` Git Commit: `fix: coalesce local provider replay chunks` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.572
73. [DONE] `phase1.stream42.task1` User explicitly confirmed preparing and building the next release candidate after both `1.2.571` bugfixes (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user requested: "После того как добавишь, пожалуйста, исправь оба бага и собери новый релиз."

### Stream: Release Metadata 1.2.572
74. [DONE] `phase1.stream43.task1` Update README Current Release and CHANGELOG for version 1.2.572 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.572`).
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe detached standalone Chat refresh isolation and GLM/local replay chunk coalescing for `1.2.572`.
75. [DONE] `phase1.stream43.commit1` Git Commit: `docs: prepare release 1.2.572` (hash: self)

### Stream: Release Build 1.2.572
76. [DONE] `phase1.stream44.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.572`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.572`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.572.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.572.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
77. [DONE] `phase1.stream44.commit1` Git Commit: `chore: release 1.2.572` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.572
78. [DONE] `phase1.stream45.task1` User installs and retests `codeai-hub-1.2.572.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user confirmed Project Manager no longer refreshes from detached chat windows, but found detached session windows still affect each other: opening a new standalone session can make already-open detached session windows temporarily lose their interface/messages during load.
    - Evidence 2026-06-21: user also requested addressing the broader sharp UI refresh/flicker class where feasible, and explicitly requested a new release after fixes.

### Stream: 1.2.572 Detached Session Flicker Repair Intake
79. [DONE] `phase1.stream46.task1` Add a repair stream for detached session windows losing UI/messages when another standalone session opens (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add detached session flicker repair`).
80. [DONE] `phase1.stream46.commit1` Git Commit: `docs: add detached session flicker repair` (hash: self)

### Stream: 1.2.572 Detached Session Flicker Bugfix
81. [DONE] `phase1.stream47.task1` Scope detached session hydration and stream updates to the visible session without clearing the current snapshot during unrelated Core events (scope: `src/client/project-manager/components/sessions/status-hydrator.ts, src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx, src/client/project-manager/components/sessions/project-manager-session-view.test.tsx`; expected commit: `fix: isolate detached session refresh state`).
    - Evidence 2026-06-21: detached runtime session windows now keep their current session snapshot when `/api/v1/status` temporarily omits the visible standalone session.
    - Evidence 2026-06-21: `core:state` automatic rehydrate is disabled for runtime views scoped to an exact `visibleSessionId`, so unrelated standalone session creation does not clear already-open detached windows.
    - Evidence 2026-06-21: `node --test --import tsx src/client/project-manager/components/sessions/project-manager-session-view.test.tsx` PASS.
    - Evidence 2026-06-21: `npm run typecheck:webview` PASS.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `npm exec -- ultracite check` PASS.
82. [DONE] `phase1.stream47.commit1` Git Commit: `fix: isolate detached session refresh state` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.573
83. [DONE] `phase1.stream48.task1` User explicitly confirmed preparing and building the next release candidate after the detached session flicker fix (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user requested: "сделай, пожалуйста, такой стрим фиксов. Сделай фиксы и собери новый релиз."

### Stream: Release Metadata 1.2.573
84. [DONE] `phase1.stream49.task1` Update README Current Release and CHANGELOG for version 1.2.573 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.573`).
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe detached standalone Chat window isolation for `1.2.573`.
85. [DONE] `phase1.stream49.commit1` Git Commit: `docs: prepare release 1.2.573` (hash: self)

### Stream: Release Build 1.2.573
86. [DONE] `phase1.stream50.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.573`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.573`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.573.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.573.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
87. [DONE] `phase1.stream50.commit1` Git Commit: `chore: release 1.2.573` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.573
88. [DONE] `phase1.stream51.task1` User installs and retests `codeai-hub-1.2.573.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user confirmed new standalone session creation no longer clears already-open detached windows.
    - Evidence 2026-06-21: user found remaining white flashes when detached session windows open/close, and found standalone chats cannot be reopened after Core restart.
    - Evidence 2026-06-21: user explicitly requested repair streams, fixes, and a new release.

### Stream: 1.2.573 Restore and Window Flash Repair Intake
89. [DONE] `phase1.stream52.task1` Add repair streams for detached window white flash and standalone chat restore after Core restart (scope: `doc/TODO/todo-plan.md`; expected commit: `docs: add standalone restore and window flash repair`).
90. [DONE] `phase1.stream52.commit1` Git Commit: `docs: add standalone restore and window flash repair` (hash: self)

### Stream: 1.2.573 Detached Window Flash Bugfix
91. [DONE] `phase1.stream53.task1` Remove white default background flashes from detached Project Manager session windows during open/close (scope: `packages/ui/project-manager/index.html, packages/cef-launcher/src/launcher_app.cc, doc/TODO/todo-plan.md`; expected commit: `fix: remove detached window white flash`).
    - Evidence 2026-06-21: Project Manager HTML now paints the dark app background before deferred scripts/CSS load, removing the browser default white pre-paint.
    - Evidence 2026-06-21: CEF browser settings now use the same dark background color before the first rendered frame.
    - Evidence 2026-06-21: `npm run build:project-manager` PASS.
    - Evidence 2026-06-21: `./scripts/build-cef-launcher.sh --launcher-version 1.2.573` PASS.
92. [DONE] `phase1.stream53.commit1` Git Commit: `fix: remove detached window white flash` (hash: self)

### Stream: 1.2.573 Standalone Chat Restore Bugfix
93. [DONE] `phase1.stream54.task1` Make saved standalone chats reopen after Core restart by resolving persisted history into a live runtime session before opening the detached window (scope: `packages/core/src/remote-bridge/handlers/session-shell-factory.ts, packages/core/src/remote-bridge/handlers/session-shell-factory.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: restore standalone chats after core restart`).
    - Evidence 2026-06-21: standalone chat shell sessions no longer lock history to transient runtime session ids; workflow sessions still lock to continuity root ids.
    - Evidence 2026-06-21: bound standalone shells now promote persisted history to the provider session id, so saved chat rows can resume after Core restart through the existing `session:create` path.
    - Evidence 2026-06-21: `node --test --import tsx packages/core/src/remote-bridge/handlers/session-shell-factory.test.ts` PASS.
    - Evidence 2026-06-21: `npm run build --workspace @codeai-hub/core` PASS.
94. [DONE] `phase1.stream54.commit1` Git Commit: `fix: restore standalone chats after core restart` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.574
95. [DONE] `phase1.stream55.task1` User explicitly confirmed preparing and building the next release candidate after the restore and window flash fixes (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-21: user requested: "исправь это все и собери новый релиз."

### Stream: Release Metadata 1.2.574
96. [DONE] `phase1.stream56.task1` Update README Current Release and CHANGELOG for version 1.2.574 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.574`).
    - Evidence 2026-06-21: README Current Release and CHANGELOG now describe the detached window dark-background pre-paint fix and standalone chat provider-session restore fix for `1.2.574`.
97. [DONE] `phase1.stream56.commit1` Git Commit: `docs: prepare release 1.2.574` (hash: self)

### Stream: Release Build 1.2.574
98. [DONE] `phase1.stream57.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.574`).
    - Evidence 2026-06-21: `./scripts/build-all.sh` completed and prepared unified version `1.2.574`.
    - Evidence 2026-06-21: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, artefact validation, markdown link check, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-21: `unzip -tq codeai-hub-1.2.574.vsix` PASS.
    - Evidence 2026-06-21: VSIX ready at `codeai-hub-1.2.574.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
99. [DONE] `phase1.stream57.commit1` Git Commit: `chore: release 1.2.574` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.574
100. [DONE] `phase1.stream58.task1` User installs and retests `codeai-hub-1.2.574.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user confirmed the main `1.2.574` defects are fixed, but found first saved-chat open after Core restart stays on "Creating chat session..." until the window is closed and reopened.

### Stream: 1.2.574 First Restore Attach Bugfix
101. [DONE] `phase1.stream60.task1` Fix first post-restart open of a saved standalone chat so Core restore resolves to a real live session before opening the detached window (scope: `src/client/project-manager/components/layout/workspace-chat-list.tsx, src/client/project-manager/components/layout/workspace-chat-list-open.test.ts, doc/TODO/todo-plan.md`; expected commit: `fix: open restored standalone chats after core restart`).
102. [DONE] `phase1.stream60.commit1` Git Commit: `fix: open restored standalone chats after core restart` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.575
103. [DONE] `phase1.stream61.task1` After the first-restore attach fix is committed, request explicit user confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: release rebuild stayed paused because user reported the detached CEF window still flashes a white content background on open/close.

### Stream: 1.2.574 Detached CEF Window Paint Bugfix
104. [DONE] `phase1.stream62.task1` Paint detached CEF windows and browser views with the Project Manager dark background before the first visible frame (scope: `packages/cef-launcher/src/launcher*, assets/launcher/manifest.json, doc/TODO/todo-plan.md`; expected commit: `fix: paint cef detached windows before first frame`).
    - Evidence 2026-06-22: `CefWindow` primary background and `CefBrowserView` background are now set to the Project Manager dark color before `AddChildView()` and `Show()`, covering the native/CEF pre-paint frame visible as a white detached-window flash.
    - Evidence 2026-06-22: `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs` PASS.
    - Evidence 2026-06-22: `./scripts/build-cef-launcher.sh --launcher-version 1.2.574` PASS and rebuilt `CodeAIHubLauncher-macos-arm64-1.2.574.tar.bz2` in the local release/cache folders.
105. [DONE] `phase1.stream62.commit1` Git Commit: `fix: paint cef detached windows before first frame` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.575
106. [DONE] `phase1.stream63.task1` After the detached CEF paint fix is committed, request explicit user confirmation before preparing and building the next release candidate (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user explicitly confirmed building the next release candidate after the first-restore attach and detached CEF paint fixes: "Собери новый релиз."

### Stream: Release Metadata 1.2.575
107. [DONE] `phase1.stream64.task1` Update README Current Release and CHANGELOG for version 1.2.575 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.575`).
    - Evidence 2026-06-22: README Current Release and CHANGELOG now describe first-open saved standalone Chat restore and detached CEF pre-paint background fixes for `1.2.575`.
108. [DONE] `phase1.stream64.commit1` Git Commit: `docs: prepare release 1.2.575` (hash: self)

### Stream: Release Build 1.2.575
109. [DONE] `phase1.stream65.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.575`).
    - Evidence 2026-06-22: `./scripts/build-all.sh` completed and prepared unified version `1.2.575`.
    - Evidence 2026-06-22: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, compile, local artefact validation, markdown links, duplication checks, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-22: `unzip -tq codeai-hub-1.2.575.vsix` PASS.
    - Evidence 2026-06-22: VSIX ready at `codeai-hub-1.2.575.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
110. [DONE] `phase1.stream65.commit1` Git Commit: `chore: release 1.2.575` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.575
111. [DONE] `phase1.stream66.task1` User installs and retests `codeai-hub-1.2.575.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user confirmed one of two bugs is fixed after `1.2.575`, but detached CEF windows still show a white flash on open/close.

### Stream: 1.2.575 Sticky Detached CEF Paint Bugfix
112. [DONE] `phase1.stream67.task1` Keep detached CEF popup windows dark through CEF theme resets during open/close (scope: `packages/cef-launcher/**, assets/launcher/manifest.json, doc/**`; expected commit: `fix: keep cef popup windows dark through theme changes`).
    - Evidence 2026-06-22: detached CEF windows now apply the Project Manager dark background to `CefWindow` and `CefBrowserView` before `AddChildView()` / `Show()`.
    - Evidence 2026-06-22: CEF theme callbacks now reapply the dark background from `OnThemeColorsChanged` and `OnThemeChanged`, covering theme resets after popup attachment and during teardown.
    - Evidence 2026-06-22: `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs` PASS.
    - Evidence 2026-06-22: `./scripts/build-cef-launcher.sh --launcher-version 1.2.575` PASS and refreshed `assets/launcher/manifest.json`.
113. [DONE] `phase1.stream67.commit1` Git Commit: `fix: keep cef popup windows dark through theme changes` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.576
114. [DONE] `phase1.stream68.task1` User explicitly confirmed preparing and building the next release candidate after the remaining white-flash fix (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user requested: "сделай фикс и собери новый релиз, проверим."

### Stream: Release Metadata 1.2.576
115. [DONE] `phase1.stream69.task1` Update README Current Release and CHANGELOG for version 1.2.576 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.576`).
    - Evidence 2026-06-22: README Current Release and CHANGELOG now describe the sticky detached CEF popup dark-paint fix for `1.2.576`.
116. [DONE] `phase1.stream69.commit1` Git Commit: `docs: prepare release 1.2.576` (hash: self)

### Stream: Release Build 1.2.576
117. [DONE] `phase1.stream70.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.576`).
    - Evidence 2026-06-22: `./scripts/build-all.sh` completed and prepared unified version `1.2.576`.
    - Evidence 2026-06-22: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, compile, local artefact validation, markdown links, duplication checks, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-22: `unzip -tq codeai-hub-1.2.576.vsix` PASS.
    - Evidence 2026-06-22: VSIX ready at `codeai-hub-1.2.576.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
118. [DONE] `phase1.stream70.commit1` Git Commit: `chore: release 1.2.576` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.576
119. [DONE] `phase1.stream71.task1` User installs and retests `codeai-hub-1.2.576.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user confirmed the white flash is gone when opening the session interface, but a white flash remains when closing detached windows.

### Stream: 1.2.576 Detached CEF Close Flash Bugfix
120. [DONE] `phase1.stream72.task1` Hide disposable detached CEF popup windows before browser-view teardown so the native window does not expose a white close frame (scope: `packages/cef-launcher/**, assets/launcher/**, doc/**`; expected commit: `fix: hide cef popup windows before teardown`).
    - Evidence 2026-06-22: `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs` passes.
    - Evidence 2026-06-22: `./scripts/build-cef-launcher.sh --launcher-version 1.2.576` passes and refreshes the local launcher archive plus `assets/launcher/manifest.json`.
121. [DONE] `phase1.stream72.commit1` Git Commit: `fix: hide cef popup windows before teardown` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.577
122. [DONE] `phase1.stream73.task1` User explicitly confirmed preparing and building the next release candidate after the detached CEF close-flash fix (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user requested: "Собери новый релиз."

### Stream: Release Metadata 1.2.577
123. [DONE] `phase1.stream74.task1` Update README Current Release and CHANGELOG for version 1.2.577 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.577`).
    - Evidence 2026-06-22: README Current Release and CHANGELOG now describe the detached CEF close-flash fix for `1.2.577`.
124. [DONE] `phase1.stream74.commit1` Git Commit: `docs: prepare release 1.2.577` (hash: self)

### Stream: Release Build 1.2.577
125. [DONE] `phase1.stream75.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.577`).
    - Evidence 2026-06-22: `./scripts/build-all.sh` completed and prepared unified version `1.2.577`.
    - Evidence 2026-06-22: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, compile, SDK exclusions, local artefact validation, markdown links, duplication checks, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-22: `unzip -tq codeai-hub-1.2.577.vsix` PASS.
    - Evidence 2026-06-22: VSIX ready at `codeai-hub-1.2.577.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
126. [DONE] `phase1.stream75.commit1` Git Commit: `chore: release 1.2.577` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.577
127. [DONE] `phase1.stream76.task1` User installs and retests `codeai-hub-1.2.577.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user confirmed the white flash on close remains after `1.2.577`, so CEF `window->Hide()` does not cover the AppKit close-frame path.

### Stream: 1.2.577 Native Popup Close Flash Bugfix
128. [DONE] `phase1.stream77.task1` Hide the native macOS popup window before CEF browser-view close teardown so AppKit cannot expose a white backing frame (scope: `packages/cef-launcher/**, assets/launcher/**, doc/**`; expected commit: `fix: hide native popup window before cef close teardown`).
    - Evidence 2026-06-22: `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs` PASS.
    - Evidence 2026-06-22: `./scripts/build-cef-launcher.sh --launcher-version 1.2.577` PASS and refreshed `assets/launcher/manifest.json`.
129. [DONE] `phase1.stream77.commit1` Git Commit: `fix: hide native popup window before cef close teardown` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.578
130. [DONE] `phase1.stream78.task1` User explicitly confirmed preparing and building the next release candidate after the native popup close-frame fix (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user requested: "Собери новый релиз."

### Stream: Release Metadata 1.2.578
131. [DONE] `phase1.stream79.task1` Update README Current Release and CHANGELOG for version 1.2.578 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.578`).
    - Evidence 2026-06-22: README Current Release and CHANGELOG now describe the native macOS popup close-frame fix for `1.2.578`.
132. [DONE] `phase1.stream79.commit1` Git Commit: `docs: prepare release 1.2.578` (hash: self)

### Stream: Release Build 1.2.578
133. [DONE] `phase1.stream80.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.578`).
    - Evidence 2026-06-22: `./scripts/build-all.sh` completed and prepared unified version `1.2.578`.
    - Evidence 2026-06-22: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, compile, SDK exclusions, local artefact validation, markdown links, duplication checks, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-22: `unzip -tq codeai-hub-1.2.578.vsix` PASS.
    - Evidence 2026-06-22: VSIX ready at `codeai-hub-1.2.578.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
134. [DONE] `phase1.stream80.commit1` Git Commit: `chore: release 1.2.578` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.578
135. [DONE] `phase1.stream81.task1` User installs and retests `codeai-hub-1.2.578.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user confirmed the white flash on popup close remains after `1.2.578`; hiding the native window from `OnWindowClosing` is still too late for the last AppKit close frame.

### Stream: 1.2.578 Early Native Popup Close Bugfix
136. [DONE] `phase1.stream82.task1` Move detached macOS popup native hide/orderOut into `CanClose` and disable native window close animation before CEF teardown starts (scope: `packages/cef-launcher/**, assets/launcher/**, doc/**`; expected commit: `fix: prepare cef popup native close earlier`).
    - Evidence 2026-06-22: `node --test packages/cef-launcher/src/launcher-app-paint.test.mjs` PASS, including native popup close prep before `CanClose` returns `true` and `NSWindowAnimationBehaviorNone`.
    - Evidence 2026-06-22: `./scripts/build-cef-launcher.sh --launcher-version 1.2.578` PASS and refreshed `assets/launcher/manifest.json`.
137. [DONE] `phase1.stream82.commit1` Git Commit: `fix: prepare cef popup native close earlier` (hash: self)

### Stream: Release Rebuild Confirmation 1.2.579
138. [DONE] `phase1.stream83.task1` User explicitly confirmed preparing and building the next release candidate after the early native popup close-frame fix (scope: `doc/TODO/todo-plan.md`; expected commit: none).
    - Evidence 2026-06-22: user requested: "Хорошо, давай попробуй последний фикс сделать и собери сразу новый релиз для проверки."

### Stream: Release Metadata 1.2.579
139. [DONE] `phase1.stream84.task1` Update README Current Release and CHANGELOG for version 1.2.579 before packaging (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare release 1.2.579`).
    - Evidence 2026-06-22: README Current Release and CHANGELOG now describe the early native macOS popup close-frame fix for `1.2.579`.
140. [DONE] `phase1.stream84.commit1` Git Commit: `docs: prepare release 1.2.579` (hash: self)

### Stream: Release Build 1.2.579
141. [DONE] `phase1.stream85.task1` Run release packaging and record artifact evidence (scope: `package.json, package-lock.json, packages/*/package.json, assets/**/manifest.json, doc/tmp/releases/**, doc/TODO/todo-plan.md`; expected commit: `chore: release 1.2.579`).
    - Evidence 2026-06-22: `./scripts/build-all.sh` completed and prepared unified version `1.2.579`.
    - Evidence 2026-06-22: `./scripts/build-release.sh --use-current-version --allow-dirty` completed, including architecture check, typecheck, compile, SDK exclusions, local artefact validation, markdown links, duplication checks, production dependency pruning, VSIX runtime package surface verification, and package creation.
    - Evidence 2026-06-22: `unzip -tq codeai-hub-1.2.579.vsix` PASS.
    - Evidence 2026-06-22: VSIX ready at `codeai-hub-1.2.579.vsix` (5.5M); release tarballs are present in `doc/tmp/releases/` and `~/.codeai-hub/releases/`.
142. [DONE] `phase1.stream85.commit1` Git Commit: `chore: release 1.2.579` (hash: self)

### Stream: User Visual Acceptance Testing 1.2.579
143. [DONE] `phase1.stream86.task1` User installs and retests `codeai-hub-1.2.579.vsix` (scope: `doc/TODO/todo-plan.md`; expected commit: none). Result: User retested 1.2.579: white close flash still remains; user explicitly decided to stop this investigation, close the topic, end the session, and push the release to GitHub.

### Stream: Scope Closeout
144. [IN_PROGRESS] `phase1.stream59.task1` Close release scope after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**`; expected commit: `docs: close standalone chat release scope`).
145. [TODO] `phase1.stream59.commit1` Git Commit: `docs: close standalone chat release scope` (hash: TBD)
146. [TODO] `phase1.stream59.handoff` Reserved post-closeout handoff anchor.
````

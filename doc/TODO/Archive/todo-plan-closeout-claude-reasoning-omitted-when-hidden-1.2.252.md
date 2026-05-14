# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "claude-reasoning-omitted-when-hidden-1.2.252",
  "branch": "main",
  "baseHead": "b4cdd457d",
  "lastRecordedCommit": "0c78eee71",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Reasoning_Omitted_When_Hidden.md",
  "currentTaskId": "reasoning-omit.phase5.closeout.task1",
  "expectedCommitMessage": "docs: close claude reasoning omitted when hidden scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/Claude_Reasoning_Omitted_When_Hidden.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Modules/Claude.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/UserFacing_Text_Localization_Boundary.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Execution Rules

- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: реализация и отдельный `Git Commit: ...`.
- Commit выполняется через `npm run plan:commit -- "<expected commit message>"`.
- Release Build Confirmation Gate действует: перед README/CHANGELOG bump и `build-all.sh` обязателен явный отдельный confirm от пользователя в чате; нельзя начинать Phase 3 только потому что Phase 2 закрыт.
- После сборки scope остаётся ACTIVE до пользовательского retest/acceptance.

## Phase 1 — Intake (owner: Codex, updated: 2026-05-13)

### Stream: Scope And Plan

1. [DONE] `reasoning-omit.phase1.intake.task1` Create Claude reasoning omission planning doc, register it in `Docs_Index.md`, and write the active `todo-plan.md` for the new scope (scope: `doc/SolidWorks-WorkFlow/Plans/Claude_Reasoning_Omitted_When_Hidden.md, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/TODO/todo-plan.md`; expected commit: `docs: plan claude reasoning omitted when hidden`).
2. [DONE] Git Commit: `docs: plan claude reasoning omitted when hidden` (hash: 866d6bf5e)

## Phase 2 — Implementation (owner: Codex, updated: 2026-05-13)

### Stream: SDK Manager

3. [DONE] `reasoning-omit.phase2.sdk-manager.task1` Plumb `thinkingDisplaySyncEnabled` into `ClaudeSDKManager.resolveThinkingOptions` so the enabled-thinking branch picks `display: "summarized"` when the flag is `true` (or absent) and `display: "omitted"` when it is `false`; cover both branches with a unit test (scope: `packages/Claude_Module/src/sdk/claude-sdk-manager.ts, packages/Claude_Module/src/sdk/claude-sdk-manager.test.ts`; expected commit: `feat: omit claude reasoning summary when hidden`).
4. [DONE] Git Commit: `feat: omit claude reasoning summary when hidden` (hash: 97a83eec5)

### Stream: Native Capture Diagnostic

5. [DONE] `reasoning-omit.phase2.capture.task1` Mirror the `thinkingDisplaySyncEnabled` signal into the diagnostic capture path: extend `ClaudeNativeRequestCaptureAppliedTurnConfig` and the local `resolveThinkingOptions` helper, widen the `display` union to `"summarized" | "omitted"`, and assert both outputs in capture tests (scope: `packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.ts, packages/Claude_Module/src/diagnostics/claude-native-request-capture-service.test.ts`; expected commit: `feat: mirror reasoning display selection in native capture`).
6. [DONE] Git Commit: `feat: mirror reasoning display selection in native capture` (hash: 689e85314)

### Stream: SSOT Docs

7. [DONE] `reasoning-omit.phase2.ssot.task1` Document the hidden-reasoning omission invariant in `Modules/Claude.md` under the messaging cluster contract: `thinkingDisplaySyncEnabled = false` selects `display: "omitted"`, no `thinking_delta` arrives, the live thinking buffer/thought translation adapter stays no-op, and Opus 4.7 falls back to encrypted `signature_delta`-only behavior (scope: `doc/SolidWorks-WorkFlow/Modules/Claude.md`; expected commit: `docs: document reasoning summary omission`).
8. [DONE] Git Commit: `docs: document reasoning summary omission` (hash: 5756ab595)

## Phase 3 — Release Build (owner: Codex, updated: 2026-05-13)

### Stream: Release 1.2.252

9. [DONE] `reasoning-omit.phase3.release-docs.task1` Prepare README and CHANGELOG for upcoming release `1.2.252` (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare release 1.2.252`).
10. [DONE] Git Commit: `docs: prepare release 1.2.252` (hash: 6abcde267)
11. [DONE] `reasoning-omit.phase3.release-build.task1` Run the approved release build and collect artifacts for `1.2.252` (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, packages/core/src/templates/bundled-templates.ts`; expected commit: `chore: release 1.2.252`).
12. [DONE] Git Commit: `chore: release 1.2.252` (hash: 6f99a45f8)

## Phase 4 — User Workflow Acceptance Testing (owner: User, updated: 2026-05-13)

### Stream: User Retest

13. [DONE] `reasoning-omit.phase4.user-test.task1` User installs release `1.2.252`, confirms that disabling `Thinking in dialog` for Claude stops producing visible/hidden reasoning bubbles AND that the provider request body no longer reports `display: "summarized"` (scope: user workflow; expected commit: `docs: accept release 1.2.252 retest`).
14. [DONE] Git Commit: `docs: accept release 1.2.252 retest` (hash: 0c78eee71)

## Phase 5 — Scope Closeout (owner: Codex, updated: 2026-05-13)

### Stream: Close Plan After User Acceptance

15. [IN_PROGRESS] `reasoning-omit.phase5.closeout.task1` Archive active plan and dispose the planning document after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close claude reasoning omitted when hidden scope`).
16. [TODO] Git Commit: `docs: close claude reasoning omitted when hidden scope` (hash: TBD)
17. [TODO] `reasoning-omit.phase5.closeout.task2` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle (scope: chat/process observation only; expected commit: not required).

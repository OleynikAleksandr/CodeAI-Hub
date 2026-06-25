# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "reasoning-translation-first-reveal-2026-06-25",
  "branch": "main",
  "baseHead": "62d92f09e",
  "lastRecordedCommit": "self",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/SessionDialog_ReasoningTranslationFirstReveal_Planning_RU.md",
  "currentTaskId": "reasoning-reveal.phase5.stream3.task1",
  "expectedCommitMessage": null,
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ReasoningTranslationFirstReveal_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Modules/Shared_RuntimeTranslation_Module.md`
  - `doc/SolidWorks-WorkFlow/Modules/Localization.md`
  - `doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`
- Only this list is the context source for this execution cycle.

## Execution Rules

- **Required reading before each fix:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Release build confirmation gate: satisfied by the user request on 2026-06-25.
- Next release target: `1.2.610`.
- Use `npm run plan:commit -- "<expected commit message>"` for tracked commits.
- Do not close this scope until the user explicitly accepts the installed release.

## Phase 1 - Planning Intake (owner: Codex, updated: 2026-06-25)

### Stream: Planning

1. [DONE] `reasoning-reveal.phase1.stream1.task1` Create the accepted planning source and active execution plan for translation-first reasoning reveal (scope: `doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Plans/SessionDialog_ReasoningTranslationFirstReveal_Planning_RU.md`; expected commit: `docs: plan reasoning translation-first reveal`).
2. [DONE] Git Commit: `docs: plan reasoning translation-first reveal` (hash: self)

## Phase 2 - Core Pending Translation Contract (owner: Codex, updated: 2026-06-25)

### Stream: Shared Message Contract

3. [DONE] `reasoning-reveal.phase2.stream1.task1` Add a minimal session message field for pending translation state and normalize it through the browser bridge (scope: `src/types/session.ts, src/client/ui/src/core-bridge/types.ts, src/client/ui/src/core-bridge/normalizers.ts`; expected commit: `feat: add reasoning translation pending state`).
4. [DONE] Git Commit: `feat: add reasoning translation pending state` (hash: self)

### Stream: Core Policy Wiring

5. [DONE] `reasoning-reveal.phase2.stream2.task1` Mark visible reasoning messages as pending only when Core policy will translate them (scope: `packages/core/src/session-translation/session-translation-facade.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.ts, packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts`; expected commit: `feat: mark visible reasoning pending translation`).
6. [DONE] Git Commit: `feat: mark visible reasoning pending translation` (hash: self)

## Phase 3 - Session UI Translation-First Reveal (owner: Codex, updated: 2026-06-25)

### Stream: Display Projection

7. [DONE] `reasoning-reveal.phase3.stream1.task1` Stop merged thinking display content from falling back to English while a translated segment is pending (scope: `src/client/ui/src/session/dialog-panel-message-utils.ts, src/client/ui/src/session/dialog-panel-message-utils.test.ts, src/client/ui/src/session/session-message-localization-facade.ts`; expected commit: `fix: keep pending reasoning source hidden`).
8. [DONE] Git Commit: `fix: keep pending reasoning source hidden` (hash: self)

### Stream: Progressive Reveal

9. [DONE] `reasoning-reveal.phase3.stream2.task1` Reveal completed translated reasoning text progressively in the thinking bubble with source fallback on timeout (scope: `src/client/ui/src/session/dialog-panel.tsx, src/client/ui/src/session/translated-text-reveal.ts, src/client/ui/src/session/translated-text-reveal.test.ts`; expected commit: `feat: reveal translated reasoning progressively`).
10. [DONE] Git Commit: `feat: reveal translated reasoning progressively` (hash: self)

## Phase 4 - Documentation Sync (owner: Codex, updated: 2026-06-25)

### Stream: SSOT Updates

11. [DONE] `reasoning-reveal.phase4.stream1.task1` Document translation-first reasoning reveal in system/module/session UI SSOT docs (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md, doc/SolidWorks-WorkFlow/Modules/Localization.md, doc/SolidWorks-WorkFlow/Modules/Session_UI/README.md`; expected commit: `docs: document reasoning translation-first reveal`).
12. [DONE] Git Commit: `docs: document reasoning translation-first reveal` (hash: self)

## Phase 5 - Release 1.2.610 (owner: Codex, updated: 2026-06-25)

### Stream: Release Metadata

13. [DONE] `reasoning-reveal.phase5.stream1.task1` Prepare README and CHANGELOG for release 1.2.610 before running release scripts (scope: `README.md, CHANGELOG.md, doc/TODO/todo-plan.md`; expected commit: `docs: prepare 1.2.610 release notes`).
14. [DONE] Git Commit: `docs: prepare 1.2.610 release notes` (hash: self)

### Stream: Release Build

15. [DONE] `reasoning-reveal.phase5.stream2.task1` Run release build scripts and commit generated version state (scope: `package.json, package-lock.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, packages/core/src/templates/bundled-templates.ts, .vscodeignore, doc/TODO/todo-plan.md`; expected commit: `chore: build 1.2.610 release`).
16. [DONE] Git Commit: `chore: build 1.2.610 release` (hash: self)

### Stream: User Visual Acceptance Testing

17. [IN_PROGRESS] `reasoning-reveal.phase5.stream3.task1` User installs release 1.2.610 and verifies translated reasoning appears translation-first with progressive reveal (scope: `user workflow`).

### Stream: Scope Closeout

18. [TODO] `reasoning-reveal.phase5.stream4.task1` Close the release scope after explicit user acceptance (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md, doc/SolidWorks-WorkFlow/Plans/**`; expected commit: `docs: close reasoning translation reveal scope`).
19. [TODO] Git Commit: `docs: close reasoning translation reveal scope` (hash: TBD)
20. [TODO] `reasoning-reveal.phase5.stream4.handoff` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.

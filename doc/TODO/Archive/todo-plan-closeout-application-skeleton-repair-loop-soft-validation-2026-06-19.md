# Plan Closeout: application-skeleton-repair-loop-soft-validation-2026-06-19

**Created:** 2026-06-19T07:03:32.381Z
**Acceptance:** User accepted release 1.2.549 after Kimi and GLM Application Skeleton retest; all works as needed.
**Execution Scope Status:** ACTIVE
**Branch:** main
**Current Task:** app-skeleton-loop.phase7.closeout.task1
**Expected Commit:** docs: close application skeleton loop fix scope
**Last Recorded Commit:** cd0579f9a
**Planning Source Disposition:** moved
**Planning Source Path:** doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md

## Active Plan Copy

````markdown
# Development TODO Plan

<!-- codeai-plan-state:start -->
```json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "application-skeleton-repair-loop-soft-validation-2026-06-19",
  "branch": "main",
  "baseHead": "965f99dee",
  "lastRecordedCommit": "cd0579f9a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md",
  "currentTaskId": "app-skeleton-loop.phase7.closeout.task1",
  "expectedCommitMessage": "docs: close application skeleton loop fix scope",
  "debt": null
}
```
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`
  - `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`
  - `doc/SolidWorks-WorkFlow/System/WorkflowStep_PromptTesting_Methodology.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules)
- Каждая подзадача затрагивает не более 3 файлов и оформляется парой пунктов: (1) реализация, (2) `Git Commit: ...` (отдельной строкой). Scope указывается реальными путями в `scope: \`...\``.
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **Gates (автоматически через Husky):** `git commit` → `check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`; `git push` → `npm run check:dup`, `npm run check:links`.
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace @codeai-hub/core`.
- **Commit:** после зелёных гейтов — `npm run plan:commit -- "<expected commit message>"`.
- **Ponytail Hard Mode:** минимальный diff, переиспользование существующих primitives.
- Prompt/scenario/validator changes must stay product-agnostic: no product type, domain, stack, UI pattern, or generated app category assumptions.
- **Release Build Confirmation Gate:** release notes, version bump, `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version` не выполнять без отдельного явного подтверждения пользователя.
- Scope Closeout выполняется только после явного User Acceptance Gate.

## Phase 0 — Planning Intake (owner: Codex, updated: 2026-06-19)
### Stream: Planning Source
1. [DONE] `app-skeleton-loop.phase0.intake.task1` Создать planning-doc, активный `todo-plan.md` и индексную ссылку для scope (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md, doc/TODO/todo-plan.md, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: plan application skeleton repair loop fix`).
2. [DONE] Git Commit: `docs: plan application skeleton repair loop fix` (hash: 22aa2598f)

## Phase 1 — Soft Foundation Validation (owner: Codex, updated: 2026-06-19)
### Stream: Application Skeleton Draft Validator
3. [DONE] `app-skeleton-loop.phase1.soft-validation.task1` Сделать `repoShape` non-blocking descriptive field для Foundation Draft и добавить targeted regression test (scope: `packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-foundation-contract.ts, packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator-warnings.test.ts`; expected commit: `fix(core): soften application skeleton repo shape validation`).
4. [DONE] Git Commit: `fix(core): soften application skeleton repo shape validation` (hash: acf86bda7)

## Phase 2 — Draft Repair Limit (owner: Codex, updated: 2026-06-19)
### Stream: Orchestrator Repair Attempts
5. [DONE] `app-skeleton-loop.phase2.repair-limit.task1` Использовать реальный номер draft repair task для Application Skeleton и покрыть helper тестом (scope: `packages/core/src/remote-bridge/handlers/managed-workflow-repair-attempts.ts, packages/core/src/remote-bridge/handlers/session-request-handler-managed-workflow-turn.ts, packages/core/src/remote-bridge/handlers/managed-workflow-repair-attempts.test.ts`; expected commit: `fix(core): stop application skeleton draft repair loops`).
6. [DONE] Git Commit: `fix(core): stop application skeleton draft repair loops` (hash: d534894ac)

## Phase 3 — Canonical Docs Sync (owner: Codex, updated: 2026-06-19)
### Stream: Orchestration Policy Documentation
7. [DONE] `app-skeleton-loop.phase3.docs.task1` Зафиксировать универсальную policy для soft descriptive fields и repair loop user gate (scope: `doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `docs: record managed repair loop policy`).
8. [DONE] Git Commit: `docs: record managed repair loop policy` (hash: b700da6b0)

## Phase 4 — Tooling Verification (owner: Codex, updated: 2026-06-19)
### Stream: Targeted Checks
9. [DONE] `app-skeleton-loop.phase4.verify.task1` Запустить targeted tests/build для затронутого Core workflow и записать evidence (scope: `packages/core, doc/TODO/todo-plan.md`; expected commit: `chore: record application skeleton loop fix verification`). Result: `npx tsx --test packages/core/src/managed-workflow-orchestration/application-skeleton/application-skeleton-validator-warnings.test.ts packages/core/src/remote-bridge/handlers/managed-workflow-repair-attempts.test.ts` passed 4/4; `npm run build --workspace @codeai-hub/core` OK.
10. [DONE] Git Commit: `chore: record application skeleton loop fix verification` (hash: a1cf1d942)

## Phase 5 — Release Build (owner: Codex, updated: 2026-06-19)
### Stream: Release Confirmation Gate
11. [DONE] `app-skeleton-loop.phase5.release-gate.task1` Остановиться и получить отдельное явное подтверждение пользователя на release notes, version bump и release build (scope: `doc/TODO/todo-plan.md`; expected commit: null). Result: User explicitly confirmed release build on 2026-06-19.
12. [DONE] `app-skeleton-loop.phase5.release-docs.task1` После подтверждения обновить README/CHANGELOG под будущую версию (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare application skeleton loop fix release`).
13. [DONE] Git Commit: `docs: prepare application skeleton loop fix release` (hash: 524594647)
14. [DONE] `app-skeleton-loop.phase5.release-build.task1` После подтверждения собрать новый release и VSIX, перенести артефакты в `doc/tmp/releases/` и записать evidence (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore(release): build application skeleton loop fix release`). Result: `./scripts/build-all.sh --allow-dirty` built provider/core/UI/launcher tarballs for `1.2.548` into `doc/tmp/releases/`; `./scripts/build-release.sh --use-current-version --allow-dirty` passed SDK exclusions, artefact validation, markdown links, duplication checks, production dependency restore, VSIX surface verification, and created `codeai-hub-1.2.548.vsix` (5.4M).
15. [DONE] Git Commit: `chore(release): build application skeleton loop fix release` (hash: fd9ae2d13)

## Phase 6 — User Workflow Acceptance Testing (owner: User, updated: 2026-06-19)
### Stream: User Retest
16. [DONE] `app-skeleton-loop.phase6.user-test.task1` Передать новый release пользователю для установки и повторного теста Application Skeleton scenario (scope: `doc/TODO/todo-plan.md`; expected commit: null). Result: user retest on Kimi For Coding exposed missing Application Skeleton stage directory and managed provider capability parity gaps; scope remains ACTIVE for follow-up fixes.

### Stream: Managed Stage Artifact Workspace
17. [DONE] `app-skeleton-loop.phase6.core-preflight.task1` Добавить Core preflight для managed stage artifact directories и безопасную очистку пустого conflicting file перед provider turn (scope: `packages/core/src/remote-bridge/handlers/workspace-session-service.ts, packages/core/src/remote-bridge/handlers/workspace-session-service.test.ts, doc/SolidWorks-WorkFlow/System/WorkflowSteps_Overview.md`; expected commit: `fix(core): prepare managed stage artifact workspaces`).
18. [DONE] Git Commit: `fix(core): prepare managed stage artifact workspaces` (hash: 0e500045c)

### Stream: Provider Capability Parity
19. [DONE] `app-skeleton-loop.phase6.kimi-parity.task1` Вернуть Kimi managed workflow shell capability на уровне coder baseline без Git/subagent/web расширения (scope: `packages/Kimi_Module/src/provider/kimi-managed-agent-profile.ts, packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts, doc/SolidWorks-WorkFlow/Modules/Kimi.md`; expected commit: `fix(kimi): restore managed workflow shell capability`).
20. [DONE] Git Commit: `fix(kimi): restore managed workflow shell capability` (hash: 80110dafc)
21. [DONE] `app-skeleton-loop.phase6.glm-parity.task1` Зафиксировать и проверить GLM Native Core-owned workflow artifact tool parity для recursive artifact writes (scope: `packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts, doc/SolidWorks-WorkFlow/Modules/GLM_Native.md, doc/SolidWorks-WorkFlow/Clusters/ManagedWorkflowOrchestration.md`; expected commit: `docs: record managed provider artifact tool parity`).
22. [DONE] Git Commit: `docs: record managed provider artifact tool parity` (hash: f85fdc34b)

### Stream: Follow-Up Verification
23. [DONE] `app-skeleton-loop.phase6.follow-up-verify.task1` Запустить targeted tests/build для Core preflight и provider parity fixes, записать evidence (scope: `packages/core, packages/Kimi_Module, packages/GLM_Module, doc/TODO/todo-plan.md`; expected commit: `chore: verify managed stage workspace preflight`). Result: `npx tsx --test packages/core/src/remote-bridge/handlers/workspace-session-service.test.ts packages/Kimi_Module/src/provider/kimi-managed-agent-profile.test.ts packages/GLM_Module/src/provider/glm-native-provider-adapter.tools.test.ts` passed 9/9; `npm run build --workspace @codeai-hub/kimi-module` OK; `npm run build --workspace @codeai-hub/glm-module` OK; `npm run build --workspace @codeai-hub/core` OK after provider module dist rebuilds were complete.
24. [DONE] Git Commit: `chore: verify managed stage workspace preflight` (hash: a0b8407d9)

## Phase 6B — Follow-Up Release Build (owner: Codex, updated: 2026-06-19)
### Stream: Release Confirmation Gate
25. [DONE] `app-skeleton-loop.phase6b.release-gate.task1` Получить отдельное явное подтверждение пользователя на release notes, version bump и release build для follow-up fixes (scope: `doc/TODO/todo-plan.md`; expected commit: null). Result: user explicitly requested a new release for tests on 2026-06-19.
26. [DONE] `app-skeleton-loop.phase6b.release-docs.task1` После подтверждения обновить README/CHANGELOG под будущую версию (scope: `README.md, CHANGELOG.md`; expected commit: `docs: prepare managed stage workspace release`).
27. [DONE] Git Commit: `docs: prepare managed stage workspace release` (hash: 7563eae7b)
28. [DONE] `app-skeleton-loop.phase6b.release-build.task1` Собрать новый release и VSIX, перенести артефакты в `doc/tmp/releases/` и записать evidence (scope: `package.json, packages/**/package.json, assets/**/manifest.json, media/react-chat.js, package-lock.json, doc/tmp/releases, doc/TODO/todo-plan.md`; expected commit: `chore(release): build managed stage workspace release`). Result: `./scripts/build-all.sh --allow-dirty` built provider/core/UI/launcher tarballs for `1.2.549` into `doc/tmp/releases/`; `./scripts/build-release.sh --use-current-version --allow-dirty` passed SDK exclusions, artefact validation, markdown links, duplication checks, production dependency restore, VSIX surface verification, and created `codeai-hub-1.2.549.vsix` (5.4M).
29. [DONE] Git Commit: `chore(release): build managed stage workspace release` (hash: cd0579f9a)

## Phase 6C — User Workflow Acceptance Testing (owner: User, updated: 2026-06-19)
### Stream: Follow-Up User Retest
30. [DONE] `app-skeleton-loop.phase6c.user-test.task1` Передать follow-up release пользователю для установки и повторного теста Application Skeleton на Kimi/GLM/Codex/Claude (scope: `doc/TODO/todo-plan.md`; expected commit: null). Result: User accepted release 1.2.549 on 2026-06-19 after retesting Application Skeleton on Kimi and GLM; plan can close.

## Phase 7 — Scope Closeout (owner: Codex, updated: 2026-06-19)
### Stream: Closeout After Acceptance
31. [IN_PROGRESS] `app-skeleton-loop.phase7.closeout.task1` После явного acceptance пользователя архивировать active plan, принять disposition planning-doc и обновить Docs_Index (scope: `doc/TODO/todo-plan.md, doc/TODO/Archive/**, doc/SolidWorks-WorkFlow/Plans/Archive/ApplicationSkeleton_RepairLoop_And_SoftFoundation_Planning_RU.md, doc/SolidWorks-WorkFlow/Plans/Archive/**, doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs: close application skeleton loop fix scope`).
32. [TODO] Git Commit: `docs: close application skeleton loop fix scope` (hash: TBD)
33. [TODO] `app-skeleton-loop.phase7.handoff.task1` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
````

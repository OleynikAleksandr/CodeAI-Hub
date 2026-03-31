# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules)
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Source of truth для этой фазы: `doc/SolidWorks-WorkFlow/Plans/TestSupport_WarningZone_Cleanup_Architecture.md`
- Scope этой волны ограничен тремя test/support warning-zone файлами: `workspace-runtime-facade.test.ts`, `session-request-handler.test-helpers.ts`, `gemini-session-manager.test.ts`
- Production runtime, новые product fixes и расширение architecture allowlist в эту фазу не входят.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если scope вырастает больше 3 файлов, подзадачу нужно дробить до начала правок.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетная verification** перед закрытием stream-ов:
  - `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`
  - `node --test --import tsx packages/core/src/workspace-runtime/workspace-runtime-facade-continuity.test.ts`
  - `node --test --import tsx packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
  - `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.test.ts`
  - `node --test --import tsx packages/Gemini_Module/src/session/gemini-session-manager.post-tool.test.ts`
  - `npm run build --workspace @codeai-hub/core`
  - `npm run build --workspace @codeai-hub/gemini-module`
- **Release closeout обязателен:** перед `build-all.sh` обновить `README.md` и `CHANGELOG.md`, затем выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`.
- **Real-time Документация:** если в ходе decomposition меняется agreed test/support cluster boundary или verification surface, planning-doc и `todo-plan.md` обновляются в том же коммите.

## Required documents to review before work
1. `doc/Sessions/Session207.md`
2. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
3. `doc/SolidWorks-WorkFlow/Plans/Runtime_GodModules_Decomposition_Architecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/TestSupport_WarningZone_Cleanup_Architecture.md`
5. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 1 — Test/Support Warning-Zone Cleanup Wave (owner: Oleksandr, updated: 2026-03-31)

Goal: behavior-preserving decomposition of the remaining test/support warning-zone roots, followed by a test release build.

### Stream: Workspace Runtime Test Split
1. [IN_PROGRESS] Core: вынести continuity/resume-oriented сценарии из `workspace-runtime-facade.test.ts` в sibling test file, сохранив базовый snapshot/select/flush coverage в root. Scope: `packages/core/src/workspace-runtime/workspace-runtime-facade.test.ts`, новый sibling test file в `packages/core/src/workspace-runtime/`, `doc/TODO/todo-plan.md`. Expected commit: `test(core): split workspace runtime facade continuity scenarios`
2. [TODO] Git Commit: `test(core): split workspace runtime facade continuity scenarios` (hash: TBD)

### Stream: Session Request Handler Test Helper Split
3. [TODO] Core: вынести event-counter helpers из `session-request-handler.test-helpers.ts` в focused sibling helper, оставив root helper на harness/bootstrap-oriented surface. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts`, новый helper в `packages/core/src/remote-bridge/handlers/`, `doc/TODO/todo-plan.md`. Expected commit: `test(core): extract session request handler event helpers`
4. [TODO] Git Commit: `test(core): extract session request handler event helpers` (hash: TBD)
5. [TODO] Core: вынести continuity/bootstrap utility helpers из `session-request-handler.test-helpers.ts` в focused sibling helper и синхронизировать imports. Scope: `packages/core/src/remote-bridge/handlers/session-request-handler.test-helpers.ts`, новый helper в `packages/core/src/remote-bridge/handlers/`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`. Expected commit: `test(core): split session request handler continuity helpers`
6. [TODO] Git Commit: `test(core): split session request handler continuity helpers` (hash: TBD)

### Stream: Gemini Session Manager Test Split
7. [TODO] Gemini_Module: вынести post-tool nested watchdog и delayed-final-answer сценарии из `gemini-session-manager.test.ts` в sibling test file, сохранив baseline/recoverable coverage в root. Scope: `packages/Gemini_Module/src/session/gemini-session-manager.test.ts`, новый sibling test file в `packages/Gemini_Module/src/session/`, `doc/TODO/todo-plan.md`. Expected commit: `test(gemini): split post-tool session manager scenarios`
8. [TODO] Git Commit: `test(gemini): split post-tool session manager scenarios` (hash: TBD)

### Stream: Test Support Verification
9. [TODO] Verification: прогнать targeted source-level tests и package builds для Core/Gemini test-support cleanup wave, затем синхронизировать execution status. Scope: `packages/core`, `packages/Gemini_Module`, `doc/TODO/todo-plan.md`. Expected commit: `test(repo): verify test support warning-zone cleanup`
10. [TODO] Git Commit: `test(repo): verify test support warning-zone cleanup` (hash: TBD)

### Stream: Release Docs
11. [TODO] Docs: подготовить release-facing notes под новый test release после cleanup wave и синхронизировать execution status. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `docs(release): prepare test support cleanup release notes`
12. [TODO] Git Commit: `docs(release): prepare test support cleanup release notes` (hash: TBD)

### Stream: Release Build
13. [TODO] Release: после зелёной structural verification и release docs выполнить `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, сохранить свежие артефакты и синхронизировать execution status. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Expected commit: `build(release): assemble test support cleanup release`
14. [TODO] Git Commit: `build(release): assemble test support cleanup release` (hash: TBD)

### Stream: Phase Closeout
15. [TODO] Docs: архивировать завершённый active plan, выпустить placeholder `todo-plan.md` и записать session handoff по итогам волны. Scope: `doc/TODO/Archive/`, `doc/TODO/todo-plan.md`, `doc/Sessions/SessionXXX.md`. Expected commit: `docs(plan): archive test support cleanup wave`
16. [TODO] Git Commit: `docs(plan): archive test support cleanup wave` (hash: TBD)

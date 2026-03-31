# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/WorkflowStateFastRestore_Architecture.md`
3. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md`
4. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
5. `doc/SolidWorks-Flow/System/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md` (THIS DESIGN)
6. `packages/core/src/unified-session/storage.ts` (workspaceKey rules)
7. `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
8. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
9. `packages/core/src/workflow/description/description-step-store.ts`
10. `packages/ui/project-manager/dist/app.js` (current: UI-driven auto-resume)
11. `doc/Sessions/Archive/Session071.md` (THIS REPORT)

---

## Phase 88 — Core-driven auto-resume (Last Active) + workspace-safe validation (owner: Oleksandr, updated: 2026-02-02)

### Stream: design + approval
1. [DONE] Docs(architecture): согласовать Core-driven auto-resume (lastActive в workflow state, workspace identity rules, validation) — scope: `doc/SolidWorks-Flow/System/ProjectManager/CoreDriven_AutoResume_LastActive_Architecture.md`; expected commit message: `docs: approve core-driven auto-resume lastActive architecture`
2. [DONE] Git Commit: `docs: approve core-driven auto-resume lastActive architecture` (hash: 74017a2f)

### Stream: workflow state lastActive
3. [DONE] Feat(core): добавить `lastActive` snapshot в workflow state (persist + read API) для выбранного workspace — scope: ≤3 файлов в `packages/core/src/workflow/state/**` и/или `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit message: `feat(core): persist workflow lastActive snapshot`
4. [DONE] Git Commit: `feat(core): persist workflow lastActive snapshot` (hash: 17196214)

### Stream: workspace activation API
5. [DONE] Feat(core): добавить/расширить API, чтобы Project Manager сообщал выбранный workspace (workspace activated) и Core мог инициировать resume lastActive — scope: ≤3 файлов в `packages/core/src/remote-bridge/**`; expected commit message: `feat(core): add workspace activate endpoint for auto-resume`
6. [DONE] Git Commit: `feat(core): add workspace activate endpoint for auto-resume` (hash: 19d9e6a8)

### Stream: core-driven resume + validation
7. [DONE] Fix(core): выровнять workspace validation при resume на `workspaceKey` (derived from `workspacePath`) + fallback scan по `~/.codeai-hub/sessions/*` — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): validate resume against workspaceKey`
8. [DONE] Git Commit: `fix(core): validate resume against workspaceKey` (hash: f20c2df0)
9. [DONE] Fix(core): на workspace activation Core делает pre-check принадлежности `providerSessionId` выбранному workspace (unified session history bucket + fallback scan), затем выполняет resume и бродкастит `session:created` — scope: ≤3 файлов в `packages/core/src/remote-bridge/handlers/**`; expected commit message: `fix(core): core-driven lastActive resume with workspace validation`
10. [DONE] Git Commit: `fix(core): core-driven lastActive resume with workspace validation` (hash: 352b503a)

### Stream: UI wiring (minimal)
11. [DONE] Feat(ui): при выборе workspace вызывать workspace activation endpoint (вместо прямого auto-resume из workflow state) — scope: ≤3 файлов в `src/client/project-manager/components/layout/workspace-tree.tsx` и `src/client/project-manager/services/workspace-activate-client.ts`; expected commit message: `feat(project-manager): trigger core-driven auto-resume on workspace select`
12. [DONE] Git Commit: `feat(project-manager): trigger core-driven auto-resume on workspace select` (hash: 4dbb7466)

### Stream: verification (owner-run)
13. [DONE] Verification(owner): после рестарта Core Project Manager открывает lastActive session+artifact; cross-workspace resume невозможен; очистка workspace-local `.codeai-hub/**` корректно отключает resume — scope: manual; expected commit message: `chore: verify core-driven auto-resume lastActive`
14. [DONE] Git Commit: `chore: verify core-driven auto-resume lastActive` (hash: 149f1647)

### Stream: session report
15. [DONE] Docs(session): создать отчёт `doc/Sessions/Archive/Session072.md` (implementation + verification Phase 88) — scope: `doc/Sessions/Archive/Session072.md`; expected commit message: `docs(session): Session072 core-driven auto-resume lastActive`
16. [DONE] Git Commit: `docs(session): Session072 core-driven auto-resume lastActive` (hash: 84aad329)

---

## Phase 89 — Stabilization + Release build (owner: Oleksandr, updated: 2026-02-02)

### Stream: stabilization (post Phase 88)
1. [DONE] Fix(core): не требовать `sessionKind` для core-driven resume при `workspace-activate`, нормализовать `runSlug` — scope: `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`; expected commit message: `fix(core): relax workspace activate resume runSlug`
2. [DONE] Git Commit: `fix(core): relax workspace activate resume runSlug` (hash: 8827ac38)
3. [DONE] Chore(git): игнорировать локальный `.tmp/` чтобы релизные гейты/дерево были чистыми — scope: `.gitignore`; expected commit message: `chore(git): ignore .tmp workspace cache`
4. [DONE] Git Commit: `chore(git): ignore .tmp workspace cache` (hash: 8dc9894e)

### Stream: release build (build-all + build-release)
5. [DONE] Release: на чистом дереве запустить `./scripts/build-all.sh` и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
6. [DONE] Git Commit: `chore(release): build-all next version` (hash: 4face963)
7. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать `codeai-hub-<version>.vsix` — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version`
8. [DONE] Git Commit: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)

### Stream: release report
9. [DONE] Docs(session): создать `doc/Sessions/Archive/Session073.md` (релиз + результаты гейтов/сборок) — scope: `doc/Sessions/Archive/Session073.md`; expected commit message: `docs(session): add Session073 release build`
10. [DONE] Git Commit: `docs(session): add Session073 release build` (hash: 14590f55)

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/SessionContinuity/SessionContinuity.md`
3. `doc/SolidWorks-Flow/System/ProjectManager/ReviewerAutoResume_WorkspaceValidation_Architecture.md` (THIS DESIGN)
4. `doc/SolidWorks-Flow/Workflow/Workflow_CLI_Steps_And_Watcher_Architecture.md` (context: workflow state/events)
5. `doc/SolidWorks-Flow/System/WorkflowStateFastRestore_Architecture.md` (context: restore + snapshots)
6. `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`
7. `packages/core/src/remote-bridge/handlers/session-request-handler.ts`
8. `packages/core/src/workflow/description/description-step-store.ts`
9. `packages/ui/project-manager/dist/app.js` (auto-resume: `useWorkspaceTreeAutoSelect`)
10. `doc/Sessions/Session070.md` (THIS REPORT)

---

## Phase 87 — Project Manager: reviewer auto-resume must be workspace-safe (owner: Oleksandr, updated: 2026-02-02 12:45)

### Stream: design + approval
1. [DONE] Docs(architecture): утвердить дизайн workspace validation для auto-resume (Core pre-check + optional snapshot hardening) — scope: `doc/SolidWorks-Flow/System/ProjectManager/ReviewerAutoResume_WorkspaceValidation_Architecture.md`; expected commit message: `docs: approve reviewer auto-resume workspace validation`
2. [DONE] Git Commit: `docs: approve reviewer auto-resume workspace validation` (hash: N/A - docs only, included in next commit)

### Stream: core validation (block cross-workspace resumes)
3. [DONE] Feat(core): перед resume по `providerSessionId` валидировать принадлежность к workspace (`~/.codeai-hub/sessions/<workspaceSlug>/<providerId>/<providerSessionId>.jsonl` должен существовать) — scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`; expected commit message: `fix(core): validate workspace before resuming provider session`
4. [DONE] Git Commit: `fix(core): validate workspace before resuming provider session` (hash: c3f10a03)

### Stream: description snapshot hardening (optional, но желательно)
5. [DONE] Feat(core): расширить `description-step.json` полем `workspacePath` и валидировать его на read; при несовпадении — игнорировать `session/sessionKind` (treat as null) — scope: `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-types.ts`; expected commit message: `fix(core): validate description session ref workspacePath`
6. [DONE] Git Commit: `fix(core): validate description session ref workspacePath` (hash: 93d6e769)

### Stream: release build (build-all + build-release)
7. [DONE] Release: после зелёных гейтов и чистого дерева запустить `./scripts/build-all.sh` (поднимет версии и пересоберёт пакеты) и перенести tarball’ы в `doc/tmp/releases/` — scope: scripts + generated manifests/lockfiles; expected commit message: `chore(release): build-all next version`
8. [DONE] Git Commit: `chore(release): build-all next version` (hash: 3f285e43)
9. [DONE] Release: на чистом дереве запустить `./scripts/build-release.sh --use-current-version` и зафиксировать появление `codeai-hub-<version>.vsix` (артефакт в корне) — scope: scripts + release artifacts; expected commit message: `chore(release): build VSIX for current version`
10. [DONE] Git Commit: `chore(release): build VSIX for current version` (hash: N/A - VSIX in .gitignore)

### Stream: verification (owner-run)
11. [TODO] Verification(owner): пользователь воспроизводит баг и подтверждает фикс (auto-resume включён); по итогам пишет подтверждение и короткие результаты (что проверил) — scope: manual; expected commit message: `chore: verify reviewer auto-resume workspace validation`
12. [TODO] Git Commit: `chore: verify reviewer auto-resume workspace validation` (hash: TBD)

### Stream: session report
13. [TODO] Docs(session): создать отчёт `doc/Sessions/Session071.md` (implementation + verification Phase 87) — scope: `doc/Sessions/Session071.md`; expected commit message: `docs(session): Session071 reviewer auto-resume workspace validation`
14. [TODO] Git Commit: `docs(session): Session071 reviewer auto-resume workspace validation` (hash: TBD)

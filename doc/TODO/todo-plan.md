# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Localization_Runtime_Packaging_Hotfix_Architecture.md`, `doc/Sessions/Session022.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`.
- Этот `TODO Plan` закрывает hotfix scope для startup regression в release `1.1.866`: missing `@codeai-hub/localization` in VSIX runtime.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-02)
### Stream: Planning Intake
1. [DONE] Approve the runtime packaging hotfix plan and replace the placeholder TODO with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Runtime_Packaging_Hotfix_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define localization runtime packaging hotfix scope`
2. [DONE] Git Commit: `docs(plan): define localization runtime packaging hotfix scope` (hash: `9ed7e951`)

## Phase 1 — Packaging Fix (owner: Release, updated: 2026-04-02)
### Stream: Runtime Dependencies
3. [DONE] Add root production dependency ownership for `@codeai-hub/localization` and update the root lockfile so `npm prune --omit=dev` keeps the package in the extension runtime. Scope: `package.json`, `package-lock.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): declare localization runtime dependency`
4. [TODO] Git Commit: `fix(release): declare localization runtime dependency` (hash: TBD)
5. [TODO] Include `packages/localization` in the unified version bump flow so release versions stay aligned across shipped workspace packages. Scope: `scripts/build-all.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): version localization in build-all`
6. [TODO] Git Commit: `fix(release): version localization in build-all` (hash: TBD)
7. [TODO] Allow `@codeai-hub/localization` and `@codeai-hub/translation` in the VSIX and fail packaging if they are missing from the final archive. Scope: `.vscodeignore`, `scripts/build-release.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): verify packaged localization runtime`
8. [TODO] Git Commit: `fix(release): verify packaged localization runtime` (hash: TBD)

## Phase 2 — Verification And Hotfix Release (owner: Release/Docs, updated: 2026-04-02)
### Stream: Rebuild
9. [TODO] Run targeted verification for localization/core/webview and rebuild the release artefacts. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, `webview`, release scripts.
10. [TODO] Update release-facing docs, archive this hotfix TODO plan, and record the follow-up session report. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session023.md`. Target commit: `docs(session): record localization packaging hotfix release`
11. [TODO] Git Commit: `docs(session): record localization packaging hotfix release` (hash: TBD)

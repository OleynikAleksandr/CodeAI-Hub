# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Runtime_Packaging_Hotfix_Architecture.md`, `doc/Sessions/Session022.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`.
- Этот `TODO Plan` закрывает hotfix scope для startup regression в release `1.1.866`: missing `@codeai-hub/localization` in VSIX runtime.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-02)
### Stream: Planning Intake
1. [DONE] Approve the runtime packaging hotfix plan and replace the placeholder TODO with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_Runtime_Packaging_Hotfix_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define localization runtime packaging hotfix scope`
2. [DONE] Git Commit: `docs(plan): define localization runtime packaging hotfix scope` (hash: `9ed7e951`)

## Phase 1 — Packaging Fix (owner: Release, updated: 2026-04-02)
### Stream: Runtime Dependencies
3. [DONE] Add root production dependency ownership for `@codeai-hub/localization` and update the root lockfile so `npm prune --omit=dev` keeps the package in the extension runtime. Scope: `package.json`, `package-lock.json`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): declare localization runtime dependency`
4. [DONE] Git Commit: `fix(release): declare localization runtime dependency` (hash: `df17252b`)
5. [DONE] Include `packages/localization` in the unified version bump flow so release versions stay aligned across shipped workspace packages. Scope: `scripts/build-all.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): version localization in build-all`
6. [DONE] Git Commit: `fix(release): version localization in build-all` (hash: `dd7e3a36`)
7. [DONE] Allow `@codeai-hub/localization` and `@codeai-hub/translation` in the VSIX and fail packaging if they are missing from the final archive. Scope: `.vscodeignore`, `scripts/build-release.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): verify packaged localization runtime`
8. [DONE] Git Commit: `fix(release): verify packaged localization runtime` (hash: `d8b5675e`)

## Phase 2 — Verification And Hotfix Release (owner: Release/Docs, updated: 2026-04-02)
### Stream: Rebuild
9. [DONE] Run targeted verification for localization/core/webview before the hotfix rebuild. Scope: `@codeai-hub/localization`, `@codeai-hub/core`, `webview`, `doc/TODO/todo-plan.md`.
10. [DONE] Update release-facing docs for the startup packaging hotfix from the clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare localization packaging hotfix notes`
11. [DONE] Git Commit: `docs(release): prepare localization packaging hotfix notes` (hash: `fe52ff24`)
12. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` for the hotfix release artefacts. Scope: release-generated version files and manifests. Target commit: `build(release): assemble localization packaging hotfix release`
13. [DONE] Git Commit: `build(release): assemble localization packaging hotfix release` (hash: `0620db81`)
14. [DONE] Archive this hotfix TODO plan and record the follow-up session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session023.md`. Target commit: `docs(session): record localization packaging hotfix release`
15. [TODO] Git Commit: `docs(session): record localization packaging hotfix release` (hash: TBD)

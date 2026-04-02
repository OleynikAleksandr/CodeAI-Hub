# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `doc/SolidWorks-WorkFlow/Plans/Localization_Runtime_Source_Dictionary_Hotfix_Architecture.md`, `doc/Sessions/Session023.md`, `doc/SolidWorks-WorkFlow/Modules/Localization.md`.
- Этот `TODO Plan` закрывает hotfix scope для startup regression в release `1.1.867` / `1.1.868`: packaged localization runtime first resolved source dictionaries against the wrong VSIX root, then staged Core still shipped without the localization bootstrap surface required for `/api/v1/health`.
- Каждая implementation-подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Каждая подзадача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.

## Phase 0 — Scope Bootstrap (owner: Docs, updated: 2026-04-02)
### Stream: Planning Intake
1. [DONE] Approve the source-dictionary runtime hotfix plan and replace the placeholder TODO with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/Localization_Runtime_Source_Dictionary_Hotfix_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define localization source dictionary hotfix scope`
2. [DONE] Git Commit: `docs(plan): define localization source dictionary hotfix scope` (hash: `7d987c78`)

## Phase 1 — Runtime Resolution Fix (owner: Localization/Release, updated: 2026-04-02)
### Stream: Localization Package
3. [DONE] Replace brittle compile-time source dictionary imports with runtime candidate-root resolution that works in both workspace and installed-extension package topologies. Scope: `packages/localization/src/source-dictionary-registry.ts`, `doc/TODO/todo-plan.md`. Target commit: `fix(localization): resolve bundled source dictionaries across package topologies`
4. [DONE] Git Commit: `fix(localization): resolve bundled source dictionaries across package topologies` (hash: `b9896390`)
5. [DONE] Add a release smoke test that extracts the VSIX and requires the packaged localization source registry from the installed extension layout. Scope: `scripts/build-release.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): smoke test packaged localization source registry`
6. [DONE] Git Commit: `fix(release): smoke test packaged localization source registry` (hash: `c8074a8b`)

## Phase 2 — Verification And Hotfix Release (owner: Release/Docs, updated: 2026-04-02)
### Stream: Rebuild
7. [DONE] Run targeted verification for localization plus root compile before the hotfix rebuild. Scope: `@codeai-hub/localization`, root compile, `doc/TODO/todo-plan.md`.
8. [DONE] Update release-facing docs for the source-dictionary packaging hotfix from the clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare localization source dictionary hotfix notes`
9. [DONE] Git Commit: `docs(release): prepare localization source dictionary hotfix notes` (hash: `25bf874b`)
10. [DONE] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` for the hotfix release artefacts. Scope: release-generated version files and manifests. Target commit: `build(release): assemble localization source dictionary hotfix release`
11. [DONE] Git Commit: `build(release): assemble localization source dictionary hotfix release` (hash: `91867c54`)
12. [DONE] Archive this hotfix TODO plan and record the follow-up session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session024.md`. Target commit: `docs(session): record localization source dictionary hotfix release`
13. [TODO] Git Commit: `docs(session): record localization source dictionary hotfix release` (hash: TBD)

## Phase 3 — Core Runtime Packaging Closure (owner: Release/Docs, updated: 2026-04-02)
### Stream: Installed Core Bundle
14. [DONE] Reopen the hotfix after installed `1.1.868` validation: include the localization runtime dependency chain in the staged core install, override the transitive `@codeai-hub/translation` tarball during staged `npm install`, and copy bundled source dictionaries into `app/assets/localization/source/en` so the installed core bundle can load the localization-backed settings bridge. Scope: `scripts/build-core.sh`, `doc/TODO/todo-plan.md`. Target commit: `fix(core-release): bundle localization runtime dependencies`
15. [DONE] Git Commit: `fix(core-release): bundle localization runtime dependencies` (hash: `e403ecda`)
16. [DONE] Extend release artefact validation so the staged installed core runtime must successfully require the localization-backed settings handler before the release passes. Scope: `scripts/build-release.sh`, `doc/SolidWorks-WorkFlow/Plans/Localization_Runtime_Source_Dictionary_Hotfix_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `fix(release): validate packaged core localization bridge`
17. [DONE] Git Commit: `fix(release): validate packaged core localization bridge` (hash: `c293178c`)
18. [DONE] Update release-facing docs for the reopened core-runtime packaging hotfix from a clean pre-build tree. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): update core localization packaging hotfix notes`
19. [DONE] Git Commit: `docs(release): update core localization packaging hotfix notes` (hash: `37f423b3`)
20. [DONE] Re-run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` for the corrected hotfix release artefacts. Scope: release-generated version files and manifests. Target commit: `build(release): rebuild localization packaging hotfix release`
21. [DONE] Git Commit: `build(release): rebuild localization packaging hotfix release` (hash: `f5489cef`)
22. [DONE] Refresh the session report/archive after the corrected hotfix release and return `doc/TODO/todo-plan.md` to placeholder state. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session024.md`. Target commit: `docs(session): record localization packaging closure release`
23. [TODO] Git Commit: `docs(session): record localization packaging closure release` (hash: TBD)

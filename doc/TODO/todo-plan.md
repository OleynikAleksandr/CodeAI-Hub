# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зелёных гейтов — Git Commit с релевантным описанием и апдейт `todo-plan.md`.
- **doc/TODO/todo-plan.md** обновлять после каждой подзадачи.

## Phase 1 — Session Dialog Link Styling (owner: UI, updated: 2026-04-01)
### Stream: Scope Bootstrap
1. [DONE] Create the approved planning doc and replace the placeholder TODO plan with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/SessionDialog_LinkStyling_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define session dialog link styling scope`
2. [DONE] Git Commit: `docs(plan): define session dialog link styling scope` (hash: `9a01a08e`)

### Stream: Dialog Link Presentation
3. [DONE] Apply the new readable dialog-link styling contract inside the shared session dialog CSS so all providers and bubble variants inherit the same anchor appearance. Scope: `media/session-view.css`. Target commit: `fix(ui): improve session dialog link contrast`
4. [DONE] Git Commit: `fix(ui): improve session dialog link contrast` (hash: `aa9d879f`)
5. [DONE] Run targeted verification for the dialog surface. Scope: `webview`.

## Phase 2 — Release (owner: UI, updated: 2026-04-01)
### Stream: Release Notes And Packaging
1. [DONE] Update release-facing docs for `1.1.858` and sync plan progress before packaging. Scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(release): prepare 1.1.858 notes`
2. [TODO] Git Commit: `docs(release): prepare 1.1.858 notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version` from the clean tree. Scope: release-generated version files and manifests. Target commit: `build(release): assemble dialog link styling release`
4. [TODO] Git Commit: `build(release): assemble dialog link styling release` (hash: TBD)
5. [TODO] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session009.md`. Target commit: `docs(session): record dialog link styling release`
6. [TODO] Git Commit: `docs(session): record dialog link styling release` (hash: TBD)

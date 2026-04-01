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
1. [TODO] Create the approved planning doc and replace the placeholder TODO plan with this execution plan. Scope: `doc/SolidWorks-WorkFlow/Plans/SessionDialog_LinkStyling_Architecture.md`, `doc/TODO/todo-plan.md`. Target commit: `docs(plan): define session dialog link styling scope`
2. [TODO] Git Commit: `docs(plan): define session dialog link styling scope` (hash: TBD)

### Stream: Dialog Link Presentation
3. [TODO] Apply the new readable dialog-link styling contract inside the shared session dialog CSS so all providers and bubble variants inherit the same anchor appearance. Scope: `media/session-view.css`. Target commit: `fix(ui): improve session dialog link contrast`
4. [TODO] Git Commit: `fix(ui): improve session dialog link contrast` (hash: TBD)
5. [TODO] Run targeted verification for the dialog surface. Scope: `webview`.

## Phase 2 — Release (owner: UI, updated: 2026-04-01)
### Stream: Release Notes And Packaging
1. [TODO] Update release-facing docs, run `./scripts/build-all.sh`, then run `./scripts/build-release.sh --use-current-version`. Scope: `README.md`, `CHANGELOG.md`, release-generated version files. Target commit: `build(release): assemble dialog link styling release`
2. [TODO] Git Commit: `build(release): assemble dialog link styling release` (hash: TBD)
3. [TODO] Archive this completed TODO plan and record the session report. Scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session009.md`. Target commit: `docs(session): record dialog link styling release`
4. [TODO] Git Commit: `docs(session): record dialog link styling release` (hash: TBD)

# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Main_Merge_Release_Verification_1.2.83.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `README.md`
  - `CHANGELOG.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):

- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов, кроме автоматических release-script outputs.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Release verification:** run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`.
- **Commit:** После зеленых гейтов — Git Commit с максимально релевантным описанием и апдейт `todo-plan.md` (дата, статус, хеш).

## Phase 1 — Main merge release verification (owner: Codex, updated: 2026-04-25)

### Stream: Release 1.2.83

1. [DONE] Create release verification planning docs and active todo — scope: `doc/SolidWorks-WorkFlow/Plans/Main_Merge_Release_Verification_1.2.83.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/TODO/todo-plan.md`; commit: `docs: plan main merge release verification`
2. [DONE] Git Commit: `docs: plan main merge release verification` (hash: `3878c3a41`)
3. [DONE] Prepare release notes for future version `1.2.83` — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare main merge release verification`
4. [DONE] Git Commit: `docs: prepare main merge release verification` (hash: `8e70231a5`)
5. [IN_PROGRESS] Run release automation `./scripts/build-all.sh` for `1.2.83` — scope: release-script generated version/package artifacts; commit: `chore: build main merge verification release`
6. [TODO] Git Commit: `chore: build main merge verification release` (hash: TBD)
7. [TODO] Run VSIX packaging `./scripts/build-release.sh --use-current-version` and record artifacts — scope: release package outputs, `doc/TODO/todo-plan.md`; commit: `docs: record main merge verification release`
8. [TODO] Git Commit: `docs: record main merge verification release` (hash: TBD)
9. [TODO] Close scope: archive todo-plan, archive planning-doc, update Docs_Index, create completion session report — scope: `doc/TODO/Archive/`, `doc/SolidWorks-WorkFlow/Plans/Archive/`, `doc/Sessions/`; commit: `docs: close main merge release verification`
10. [TODO] Git Commit: `docs: close main merge release verification` (hash: TBD)

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/BugRegistry.md`
  - `README.md`
  - `CHANGELOG.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стрим), в каждом Stream некоторое количество подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Commit**: только после зелёных гейтов. После каждого коммита: обновить статусы и вписать hash.

---

## Phase 223 — Release v1.1.648 (test build) (owner: Codex, updated: 2026-02-22)

**Goal:** Собрать новый релиз для тестов по чек-листу релиза:
- Сначала актуализировать `README.md` и `CHANGELOG.md` под `v1.1.648`.
- Затем собрать артефакты (`./scripts/build-all.sh`) и VSIX (`./scripts/build-release.sh --use-current-version`).

### Stream 0: Release notes (docs)
1. [DONE] Обновить `README.md` и `CHANGELOG.md` под `v1.1.648` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs(release): prepare v1.1.648 notes`).
2. [DONE] Git Commit: `docs(release): prepare v1.1.648 notes` (hash: `fa93955b`)

### Stream 1: Build unified artefacts (version bump + tarballs)
1. [DONE] Прогнать `./scripts/build-all.sh` и проверить артефакты в `~/.codeai-hub/releases/` и `doc/tmp/releases/` (scope: `scripts/build-all.sh`; expected commit: `chore(release): build-all v1.1.648`).
2. [DONE] Git Commit: `chore(release): build-all v1.1.648` (hash: `52256542`)

### Stream 2: Build VSIX (packaging)
1. [TODO] Прогнать `./scripts/build-release.sh --use-current-version` и проверить `codeai-hub-1.1.648.vsix` (scope: `scripts/build-release.sh`; expected commit: `chore(release): package vsix v1.1.648`).
2. [TODO] Git Commit: `chore(release): package vsix v1.1.648` (hash: TBD)

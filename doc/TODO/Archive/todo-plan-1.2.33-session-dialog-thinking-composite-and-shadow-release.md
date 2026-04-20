# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/SessionDialog_ThinkingCompositeAndShadow_Release_1.2.33.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
  - `README.md`
  - `CHANGELOG.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run build:project-manager`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.

## Phase 1 — Release 1.2.33 (owner: Codex, updated: 2026-04-20)
### Stream: Packaging
1. [DONE] Обновить release-facing docs под `1.2.33` для corrected provider-facing thinking bubble shadow/chrome; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; commit: `docs: prepare 1.2.33 release notes`
2. [DONE] Git Commit: `docs: prepare 1.2.33 release notes` (hash: `2592fdc4f`)
3. [DONE] Выполнить `./scripts/build-all.sh` и зафиксировать массовые version/manifest updates release-пайплайна `1.2.33`; scope: release packaging surface, version manifests, generated bundle metadata; commit: `build: release 1.2.33`
4. [DONE] Git Commit: `build: release 1.2.33` (hash: `877abb893`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, проверить VSIX/tarball артефакты и закрыть scope архивированием planning/todo; results: `build-release.sh --use-current-version` passed with `Step 7: Verifying SDK exclusions`, `Removing dev dependencies before packaging`, `✅ Package created`; VSIX: `codeai-hub-1.2.33.vsix`; tarballs: `doc/tmp/releases/*1.2.33*`; expected commit: `docs: close 1.2.33 release scope`
6. [TODO] Git Commit: `docs: close 1.2.33 release scope` (hash: TBD)

Build notes:
- `./scripts/build-all.sh` ✅
- Unified version after build: `1.2.33`
- `./scripts/build-release.sh --use-current-version` ✅

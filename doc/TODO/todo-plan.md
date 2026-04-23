# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** `doc/SolidWorks-WorkFlow/Plans/Settings_CanonicalPath_Fix_1.2.61.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates (автоматически через Husky hooks):**
  - `git commit` -> `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` -> `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`.
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md` и документации (`doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Phase 1 — Canonical Settings Path Fix + Release 1.2.61 (owner: Codex, updated: 2026-04-23)

### Stream: Core canonical settings path
1. [DONE] Зафиксировать Core canonical read/write target на `~/.codeai-hub/settings/settings.json` и убрать `claude.json` из live runtime-path; scope: `packages/core/src/config/index.ts`, `packages/core/src/remote-bridge/handlers/settings-persistence-service.ts`; expected commit message: `fix(settings): canonicalize core settings path`
2. [DONE] Git Commit: `fix(settings): canonicalize core settings path` (hash: `14fc03392`)
3. [DONE] Убрать `claude.json` из extension-side settings storage и оставить единственным persisted snapshot файл `settings.json`; scope: `src/extension-module/settings/settings-storage.ts`; expected commit message: `fix(settings): remove legacy settings fallback`
4. [DONE] Git Commit: `fix(settings): remove legacy settings fallback` (hash: `cd14e98ee`)

### Stream: SSOT sync
5. [DONE] Обновить SSOT под canonical invariant settings path и hard cutover away from `claude.json`; scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Contracts/EffectiveModelIdentity_And_Settings_SSOT.md`; expected commit message: `docs(settings): define canonical settings path invariant`
6. [TODO] Git Commit: `docs(settings): define canonical settings path invariant` (hash: TBD)

### Stream: Release 1.2.61
7. [TODO] Подготовить release docs на будущую версию `1.2.61`; scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: prepare README/CHANGELOG for 1.2.61`
8. [TODO] Git Commit: `docs: prepare README/CHANGELOG for 1.2.61` (hash: TBD)
9. [TODO] Выполнить release pipeline `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`, зафиксировать version bumps / manifests / release artifacts; scope: release-generated files and manifests; expected commit message: `chore: release 1.2.61`
10. [TODO] Git Commit: `chore: release 1.2.61` (hash: TBD)

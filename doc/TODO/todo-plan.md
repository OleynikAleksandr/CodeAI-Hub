# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- Stream завершается после того, как все его задачи закрыты таргетными сборками затронутых пакетов/клиентов и коммитами. Для серийных задач допускается диагностический прогон `npm run build --workspace <package>` по цепочке (например, Claude → Codex → core), чтобы локализовать ошибки без запуска `build-all`.
- **Real-time Документация**:
Любое изменение архитектуры/логики требует синхронного обновления и todo-plan.md и документации (`doc/Architecture/Architecture.md` и др.) **ДО** коммита - чтоб измененные документы также попали в Git Commit.
- Phase завершается на чистом дереве:
запускаем `./scripts/build-all.sh` (он повышает версии и вызывает `./scripts/build-release.sh --use-current-version`), переносим tarball’ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.
- **doc/TODO/todo-plan.md** необходимо постоянно в риалтайме обновлять, после каждой подзадачи обязательный коммит, после каждого коммита его номер и наименование заносить, статус задачи тут же менять.

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session086.md`

## Phase 16 — Run-bound resume + release 1.1.403 (owner: Oleksandr, updated: 2026-01-11)
### Stream: Provider session binding for existing runs
1. [DONE] Привязать RUNS к provider sessions (providerId/providerSessionId + resume) — scope: `packages/core`, `packages/initiatives`, `packages/*_Module`, `src/client/ui`; ожидаемый commit message: `feat(resume): bind runs to provider sessions`
2. [DONE] Git Commit: `feat(resume): bind runs to provider sessions` (hash: 5ecc02ae)
3. [DONE] Обновить fallback webview bundle под изменения UI — scope: `media/react-chat.js`; ожидаемый commit message: `chore(ui): refresh webview fallback bundle`
4. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: 8693f508)
5. [DONE] Собрать артефакты и поднять версию до 1.1.403 (build-all) — scope: manifests + package.json; ожидаемый commit message: `chore(release): bump 1.1.403`
6. [DONE] Git Commit: `chore(release): bump 1.1.403` (hash: a6f43bf3)
7. [DONE] Обновить релизные документы (README/CHANGELOG/Architecture/SystemArchitecture/Project docs) — scope: `README.md`, `CHANGELOG.md`, `doc/**`; ожидаемый commit message: `docs: update 1.1.403 release notes`
8. [DONE] Git Commit: `docs: update 1.1.403 release notes` (hash: 955af64d)
9. [DONE] Синхронизировать архитектурные документы под 1.1.403 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; ожидаемый commit message: `docs: update architecture for 1.1.403`
10. [DONE] Git Commit: `docs: update architecture for 1.1.403` (hash: d8c657b4)
11. [DONE] Уточнить описание Runs-архитектуры (provider binding) — scope: `doc/Project_Docs/Initiative_Description_Runs_Architecture.md`; ожидаемый commit message: `docs: record run provider session binding`
12. [DONE] Git Commit: `docs: record run provider session binding` (hash: 9c92e00f)
13. [DONE] Собрать VSIX (build-release) — scope: `scripts/build-release.sh`; ожидаемый commit message: `docs: add session 87 report`
14. [DONE] Git Commit: `docs: add session 87 report` (hash: f1c9b7db)

## Phase 17 — Release 1.1.404 (owner: Oleksandr, updated: 2026-01-11)
### Stream: 1.1.404 release
1. [DONE] Build artifacts and bump version to 1.1.404 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.404`
2. [DONE] Git Commit: `chore(release): bump 1.1.404` (hash: 6f0634fc)
3. [DONE] Update release notes (README + CHANGELOG + todo-plan) — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: update 1.1.404 release notes`
4. [DONE] Git Commit: `docs: update 1.1.404 release notes` (hash: f05db65a)
5. [DONE] Update architecture docs for 1.1.404 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.404`
6. [DONE] Git Commit: `docs: update architecture for 1.1.404` (hash: 060a28f9)
7. [DONE] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 89 report`
8. [DONE] Git Commit: `docs: add session 89 report` (hash: 76eecd0a)

## Phase 18 — Preserve Codex home + release 1.1.405 (owner: Oleksandr, updated: 2026-01-11)
### Stream: Preserve Codex home on release build
1. [DONE] Preserve Codex CLI home during build cleanup + document rule — scope: `scripts/build-all.sh`, `scripts/build-codex-module.sh`, `.codeai-hub/WORKFLOW_ARCHITECTURE.md`; expected commit message: `fix(build): preserve codex home`
2. [DONE] Git Commit: `fix(build): preserve codex home` (hash: 85f6addd)
3. [DONE] Build artifacts and bump version to 1.1.405 (build-all) — scope: manifests + package.json; expected commit message: `chore(release): bump 1.1.405`
4. [DONE] Git Commit: `chore(release): bump 1.1.405` (hash: 5d2c1346)
5. [IN_PROGRESS] Update release notes (README + CHANGELOG + todo-plan) — scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs: update 1.1.405 release notes`
6. [TODO] Git Commit: `docs: update 1.1.405 release notes` (hash: TBD)
7. [TODO] Update architecture docs for 1.1.405 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update architecture for 1.1.405`
8. [TODO] Git Commit: `docs: update architecture for 1.1.405` (hash: TBD)
9. [TODO] Build VSIX (build-release) — scope: `scripts/build-release.sh`; expected commit message: `docs: add session 90 report`
10. [TODO] Git Commit: `docs: add session 90 report` (hash: TBD)

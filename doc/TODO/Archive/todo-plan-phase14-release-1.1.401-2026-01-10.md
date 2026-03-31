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

## Phase 14 — Release build preparation (owner: Oleksandr, updated: 2026-01-10)
### Stream: Release build
1. [DONE] Добавить knowledge-артефакт по стабилизации idea-артефактов и анкеты — scope: doc/Knowledge/idea-artifacts-run-context-2026-01-10.md, doc/TODO/todo-plan.md; ожидаемый commit message: `docs: add idea artifacts knowledge` (date: 2026-01-10)
2. [DONE] Git Commit: `docs: add idea artifacts knowledge` (hash: 176dd2f6) (date: 2026-01-10)
3. [DONE] Актуализировать release-документы (README/CHANGELOG/архитектура при необходимости) — scope: README.md, CHANGELOG.md, doc/TODO/todo-plan.md; ожидаемый commit message: `docs: update release notes` (date: 2026-01-10)
4. [DONE] Git Commit: `docs: update release notes` (hash: 63004467) (date: 2026-01-10)
5. [DONE] Синхронизировать release-документы под версию 1.1.401 после build-all — scope: README.md, CHANGELOG.md, doc/TODO/todo-plan.md; ожидаемый commit message: `docs: sync release version 1.1.401` (date: 2026-01-10)
6. [DONE] Git Commit: `docs: sync release version 1.1.401` (hash: baa4007a) (date: 2026-01-10)
7. [DONE] Зафиксировать результат build-all (версии/манифесты/бандлы) — scope: package.json, package-lock.json, assets/**, media/react-chat.js, packages/*/package.json, doc/TODO/todo-plan.md; ожидаемый commit message: `chore: build release artifacts` (date: 2026-01-10)
8. [DONE] Git Commit: `chore: build release artifacts` (hash: 6e04f14b) (date: 2026-01-10)
9. [DONE] Выполнить `./scripts/build-release.sh --use-current-version` и добавить VSIX — scope: codeai-hub-1.1.401.vsix, doc/TODO/todo-plan.md; ожидаемый commit message: `chore: build release vsix` (date: 2026-01-10)
10. [DONE] Git Commit: `chore: build release vsix` (hash: 4d9b7a5d) (date: 2026-01-10)
11. [DONE] Подготовить отчет сессии и обновить todo-plan по релизу — scope: doc/Sessions/Archive/Session084.md, doc/TODO/todo-plan.md; ожидаемый commit message: `docs: record release session` (date: 2026-01-10)
12. [DONE] Git Commit: `docs: record release session` (hash: af1d872f) (date: 2026-01-10)

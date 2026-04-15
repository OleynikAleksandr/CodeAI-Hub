# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** TBD (следующий execution cycle)
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполняем вручную только когда нужно проверить затронутый пакет/клиент, и обязательно перед закрытием Stream/Phase.
- **Real-time Документация:** любое изменение архитектуры/логики требует синхронного обновления и `todo-plan.md`, и релевантной документации из `doc/` **до** коммита.
- Phase завершается на чистом дереве: запускаем `./scripts/build-all.sh`, переносим tarball'ы в `doc/tmp/releases/`, фиксируем результаты в `doc/Sessions/`.

## Статус

- Активный execution scope отсутствует.
- Предыдущий scope (`Localization Incremental Sync And Thinking Visibility`) закрыт релизом `1.1.985` и заархивирован в `doc/TODO/Archive.zip` (файл `todo-plan-phase5-localization-incremental-sync.md`).
- Planning-doc этого scope перенесён в `doc/SolidWorks-WorkFlow/Plans/Archive.zip`.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT, затем согласовать с пользователем новый scope, после чего выбрать релевантные документы через `doc/SolidWorks-WorkFlow/Docs_Index.md` и собрать новый planning-doc перед заполнением этого файла.

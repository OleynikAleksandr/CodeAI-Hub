# План разработки (Development TODO Plan)

## Context Pack For This Cycle

- Активный execution scope отсутствует.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT.
- Затем согласовать с пользователем новый scope.
- После этого открыть `doc/SolidWorks-WorkFlow/Docs_Index.md`, выбрать релевантные документы для нового scope и только потом формировать новый planning-doc в `doc/SolidWorks-WorkFlow/Plans/`.
- До появления нового planning-doc и нового активного списка задач навигационной опорой служит `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Правила выполнения (Execution Rules)

- TODO Plan состоит из Phase. В каждой Phase некоторое количество Stream, в каждом Stream — микро-задачи ≤3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Gates автоматические через Husky (`./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix` на pre-commit; `npm run check:dup`, `npm run check:links` на pre-push).
- Real-time documentation: SSOT-документы синхронизируются ДО коммита.
- doc/TODO/todo-plan.md обновляется после КАЖДОГО коммита: статус задачи + hash коммита заносится сразу.
- Phase завершается на чистом дереве: `./scripts/build-all.sh` → `./scripts/build-release.sh --use-current-version` → tarball-ы в `doc/tmp/releases/`.
- Closeout запрещён до явного пользовательского retest'а финального VSIX.

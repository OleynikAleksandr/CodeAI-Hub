# План разработки (Development TODO Plan)

## Context Pack For This Cycle
- **Planning source:** TBD (следующий execution cycle)
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Каждая подзадача должна затрагивать не более 3 файлов или 3 явно ограниченных script-managed scope buckets.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Если по факту задача начинает затрагивать больше 3 файлов, она должна быть немедленно дроблена, а этот файл переписан до продолжения работы.
- После каждого коммита сразу обновлять `doc/TODO/todo-plan.md`: статус, дата, hash.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:knip`, `npm run format:fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **Таргетные сборки** выполнять вручную перед закрытием затронутого Stream/Phase: `npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`
- **Real-time документация:** любое изменение архитектуры/логики должно попасть в релевантные SSOT-доки в том же execution cycle и до финального release-stream.
- Финальный release-stream выполняется только на чистом дереве: сначала `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`.

## Статус

- Активный execution scope отсутствует.
- Предыдущий scope (`Anthropic Claude Haiku 4.5 translation engine`) закрыт релизом `1.1.986` и заархивирован в `doc/TODO/Archive/todo-plan-phase6-haiku-translation.md`.
- Planning-doc этого scope перенесён в `doc/SolidWorks-WorkFlow/Plans/Archive/Localization_TranslationEngine_AnthropicHaiku_Architecture.md`.
- Следующий агент обязан сначала прочитать `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` как базовый SSOT, затем согласовать с пользователем новый scope, после чего выбрать релевантные документы через `doc/SolidWorks-WorkFlow/Docs_Index.md` и собрать новый planning-doc перед заполнением этого файла.

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
1. `doc/Project_Docs/Initiative_Description_Runs_Architecture.md`
2. `doc/Architecture/Architecture.md`
3. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
4. `.codeai-hub/WORKFLOW_ARCHITECTURE.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session085.md`

## Phase 15 — Initiative Description Runs (owner: Oleksandr, updated: 2026-01-11)
### Stream: Run metadata + questionnaire seeding
1. [DONE] Добавить `lastQuestionnaireAt` в run.json и поддержку чтения/записи — scope: packages/initiatives/src/run-store.ts, packages/initiatives/src/index.ts; commit: `feat(runs): add lastQuestionnaireAt metadata` (date: 2026-01-11)
2. [DONE] Git Commit: `feat(runs): add lastQuestionnaireAt metadata` (hash: ace7ee38) (date: 2026-01-11)
3. [TODO] Обновлять `lastQuestionnaireAt` при записи анкеты через Core — scope: packages/core/src/remote-bridge/handlers/workspace-file-service.ts, packages/initiatives/src/run-store.ts, packages/initiatives/src/index.ts; ожидаемый commit message: `feat(core): track questionnaire updates`
4. [TODO] Git Commit: `feat(core): track questionnaire updates` (hash: TBD)
5. [TODO] Сидировать новую анкету из последнего run по `lastQuestionnaireAt` — scope: packages/core/src/remote-bridge/handlers/auto-run-service.ts, packages/initiatives/src/run-store.ts, packages/initiatives/src/index.ts; ожидаемый commit message: `feat(runs): seed questionnaire from latest`
6. [TODO] Git Commit: `feat(runs): seed questionnaire from latest` (hash: TBD)

### Stream: UI run selection + session binding
7. [TODO] Добавить UX «Описать инициативу» с выбором нового/существующего описания и списком runSlug — scope: src/client/ui/src/app-host/session-region.tsx, src/client/ui/src/app-host/flow-wizard-picker.tsx, src/client/ui/src/api/orchestrator/runs-client.ts; ожидаемый commit message: `feat(ui): add description run selection`
8. [TODO] Git Commit: `feat(ui): add description run selection` (hash: TBD)
9. [TODO] Передавать `runSlug` при `session:create` и отключать auto-run при переданном `runSlug` — scope: src/client/ui/src/core-bridge/core-bridge.ts, packages/core/src/remote-bridge/handlers/session-request-handler.ts; ожидаемый commit message: `feat(core): support runSlug session create`
10. [TODO] Git Commit: `feat(core): support runSlug session create` (hash: TBD)
11. [TODO] Открывать диалог или анкету в зависимости от наличия сессии run — scope: src/client/ui/src/app-host/session-region.tsx, src/client/ui/src/services/idea-collector-service.ts, src/client/ui/src/services/idea-questionnaire-service.ts; ожидаемый commit message: `feat(ui): resume description runs`
12. [TODO] Git Commit: `feat(ui): resume description runs` (hash: TBD)

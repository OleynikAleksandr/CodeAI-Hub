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
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/SolidWorks-Flow/System/IdeaCollector_Artifact_Revisions_Architecture.md`
4. `doc/TODO/todo-plan.md`

## Phase 28 — Unified Idea Collector finalize flow (owner: Oleksandr, updated: 2026-01-12)
### Stream: Contract simplification + repeatable finalize
1. [DONE] Contract: убрать `revise_artifacts`/`artifact.patch`, зафиксировать finalize как повторяемый — scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `doc/SolidWorks-Flow/System/IdeaCollector_Slim_Structured_Output.md`; expected commit message: `feat(idea): simplify contract finalize-only`
2. [DONE] Git Commit: `feat(idea): simplify contract finalize-only` (hash: bf296fc0)
3. [DONE] Prompt: требовать «ОК/Утверждаю» перед каждым finalize, убрать правила revise_artifacts — scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `src/client/ui/src/app-host/idea-kickoff-prompt.ts`; expected commit message: `docs(idea): require explicit confirm per finalize`
4. [DONE] Git Commit: `docs(idea): require explicit confirm per finalize` (hash: 46c7142e)
5. [DONE] UI: finalize-only, повторные сохранения артефактов, убрать patch — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `src/client/ui/src/services/idea-artifact-persistence.ts`, `src/client/ui/src/services/idea-collector-service.ts`; expected commit message: `feat(ui): allow repeated finalize artifact saves`
6. [DONE] Git Commit: `feat(ui): allow repeated finalize artifact saves` (hash: b8586443)
7. [DONE] Claude provider: убрать single-finalize lock, добавить дедуп по uuid — scope: `packages/Claude_Module/src/messaging/message-processor.ts`; expected commit message: `fix(claude): allow repeated finalize events`
8. [DONE] Git Commit: `fix(claude): allow repeated finalize events` (hash: 5f1ce031)
9. [DONE] Codex provider: убрать single-finalize lock, добавить дедуп по uuid — scope: `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `fix(codex): allow repeated finalize events`
10. [DONE] Git Commit: `fix(codex): allow repeated finalize events` (hash: 6e3c1d49)
11. [DONE] Docs: обновить архитектуру под повторяемый finalize — scope: `doc/Architecture/Architecture.md`, `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: update architecture for repeatable finalize`
12. [DONE] Git Commit: `docs: update architecture for repeatable finalize` (hash: 9fc806f5)
13. [DONE] Обновить fallback webview bundle — scope: `media/react-chat.js`; expected commit message: `chore(ui): refresh webview fallback bundle`
14. [DONE] Git Commit: `chore(ui): refresh webview fallback bundle` (hash: a630fa81)
15. [DONE] Gates + targeted builds для затронутых пакетов — scope: scripts/commands; expected commit message: `docs: update todo plan status`
16. [DONE] Git Commit: `docs: update todo plan status` (hash: 62b17b24)

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение протоколов/архитектуры требует синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`

## Phase 29 — Artifact Upsert Protocol (Variant B) (owner: Oleksandr, updated: 2026-01-13)
### Stream: Design approval
1. [DONE] Утвердить архитектуру Variant B — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: approve artifact upsert protocol vB`
2. [DONE] Git Commit: `docs: approve artifact upsert protocol vB` (hash: b24f798b)

### Stream: Core slot→path + upsert endpoint (MVP)
1. [DONE] Core: добавить slot→path mapping для Idea stage и новый upsert контракт (artifacts[]: slot+markdown) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): add artifact upsert protocol vB`
2. [DONE] Git Commit: `feat(core): add artifact upsert protocol vB` (hash: 03397944)

### Stream: UI accept partial artifacts + no agent paths
1. [DONE] UI: принимать partial artifacts и писать только то, что пришло (без требований "оба файла"), убрать зависимость от agent paths — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `src/client/ui/src/services/idea-artifact-persistence.ts`, `src/client/ui/src/services/idea-collector-service.ts`; expected commit message: `feat(ui): persist artifact upserts by slot`
2. [DONE] Git Commit: `feat(ui): persist artifact upserts by slot` (hash: 1b5ac333)

### Stream: Agent contract simplification (Idea Collector)
1. [DONE] Contract: заменить artifact.*_path и next_action на artifacts[] (slot+markdown), обновить prompt — scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`; expected commit message: `feat(idea): switch to artifact upsert protocol vB`
2. [DONE] Git Commit: `feat(idea): switch to artifact upsert protocol vB` (hash: fef0d66e)

### Stream: Compatibility + cleanup
1. [DONE] Compatibility: поддержать new→legacy fallback на переходный период, добавить защиту от silent-drop — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `doc/Architecture/Architecture.md`; expected commit message: `fix: prevent silent artifact drops (vB)`
2. [DONE] Git Commit: `fix: prevent silent artifact drops (vB)` (hash: d9ddc01d)

## Phase 30 — Workflow Tree Workbench Shell (owner: Oleksandr, updated: 2026-01-15)
### Stream: Workbench shell
1. [DONE] UI: собрать Workbench-раскладку (контекстный сайдбар, tool palette, status bar, сплит сессии/артефактов + ресайз) с синхронизацией доков — scope: `src/client/project-manager/`, `packages/ui/project-manager/`, `docs (README.md, CHANGELOG.md, doc/)`; expected commit message: `feat(project-manager): workflow tree workbench shell`
2. [DONE] Git Commit: `feat(project-manager): workflow tree workbench shell` (hash: TBD)

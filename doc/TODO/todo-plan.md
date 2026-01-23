# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 76 — Bugfix: live refresh Final_Description.md in Project Manager (owner: Oleksandr, updated: 2026-01-23)

### Stream: Core workflow events source-of-truth
1. [DONE] Fix(core): подключить `WorkflowEventsService` к `WorkflowRuntime` watcher (чтобы `/api/v1/orchestrator/workflow-events` реально возвращал `workflow.artifact.written` с `filePath`) — scope: `packages/core/src/remote-bridge/index.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/workflow/runtime/workflow-runtime.ts`; expected commit message: `fix(core): record workflow watcher events`
2. [DONE] Git Commit: `fix(core): record workflow watcher events` (hash: 1e58390c)

### Stream: Project Manager artifact panel auto-refresh
1. [DONE] Fix(ui): обновлять артефакт в панели при изменении файла (Final_Description.md и любые workflow artifacts) на основании событий `workflow.artifact.written` — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`, `src/client/project-manager/services/workflow-events-client.ts`; expected commit message: `fix(project-manager): refresh artifact viewer on workflow events`
2. [DONE] Git Commit: `fix(project-manager): refresh artifact viewer on workflow events` (hash: 380295bf)

### Stream: Verification
1. [DONE] Gates + builds: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, `npm run build:core`, `npm run build:project-manager`, `npm run typecheck:webview` — scope: scripts; expected commit message: `chore: verify workflow artifact refresh`
2. [TODO] Git Commit: `chore: verify workflow artifact refresh` (hash: TBD)

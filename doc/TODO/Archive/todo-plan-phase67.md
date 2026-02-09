# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/WorkflowStateFastRestore_Architecture.md`
2. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)
4. `doc/Sessions/Session039.md`

---

## Phase 67 — Workflow Tree fast restore after Core restart (owner: Oleksandr, updated: 2026-01-21)

### Stream: Design — MVP contract approval
1. [DONE] Docs: утвердить MVP-контракт восстановления workflow дерева через `workspacePath` в `workflow-state` API; зафиксировать критерии решения по “сложному варианту” (persist workflow state) — scope: `doc/SolidWorks-Flow/System/WorkflowStateFastRestore_Architecture.md`; expected commit message: `docs(arch): approve workflow-state fast restore MVP`
2. [DONE] Git Commit: `docs(arch): approve workflow-state fast restore MVP` (hash: ea850b5e)

### Stream: MVP Fix — pass workspacePath to workflow-state
1. [DONE] Fix(core): принять `workspacePath` (query) в `workflow-state` и использовать как `workspaceRoot` для чтения `description-step.json` + continuity (fallback: текущая логика) — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit message: `fix(core): use workspacePath for workflow-state restore`
2. [DONE] Git Commit: `fix(core): use workspacePath for workflow-state restore` (hash: d0d198fb)
3. [DONE] Fix(project-manager): расширить workflow-state fetch для опционального `workspacePath` (client + api) — scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-state-query.ts`, `src/client/project-manager/api.ts`; expected commit message: `fix(project-manager): accept workspacePath in workflow-state fetch`
4. [DONE] Git Commit: `fix(project-manager): accept workspacePath in workflow-state fetch` (hash: 863cc9fb)
5. [DONE] Fix(project-manager): прокинуть `workspacePath` в polling workflow-state (tree + main-area) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): pass workspacePath in workflow polls`
6. [DONE] Git Commit: `fix(project-manager): pass workspacePath in workflow polls` (hash: 89b1be0f)
7. [DONE] Fix(project-manager): прокинуть `workspacePath` в reviewer visibility polling — scope: `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`; expected commit message: `fix(project-manager): include workspacePath in reviewer visibility`
8. [DONE] Git Commit: `fix(project-manager): include workspacePath in reviewer visibility` (hash: be455227)

### Stream: UX Hardening — faster initial refresh
1. [DONE] Change(project-manager): ускорить initial refresh после reconnection (например, кратковременный polling 2–5s до первого успешного ответа, затем 15s) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): speed up initial workflow-state refresh`
2. [DONE] Git Commit: `fix(project-manager): speed up initial workflow-state refresh` (hash: 4800b40c)

### Stream: Verify — manual
1. [DONE] Verify(manual): рестарт Core → дерево `Description` восстанавливается быстро (без ожидания ~60s), ветка содержит 2 строки (`Final_Description.md` + Reviewer session) — scope: no files; expected commit message: `docs: record workflow restore verification`
2. [DONE] Git Commit: `docs: record workflow restore verification` (hash: 0509038c)

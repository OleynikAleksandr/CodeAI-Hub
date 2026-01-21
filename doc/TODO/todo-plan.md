# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/WorkflowStateFastRestore_Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md` (THIS FILE)
4. `doc/Sessions/Session039.md`

---

## Phase 67 — Workflow Tree fast restore after Core restart (owner: Oleksandr, updated: 2026-01-21)

### Stream: Design — MVP contract approval
1. [TODO] Docs: утвердить MVP-контракт восстановления workflow дерева через `workspacePath` в `workflow-state` API; зафиксировать критерии решения по “сложному варианту” (persist workflow state) — scope: `doc/Project_Docs/WorkflowStateFastRestore_Architecture.md`; expected commit message: `docs(arch): approve workflow-state fast restore MVP`
2. [TODO] Git Commit: `docs(arch): approve workflow-state fast restore MVP` (hash: TBD)

### Stream: MVP Fix — pass workspacePath to workflow-state
1. [TODO] Fix(core): принять `workspacePath` (query) в `workflow-state` и использовать как `workspaceRoot` для чтения `description-step.json` + continuity (fallback: текущая логика) — scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`; expected commit message: `fix(core): use workspacePath for workflow-state restore`
2. [TODO] Git Commit: `fix(core): use workspacePath for workflow-state restore` (hash: TBD)
3. [TODO] Fix(project-manager): передавать `workspacePath` во все `getWorkflowState(workspaceSlug)` вызовы (tree + main-area + reviewer visibility) — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): include workspacePath in workflow-state fetch`
4. [TODO] Git Commit: `fix(project-manager): include workspacePath in workflow-state fetch` (hash: TBD)

### Stream: UX Hardening — faster initial refresh
1. [TODO] Change(project-manager): ускорить initial refresh после reconnection (например, кратковременный polling 2–5s до первого успешного ответа, затем 15s) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/sessions/reviewer-session-visibility.ts`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): speed up initial workflow-state refresh`
2. [TODO] Git Commit: `fix(project-manager): speed up initial workflow-state refresh` (hash: TBD)

### Stream: Verify — manual
1. [TODO] Verify(manual): рестарт Core → дерево `Description` восстанавливается быстро (без ожидания ~60s), ветка содержит 2 строки (`Final_Description.md` + Reviewer session) — scope: no files; expected commit message: `docs: record workflow restore verification`
2. [TODO] Git Commit: `docs: record workflow restore verification` (hash: TBD)

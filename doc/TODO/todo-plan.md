# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- TODO Plan состоит из Phase (Фаз). В каждой Phase несколько Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`
2. `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`
3. `doc/Project_Docs/Workflow_CLI_Steps_And_Watcher_Architecture.md`
4. `doc/Project_Docs/SessionContinuity/SessionContinuity_Architecture.md`
5. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
6. `doc/Sessions/Session026.md`
7. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 63 — Project Manager: Description node UX simplification (owner: Oleksandr, updated: 2026-01-20)

### Stream: Planning — archive Phase 62
1. [DONE] Docs(todo): заархивировать старый `doc/TODO/todo-plan.md` и создать новый план Phase 63 — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase62-2026-01-20.md`; expected commit message: `docs(todo): start phase 63 plan`
2. [DONE] Git Commit: `docs(todo): start phase 63 plan` (hash: a888a02a)

### Stream: Design — утвердить UX контракт для Description
1. [DONE] Docs: зафиксировать UX правила (после `Final_Description.md` в ветке остаются только `Final_Description.md` + `Reviewer session`; промежуточные артефакты/сессии показываем только до появления финала; continuity/handoff не отображаем в дереве) — scope: `doc/SolidWorks-Flow/Architecture/DescriptionNode_ReviewSession_Architecture.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs(project-manager): simplify description branch UX`
2. [DONE] Git Commit: `docs(project-manager): simplify description branch UX` (hash: f7411af7)

### Stream: Implementation — убрать “зверинец” из дерева Description
1. [DONE] Fix(project-manager): полностью скрыть continuity/handoff chains из Workspace Tree (они нужны ядру, но не UI дерева) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): hide continuity nodes in tree`
2. [DONE] Git Commit: `fix(project-manager): hide continuity nodes in tree` (hash: 14f99be7)

3. [DONE] Fix(project-manager): убрать кнопку `Continue`; строка сессии кликабельна и по клику создаёт/возобновляет сессию (чтобы после перезагрузки пользователь мог восстановить reviewer-сессию из persisted координат) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): open session on tree click`
4. [DONE] Git Commit: `fix(project-manager): open session on tree click` (hash: f3d2d543)

5. [DONE] Feat(project-manager): клик по `Final_Description.md` открывает встроенный viewer в правой панели Artifacts (не VS Code editor tab) — scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/api.ts`; expected commit message: `feat(project-manager): open artifacts in built-in viewer`
6. [DONE] Git Commit: `feat(project-manager): open artifacts in built-in viewer` (hash: 1211894b)

### Stream: Integration — минимальный API для чтения артефактов (безопасно)
1. [DONE] Feat(core): добавить allowlisted API для чтения workflow-артефактов (Project Manager viewer) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/workflow-artifact-http-handler.ts`; expected commit message: `feat(core): expose artifact read endpoint for project-manager`
2. [DONE] Git Commit: `feat(core): expose artifact read endpoint for project-manager` (hash: dff95c0c)

### Stream: Verification
1. [TODO] Verify(manual): сценарий Description завершён → под узлом только 2 строки (`Final_Description.md` + `Reviewer session`); клик по файлу открывает viewer справа; клик по сессии открывает полную сессию слева даже после перезагрузки — scope: no files; expected commit message: `docs: record project-manager description UX verification`
2. [TODO] Git Commit: `docs: record project-manager description UX verification` (hash: TBD)

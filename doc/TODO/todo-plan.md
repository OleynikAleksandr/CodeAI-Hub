# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
2. `doc/Project_Docs/ProjectManager/AddWorkspace_Architecture.md`
3. `doc/Sessions/Session049.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 78 — Project Manager: Add Workspace + Worktree Init + Multi-workspace Switching (owner: Oleksandr, updated: 2026-01-23)

### Stream: Core workspace registry (slug source-of-truth)
1. [TODO] Feat(core): добавить `WorkspaceProject.slug`, генерацию уникального slug + миграцию старых `projects.json` без slug — scope: `packages/core/src/services/project-registry/types.ts`, `packages/core/src/services/project-registry/project-registry.ts`, `packages/core/src/services/project-registry/project-registry-storage.ts`; expected commit message: `feat(core): persist workspace slugs in registry`
2. [TODO] Git Commit: `feat(core): persist workspace slugs in registry` (hash: TBD)

### Stream: Project Manager uses slug for workflow APIs
1. [TODO] Fix(project-manager): прокинуть `workspace.slug` из `projects:update` и использовать его в `WorkspaceTree` вместо `toWorkflowWorkspaceSlug(workspaceName)` — scope: `src/client/project-manager/types.ts`, `src/client/project-manager/components/layout/sidebar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): use workspace slugs for workflow tree`
2. [TODO] Git Commit: `fix(project-manager): use workspace slugs for workflow tree` (hash: TBD)

3. [TODO] Fix(project-manager): перевести `MainArea` (workflow-state/events polling, resume intents) на `workspace.slug` (без вычисления из имени) — scope: `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): use workspace slug in main area`
4. [TODO] Git Commit: `fix(project-manager): use workspace slug in main area` (hash: TBD)

### Stream: Add workspace UI (CEF-safe)
1. [TODO] Feat(project-manager): Add workspace работает без VS Code bridge (fallback: модалка ввода абсолютного пути + optional name) — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/main-layout.tsx`, `src/client/project-manager/styles/layout.css`; expected commit message: `feat(project-manager): add add-workspace modal fallback`
2. [TODO] Git Commit: `feat(project-manager): add add-workspace modal fallback` (hash: TBD)

### Stream: Worktree init on add
1. [TODO] Feat(project-manager): после добавления workspace выполнить init через `POST /api/v1/orchestrator/workspace-session` (создание `.codeai-hub/<slug>` + watcher connect) — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/services/workspace-session-client.ts`, `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `feat(project-manager): init workflow worktree on add workspace`
2. [TODO] Git Commit: `feat(project-manager): init workflow worktree on add workspace` (hash: TBD)

### Stream: Docs sync + verification
1. [TODO] Docs: отметить `AddWorkspace_Architecture.md` как Approved и добавить краткое описание в системную архитектуру — scope: `doc/Project_Docs/ProjectManager/AddWorkspace_Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: add project-manager add-workspace architecture`
2. [TODO] Git Commit: `docs: add project-manager add-workspace architecture` (hash: TBD)

3. [TODO] Verification: прогнать гейты + таргетные сборки (`npm run build:core`, `npm run build:project-manager`, при необходимости `npm run typecheck:webview`) — scope: scripts; expected commit message: `chore: verify add workspace feature`
4. [TODO] Git Commit: `chore: verify add workspace feature` (hash: TBD)

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream с микрозадачами.
- Каждая микрозадача затрагивает ≤ 3 файлов.
- Каждая микрозадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` отдельной строкой.
- Gates после каждой микрозадачи: `./scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем таргетная сборка.
- Коммит делаем только после зелёных гейтов; сразу обновляем статусы и hash.

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`
3. `doc/Sessions/Archive/Session049.md`
4. `doc/TODO/todo-plan.md` (THIS FILE)

---

## Phase 78 — Project Manager: Add Workspace + Worktree Init + Multi-workspace Switching (owner: Oleksandr, updated: 2026-01-23)

### Stream: Planning
1. [DONE] Docs(todo): заархивировать завершённый план Phase 77 и создать новый план Phase 78 — scope: `doc/TODO/todo-plan.md`, `doc/TODO/Archive/todo-plan-phase77-release-1.1.475-2026-01-23.md`; expected commit message: `docs(todo): start Phase 78 plan`
2. [DONE] Git Commit: `docs(todo): start Phase 78 plan` (hash: fe39a731)

### Stream: Design (approved)
1. [DONE] Docs: добавить и утвердить архитектуру Add Workspace (MVP) — scope: `doc/SolidWorks-Flow/System/ProjectManager/AddWorkspace_Architecture.md`; expected commit message: `docs(project-manager): add add-workspace architecture`
2. [DONE] Git Commit: `docs(project-manager): add add-workspace architecture` (hash: 00009a17)

### Stream: Core workspace registry (slug source-of-truth)
1. [DONE] Feat(core): добавить `WorkspaceProject.slug` в registry + миграцию старых `projects.json` без slug — scope: `packages/core/src/services/project-registry/types.ts`, `packages/core/src/services/project-registry/project-registry.ts`; expected commit message: `feat(core): persist workspace slugs in registry`
2. [DONE] Git Commit: `feat(core): persist workspace slugs in registry` (hash: bbbb70ab)

### Stream: Project Manager uses slug (no name-derived collisions)
1. [DONE] Fix(project-manager): `Sidebar` прокидывает `workspaceSlug` в `WorkspaceTree` (и дерево использует slug, если он есть) — scope: `src/client/project-manager/components/layout/sidebar.tsx`, `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): use workspace slugs in tree`
2. [DONE] Git Commit: `fix(project-manager): use workspace slugs in tree` (hash: e5a46680)

3. [DONE] Fix(project-manager): расширить `WorkspaceProject` тип полем `slug` (UI) — scope: `src/client/project-manager/types.ts`; expected commit message: `fix(project-manager): include workspace slug in ui types`
4. [DONE] Git Commit: `fix(project-manager): include workspace slug in ui types` (hash: 19b84dcd)

5. [DONE] Fix(project-manager): перевести `MainArea` polling (workflow-state + workflow-events) на `workspace.slug` — scope: `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): use workspace slug in main area`
6. [DONE] Git Commit: `fix(project-manager): use workspace slug in main area` (hash: 27180e19)

### Stream: Add workspace UI (CEF-safe)
1. [DONE] Feat(project-manager): `api.pickFolder()` возвращает `boolean` и диспатчит `pm:workspace:add-requested` (для детерминированного init) — scope: `src/client/project-manager/api.ts`; expected commit message: `feat(project-manager): add workspace picker fallback hooks`
2. [DONE] Git Commit: `feat(project-manager): add workspace picker fallback hooks` (hash: d54d5edb)

3. [DONE] Feat(project-manager): Add workspace работает без VS Code bridge (fallback: модалка ввода абсолютного пути + optional name) — scope: `src/client/project-manager/components/layout/main-layout.tsx`, `packages/ui/project-manager/styles.css`; expected commit message: `feat(project-manager): add add-workspace modal fallback`
4. [DONE] Git Commit: `feat(project-manager): add add-workspace modal fallback` (hash: 5655a1bf)

### Stream: Worktree init on add
1. [DONE] Feat(project-manager): init `.codeai-hub/<slug>` через `POST /api/v1/orchestrator/workspace-session` после add/activate workspace — scope: `src/client/project-manager/services/workspace-session-client.ts`, `src/client/project-manager/components/layout/main-layout.tsx`; expected commit message: `feat(project-manager): init workflow worktree on add workspace`
2. [DONE] Git Commit: `feat(project-manager): init workflow worktree on add workspace` (hash: 2bef80ba)

### Stream: Questionnaire + IdeaCollector use stable slug
1. [DONE] Fix(project-manager): `DescriptionQuestionnaireService` использует `workspace.slug` для `initiativeSlug` и пути анкеты — scope: `src/client/project-manager/services/description-questionnaire-utils.ts`, `src/client/project-manager/services/description-questionnaire-service.ts`; expected commit message: `fix(project-manager): use workspace slug in questionnaire service`
2. [DONE] Git Commit: `fix(project-manager): use workspace slug in questionnaire service` (hash: a8093fd8)

3. [DONE] Fix(project-manager): `IdeaCollectorSubmitService` и `DescriptionQuestionnairePanel` прокидывают `workspaceSlug` и используют его для артефактов/сессий — scope: `src/client/project-manager/services/idea-collector-submit-service.ts`, `src/client/project-manager/components/description/description-questionnaire-panel.tsx`; expected commit message: `fix(project-manager): use workspace slug in idea collector`
4. [DONE] Git Commit: `fix(project-manager): use workspace slug in idea collector` (hash: 2b985f73)

### Stream: Docs sync + verification
1. [DONE] Docs: обновить `SystemArchitecture.md` под Add Workspace (кратко: slug, modal fallback, worktree init) — scope: `doc/SolidWorks-Flow/System/SystemArchitecture.md`; expected commit message: `docs: document project-manager add-workspace`
2. [DONE] Git Commit: `docs: document project-manager add-workspace` (hash: 7652498f)

3. [DONE] Verification: прогнать гейты + таргетные сборки (`npm run build:core`, `npm run build:project-manager`, при необходимости `npm run typecheck:webview`) — scope: scripts; expected commit message: `chore: verify add workspace feature`
4. [DONE] Git Commit: `chore: verify add workspace feature` (hash: aa770fdd)

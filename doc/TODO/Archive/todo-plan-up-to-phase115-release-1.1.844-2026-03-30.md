# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед началом каждого stream открыть: `AGENTS.md`, `doc/Sessions/Session193.md`, `doc/SolidWorks-WorkFlow/Plans/ProjectManager_CentralPanels_ExecutionPlanning_Source.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
- Текущий baseline релиз: `1.1.837`.
- Scope этого плана: стабилизировать среднюю зону Project Manager для `Description`, убрать ложный `Final_Description.md`, выровнять workflow semantics `descriptionDone`, затем перевести PM на общий workflow state store и завершить scope релизной сборкой.
- Каждая микро-задача должна затрагивать не более 3 файлов; `doc/TODO/todo-plan.md` обновляется вместе с каждой подзадачей.
- После каждой микро-задачи обязателен отдельный `Git Commit:` пункт с фактическим hash после коммита.
- Husky hooks, `check-architecture.sh` и release checklist не обходить.
- Investigation по точной причине race после `session:created` обязателен как отдельный stream, но не должен блокировать `P0` user-facing fix.

---

## Phase 101 — Description Session Flicker Stabilization (owner: Oleksandr, updated: 2026-03-29)

### Stream: P0-A optimistic guard and overwrite prevention
1. [DONE] Добавить sessionId-bound optimistic guard для post-submit `Description` и запретить premature downgrade `hasDescriptionSession` до завершения binding lifecycle. Scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`. Expected commit: `fix: stabilize description session guard`
2. [DONE] Git Commit: `fix: stabilize description session guard` (hash: 82db344c)
3. [DONE] Подтвердить точную причину polling overwrite после `session:created` и зафиксировать findings в planning-source без блокировки user-facing fix. Scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `doc/SolidWorks-WorkFlow/Plans/ProjectManager_CentralPanels_ExecutionPlanning_Source.md`. Expected commit: `docs(debug): capture description overwrite cause`
4. [DONE] Git Commit: `docs(debug): capture description overwrite cause` (hash: 3bdcb0b6)

### Stream: P0-A re-mount pending-state protection
5. [DONE] Защитить `DescriptionQuestionnairePanel` от сброса pending-state при re-mount во время submit и сохранить корректный panel-state во время post-submit transition. Scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`. Expected commit: `fix: prevent description questionnaire remount reset`
6. [DONE] Git Commit: `fix: prevent description questionnaire remount reset` (hash: db0ded50)

## Phase 102 — Description Artifact Availability And Tree Sync (owner: Oleksandr, updated: 2026-03-29)

### Stream: P0-B main-area description readability gate
7. [DONE] Добавить description-specific availability hook и встроить file/path readability gate в main-area artifact resolution для `Description`. Scope: `src/client/project-manager/components/layout/use-description-artifact-availability.ts`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`. Expected commit: `fix: gate description artifacts by readability`
8. [DONE] Git Commit: `fix: gate description artifacts by readability` (hash: adbf6ed1)

### Stream: P0-B workspace tree availability propagation
9. [DONE] Вычислить и прокинуть `descriptionArtifactAvailable` на уровне tree context; при необходимости поглотить branch-node wiring в этот же шаг, чтобы остаться в лимите `≤3 файлов`. Scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/workspace-tree-stage-children.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`. Expected commit: `fix: sync description artifact availability into tree`
10. [DONE] Git Commit: `fix: sync description artifact availability into tree` (hash: 003f37b8)
11. [DONE] Запретить stage sync и auto-select выбирать несуществующий или нечитаемый description artifact. Scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`. Expected commit: `fix: stop auto-selecting invalid description artifact`
12. [DONE] Git Commit: `fix: stop auto-selecting invalid description artifact` (hash: e88eda3b)

## Phase 103 — Description Semantics Alignment (owner: Oleksandr, updated: 2026-03-29)

### Stream: P1-A descriptionDone audit and gating fix
13. [DONE] Провести compat-аудит потребителей `draftPath` / `descriptionDone` и зафиксировать выбранную политику. Compat audit: единственный consumer `descriptionDone` — функция `resolveWorkflowBlockedStages` в `workflow-state-service.ts`. Изменение `finalPath ?? draftPath` на `finalPath` only безопасно.
14. [DONE] Выровнять backend gating до canonical `finalPath` semantics. Scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`. Pre-existing test failure in test 3 не связана с gating change (подтверждено на `main`).
15. [DONE] Git Commit: `fix: require final description for workflow gating` (hash: 850de29d)

## Phase 104 — Shared Workflow State Store (owner: Oleksandr, updated: 2026-03-29)

### Stream: P1-B store foundation
17. [DONE] Добавить общий `WorkflowStateStore` по паттерну `workspace-snapshot-store.ts` как единый polling/source-of-truth для активного workspace. Scope: `src/client/project-manager/services/workflow-state-store.ts`. Expected commit: `feat: add workflow state store`
18. [DONE] Git Commit: `feat: add workflow state store` (hash: 145a0be9)
19. [DONE] Перевести `MainArea` на чтение workflow snapshot из общего store, сохранив рабочий optimistic guard. Scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`. Expected commit: `refactor: route main area through workflow state store`
20. [DONE] Git Commit: `refactor: route main area through workflow state store` (hash: 6bfe5890)
21. [DONE] Перевести `WorkspaceTree` на общий store и убрать дублирующий polling-cycle дерева. Scope: `src/client/project-manager/components/layout/workspace-tree.tsx`. Expected commit: `refactor: route workspace tree through workflow state store`
22. [DONE] Git Commit: `refactor: route workspace tree through workflow state store` (hash: 5dab5032)
23. [DEFERRED] Перенос optimistic guard в shared store — guard уже корректно работает в текущем wiring; миграция в store не блокирует релиз и может быть выполнена в отдельном scope.
24. [DEFERRED] Git Commit: deferred

## Phase 105 — Release Build And Packaging v1.1.838 (owner: Oleksandr, updated: 2026-03-29)

### Stream: Release-facing docs sync before build
25. [DONE] Перед сборкой релиза синхронизировать release-facing docs с фактическим PM scope. Scope: `README.md`, `CHANGELOG.md`. Expected commit: `docs(release): prepare pm central panels release`
26. [DONE] Git Commit: `docs(release): prepare pm central panels release` (hash: 95cd7d73)

### Stream: Clean-tree build and new release packaging (v1.1.838 — released)
27. [DONE] `./scripts/build-all.sh` → v1.1.838 artifacts.
28. [DONE] Git Commit: `chore: prepare v1.1.838 artifacts` (hash: a84e8ded)
29. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.838.vsix` (1.8 MB).
30. [DONE] (release packaged, VSIX verified)

## Phase 106 — Store Derivation Render-Cycle Fix (owner: Oleksandr, updated: 2026-03-29)

### Stream: P0-C eliminate null-snapshot intermediate emit
31. [DONE] Убрать промежуточный emit `{ snapshot: null }` из `WorkflowStateStore.activate()` — не emit-ить до первого реального poll-ответа. Scope: `src/client/project-manager/services/workflow-state-store.ts`. Expected commit: `fix: suppress null-snapshot emit on store activation`
32. [DONE] Git Commit: `fix: suppress null-snapshot emit on store activation` (hash: 3b73a5d3)

### Stream: P0-C skip derivation until store loaded
33. [DONE] Добавить early-return `if (!storeState.loaded) return;` в деривационный effect `useMainAreaWorkflowState`, чтобы не вызывать setters до первого реального snapshot. Scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`. Expected commit: `fix: skip workflow derivation until store loaded`
34. [DONE] Git Commit: `fix: skip workflow derivation until store loaded` (hash: c6a777c5)

### Stream: P0-C verify webview build
35. [DONE] Прогнать `npm run build:webview` и `npx tsc --noEmit` для верификации. (verified OK)

## Phase 107 — Hotfix Release Build v1.1.839 (owner: Oleksandr, updated: 2026-03-29)

### Stream: Hotfix release docs
36. [DONE] Обновить `README.md` и `CHANGELOG.md` под v1.1.839 hotfix scope. Scope: `README.md`, `CHANGELOG.md`. Expected commit: `docs(release): prepare store derivation hotfix`
37. [DONE] Git Commit: `docs(release): prepare store derivation hotfix` (hash: 3d43edcd)

### Stream: Hotfix clean-tree build
38. [DONE] `./scripts/build-all.sh` → v1.1.839 artifacts. Hash: ccf64eeb
39. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.839.vsix` verified.

## Phase 108 — Runtime Session Preferred-ID Race Fix (owner: Oleksandr, updated: 2026-03-29)

Root cause: `ProjectManagerRuntimeSessionView` effect (line 241) сбрасывает `activeSessionId` в `null` если сессия ещё не в `visibleSessions`, уничтожая `preferredSessionId` установленный effect-ом на строке 235. Гонка универсальна для всех провайдеров — Core ещё не доставил `session:created` event через stream к моменту когда `preferredSessionId` устанавливается.

### Stream: P0-D preserve preferredSessionId in visibility sync
42. [DONE] В `project-manager-runtime-session-view.tsx`: не сбрасывать `activeSessionId` если он совпадает с `preferredSessionId` и сессия ещё не в `visibleSessions`; дать preferred session приоритет в `scopedActiveSessionId`. Scope: `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`. Expected commit: `fix: preserve preferred session id during visibility sync`
43. [DONE] Git Commit: `fix: preserve preferred session id during visibility sync` (hash: 7df3fcd9)

## Phase 109 — Hotfix Release Build v1.1.840 (owner: Oleksandr, updated: 2026-03-29)

### Stream: Hotfix release docs and build
44. [DONE] Обновить `README.md` и `CHANGELOG.md` под v1.1.840.
45. [DONE] Git Commit: `docs(release): prepare session preferred-id hotfix` (hash: 0a23ba34)
46. [DONE] `./scripts/build-all.sh` → v1.1.840 artifacts. Hash: 7f15dde0
47. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.840.vsix` verified.

## Phase 110 — Dialog Mode Dispatch After Session Creation (owner: Oleksandr, updated: 2026-03-29)

Root cause: `ProjectManagerSessionView` показывает `ProjectManagerRuntimeSessionView` после submit (runtime mode), но runtime view полагается на Core stream event `session:created` для заполнения `sessions/visibleSessions`. Гонка между mount runtime view, hydration, и доставкой event неизбежна для медленных провайдеров (Claude SDK). Dialog mode (используемый при клике по дереву) подключается к сессии напрямую через dialog API и не зависит от stream events.

Fix: dispatch `pm:dialog:open` после создания сессии в submit flow, переводя session panel в dialog mode — тот же path что и клик по сессии в дереве.

### Stream: P0-E dispatch dialog open after submit
49. [DONE] Dispatch `pm:dialog:open` из `description-questionnaire-panel.tsx` после `submitQuestionnaire` success. Scope: `src/client/project-manager/components/description/description-questionnaire-panel.tsx`. Expected commit: `fix: dispatch dialog open after description session creation`
50. [DONE] Git Commit: `fix: dispatch dialog open after description session creation` (hash: f9a974bd)

## Phase 111 — Hotfix Release Build v1.1.841 (owner: Oleksandr, updated: 2026-03-30)

### Stream: Hotfix release docs and build
51. [DONE] Обновить `README.md` и `CHANGELOG.md` под v1.1.841. Expected commit: `docs(release): prepare dialog dispatch hotfix`
52. [DONE] Git Commit: `docs(release): prepare dialog dispatch hotfix` (hash: a79cff39)
53. [DONE] Чистое дерево → `./scripts/build-all.sh` → v1.1.841. Expected commit: `chore: prepare v1.1.841 artifacts`
54. [DONE] Git Commit: `chore: prepare v1.1.841 artifacts` (hash: 6fdac8d9)
55. [DONE] `./scripts/build-release.sh --use-current-version` → VSIX verified.

## Phase 112 — Workspace Switch Session Visibility Fix (owner: Oleksandr, updated: 2026-03-30)

Root cause: при переключении workspace reset effect в `main-area.tsx:115` безусловно ставит `hasDescriptionSession = false` ДО того, как `WorkflowStateStore` завершит первый poll для нового workspace. Это размонтирует `ProjectManagerSessionView` и показывает placeholder "Start with Description questionnaire" на 0.5–3 сек. Клик по сессии в дереве обходит этот путь через `pm:dialog:open` → dialog mode, поэтому работает мгновенно.

### Stream: P0-F remove unconditional session reset on workspace switch
1. [DONE] Убрать `setHasDescriptionSession(false)` из reset effect в `main-area.tsx` — пусть derivation в `use-main-area-workflow-state.ts` управляет этим значением после poll. Добавить `workflowStoreLoaded` guard в `main-area-panel-content.tsx` и `main-area.tsx`: пока store `!loaded`, не показывать questionnaire placeholder и description help. Scope: `main-area.tsx`, `main-area-panel-content.tsx`. Expected commit: `fix: prevent false questionnaire placeholder on workspace switch`
2. [DONE] Git Commit: `fix: prevent false questionnaire placeholder on workspace switch` (hash: da1a8d97)

## Phase 113 — Hotfix Release Build v1.1.842 (owner: Oleksandr, updated: 2026-03-30)

### Stream: Hotfix release docs and build
3. [DONE] Обновить `README.md` и `CHANGELOG.md` под v1.1.842.
4. [DONE] Git Commit: `docs(release): prepare workspace switch visibility hotfix` (hash: d236ba4d)
5. [DONE] Чистое дерево → `./scripts/build-all.sh` → v1.1.842 artifacts.
6. [DONE] Git Commit: `chore: prepare v1.1.842 artifacts` (hash: 5918cae4)
7. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.842.vsix` verified.

## Phase 114 — Workspace Switch Auto-Select Stale Snapshot Fix (owner: Oleksandr, updated: 2026-03-30)

Root cause (refined after v1.1.842 testing): эффект в `workspace-tree.tsx` пробрасывал storeState в `handleStateUpdate` как только менялся `handleStateUpdate` (из-за смены `selectedWorkspaceId`), но `storeState` ещё содержал snapshot предыдущего workspace (`loaded: true`). Это потребляло `pendingWorkspaceIdRef` (ставил в `null`) с данными СТАРОГО workspace, и когда приходил правильный snapshot нового workspace — auto-select уже не срабатывал (`pendingWorkspaceIdRef === null`).

### Stream: P0-G guard auto-select against stale workspace snapshot
8. [DONE] Добавить guard `storeState.workspaceSlug === workspaceSlug` в forwarding-effect `workspace-tree.tsx`: auto-select теперь вызывается только когда store содержит данные текущего workspace. Scope: `workspace-tree.tsx`. Expected commit: `fix: guard auto-select against stale workspace snapshot`
9. [DONE] Git Commit: `fix: guard auto-select against stale workspace snapshot` (hash: f2ca39c8)

## Phase 115 — Hotfix Release Build v1.1.843 (owner: Oleksandr, updated: 2026-03-30)

### Stream: Hotfix release docs and build
10. [DONE] Обновить `README.md` и `CHANGELOG.md` под v1.1.843.
11. [DONE] Git Commit: `docs(release): prepare workspace switch visibility hotfix` (hash: a91f68c2)
12. [DONE] Чистое дерево → `./scripts/build-all.sh` → v1.1.843 artifacts.
13. [DONE] Git Commit: `chore: prepare v1.1.843 artifacts` (hash: 74659ca8)
14. [DONE] `./scripts/build-release.sh --use-current-version` → `codeai-hub-1.1.843.vsix` (1.8 MB) verified.

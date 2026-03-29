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

## Phase 105 — Release Build And Packaging (owner: Oleksandr, updated: 2026-03-29)

### Stream: Release-facing docs sync before build
25. [DONE] Перед сборкой релиза синхронизировать release-facing docs с фактическим PM scope. Scope: `README.md`, `CHANGELOG.md`. Expected commit: `docs(release): prepare pm central panels release`
26. [DONE] Git Commit: `docs(release): prepare pm central panels release` (hash: 95cd7d73)

### Stream: Clean-tree build and new release packaging
27. [TODO] На чистом дереве выполнить таргетные сборки затронутых PM/core пакетов и затем `./scripts/build-all.sh` по Release Build Checklist; проверить version/manifest bumps и подготовить свежие release artifacts. Scope: `src/client/project-manager`, `packages/core`, release manifests/artifacts. Expected commit: `chore: prepare pm central panels release artifacts`
28. [TODO] Git Commit: `chore: prepare pm central panels release artifacts` (hash: TBD)
29. [TODO] На чистом дереве выполнить `./scripts/build-release.sh --use-current-version`, проверить новый VSIX, зафиксировать release result в новом session report и release notes. Scope: VSIX packaging output, `doc/Sessions/SessionXXX.md`, release result docs. Expected commit: `chore: release pm central panels fixes`
30. [TODO] Git Commit: `chore: release pm central panels fixes` (hash: TBD)

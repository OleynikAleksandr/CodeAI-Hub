# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Dialogs_And_Continuity_Routing.md`
  - `doc/BugRegistry.md`
  - `doc/Sessions/Session068.md`
- TODO Plan состоит из Phase/Stream; каждая подзадача затрагивает не более 3 файлов или пакетов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`.
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- Husky gates не обходить (`--no-verify` запрещён).
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита.
- Cleanup legacy `description` выполняется только сверху вниз: UI entry points -> state contract -> runtime/path cleanup -> docs/guards.
- Исторические session reports, archived TODO и исторические записи в `doc/BugRegistry.md` не переписывать: это audit trail, а не active contract.

---

## Phase 296 — Description legacy cleanup: design registration + plan bootstrap (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Architecture and execution-plan bootstrap
1. [DONE] Заархивировать текущий response-mode execution plan, зафиксировать отдельный архитектурный контракт полного cleanup-а legacy `Description` и развернуть новый `todo-plan.md` под removal `restart attempt`, attempt/run semantics и compat-path слоя (scope: `doc/TODO/Archive/todo-plan-up-to-phase295-2026-03-13.md`, `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(description): register legacy cleanup plan`).
2. [DONE] Git Commit: `docs(description): register legacy cleanup plan` (hash: `658ee83e`)

---

## Phase 297 — PM/UI: remove restart-attempt entry points (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Questionnaire artifact header cleanup
1. [DONE] Удалить legacy PM artifact-header restart wiring: убрать import/render/error-state из viewer и удалить `QuestionnaireRestartAttemptControl`, чтобы рядом с `questionnaire.md` больше не рендерилась круговая стрелка `↻` и не существовал ручной re-submit flow через артефакт (scope: `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`, `src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx`; expected commit: `fix(pm): remove questionnaire restart attempt control`).
2. [DONE] Git Commit: `fix(pm): remove questionnaire restart attempt control` (hash: `638d1759`)
3. [DONE] Добавить узкий regression guard, который подтверждает отсутствие restart-attempt UI в PM artifact viewer для `questionnaire.md` и не позволяет вернуть этот control через скрытый import/render branch (scope: `src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`; expected commit: `test(pm): guard questionnaire header cleanup`).
4. [DONE] Git Commit: `test(pm): guard questionnaire header cleanup` (hash: `53942478`)

---

## Phase 298 — Description workflow state: collapse legacy session model (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Core description snapshot contract
1. [TODO] Сжать core snapshot шага `description` до одного канонического session slot `primarySession`: убрать legacy `collectorSession`, `session` и `sessionKind` из active types/store merge logic, сохранив только текущую single-session модель (scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-store.test.ts`; expected commit: `refactor(core): collapse description session slots`).
2. [TODO] Git Commit: `refactor(core): collapse description session slots` (hash: TBD)

### Stream 1: Session handler and workspace activation
3. [TODO] Перевести description session persistence/activation на `primarySession` без fallback на legacy collector/session slots и удалить compat-ветки, которые поддерживали restart-era continuity shape (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `refactor(core): use canonical description session slot`).
4. [TODO] Git Commit: `refactor(core): use canonical description session slot` (hash: TBD)

### Stream 2: PM workflow-state client alignment
5. [DONE] Упростить PM-side workflow-state parsing и selection logic до канонического `primarySession`, чтобы tree/provider resolution не опирались на legacy `collectorSession`/`sessionKind` shape (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-provider-resolver.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`; expected commit: `refactor(pm): align description workflow state with primary session`).
6. [DONE] Git Commit: `refactor(pm): align description workflow state with primary session` (hash: TBD)

---

## Phase 299 — Runtime: remove attempt/run semantics from description flow (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Workflow runtime cleanup
1. [TODO] Удалить из workflow runtime run-scoped draft detection и stale-attempt gating для `description`, чтобы active runtime contract больше не распознавал `description/runs/<attempt>/description.md` как часть нормального flow (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit: `refactor(core): drop description attempt gating`).
2. [TODO] Git Commit: `refactor(core): drop description attempt gating` (hash: TBD)

### Stream 1: Remove new-attempt reset semantics
3. [TODO] Удалить `shouldResetDescriptionCollectorArtifacts(...)` и связанную reset-механику, которая обнуляет `draftPath`/`finalPath` при появлении новой description session как если бы существовала “новая попытка” (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `refactor(core): remove description attempt reset logic`).
4. [TODO] Git Commit: `refactor(core): remove description attempt reset logic` (hash: TBD)

---

## Phase 300 — Path contracts: remove legacy description artifact compatibility (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Questionnaire path canonicalization
1. [TODO] Свести resolution для анкеты к canonical `description/questionnaire.md` и убрать runtime/UI fallbacks для старых `description/runs/*` и `description/idea/*` путей (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `src/client/ui/src/services/idea-questionnaire-paths.ts`, `src/client/ui/src/services/idea-questionnaire-paths.test.ts`; expected commit: `refactor(paths): drop legacy description questionnaire fallbacks`).
2. [TODO] Git Commit: `refactor(paths): drop legacy description questionnaire fallbacks` (hash: TBD)

### Stream 1: UI-side description output contract
3. [TODO] Убрать из active UI helpers/contract snapshots прямые упоминания `description.md` и `runs/*` как output-path модели шага `description`, чтобы клиент больше не производил старую artifact schema даже в fallback copy/state (scope: `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `src/client/ui/src/app-host/session-region-idea-paths.ts`, `src/client/ui/src/services/idea-collector-contract.ts`; expected commit: `refactor(ui): remove legacy description output paths`).
4. [TODO] Git Commit: `refactor(ui): remove legacy description output paths` (hash: TBD)

### Stream 2: Agent asset path schema cleanup
5. [TODO] Удалить из idea-collector assets/path helpers run-scoped legacy output schema для `description`, чтобы bundled contracts больше не нормализовали старую attempt-era структуру артефактов (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/assets/idea-template.md`; expected commit: `refactor(agents): drop legacy description artifact schema`).
6. [TODO] Git Commit: `refactor(agents): drop legacy description artifact schema` (hash: TBD)

---

## Phase 301 — SSOT docs: sync active documentation with cleanup target (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Description contracts
1. [TODO] Удалить recovery/restart semantics из живых description contracts и синхронизировать их с cleanup architecture SSOT, не переписывая исторические bug/session документы (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`, `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`; expected commit: `docs(description): sync cleanup contracts`).
2. [TODO] Git Commit: `docs(description): sync cleanup contracts` (hash: TBD)

### Stream 1: System and workflow overview
3. [TODO] Обновить системные и overview-документы под чистый single-agent contract без attempt/run compatibility и без упоминаний ручного restart flow как живой возможности продукта (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(workflow): remove legacy description architecture references`).
4. [TODO] Git Commit: `docs(workflow): remove legacy description architecture references` (hash: TBD)

---

## Phase 302 — Guards + targeted verification + handoff (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Cleanup invariants guards
1. [TODO] Добавить финальные regression guards на отсутствие legacy restart/attempt semantics в живом Description flow: PM artifact header, workflow runtime и session handler должны проваливать тесты при попытке вернуть старую архитектуру (scope: `src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(description): guard cleanup invariants`).
2. [TODO] Git Commit: `test(description): guard cleanup invariants` (hash: TBD)

### Stream 1: Targeted validation
3. [TODO] Прогнать таргетные проверки затронутых контуров cleanup-а и довести дерево до чистого состояния без полного релизного цикла до закрытия phase: core runtime/handlers + PM/webview + UI state contract (scope: `packages/core`, `src/client/project-manager`, `src/client/ui`; expected commit: `chore(verify): validate description cleanup targets`).
4. [TODO] Git Commit: `chore(verify): validate description cleanup targets` (hash: TBD)

### Stream 2: Session handoff
5. [TODO] Обновить статусы нового `todo-plan.md`, оформить session report по закрытому cleanup-циклу и зафиксировать итоговые invariants/риски для следующей сессии (scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session0XX.md`; expected commit: `docs(session): record description legacy cleanup`).
6. [TODO] Git Commit: `docs(session): record description legacy cleanup` (hash: TBD)

---

## Phase 303 — Mandatory new release build after description cleanup (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Build new release
1. [TODO] После закрытия cleanup streams синхронизировать release-facing документы и **обязательно собрать новый релиз**: выполнить `./scripts/build-all.sh`, затем на чистом дереве `./scripts/build-release.sh --use-current-version`, получить новый VSIX и tarball-набор без rollback на legacy Description architecture (scope: `README.md`, `CHANGELOG.md`, release manifests/assets`; expected commit: `chore(release): build description cleanup release`).
2. [TODO] Git Commit: `chore(release): build description cleanup release` (hash: TBD)

### Stream 1: Release handoff
3. [TODO] Зафиксировать release artefacts, финальный handoff и итоговый session report именно для нового cleanup-релиза уже после пользовательского smoke-test подтверждения (scope: `doc/Sessions/Session0XX.md`, `doc/TODO/todo-plan.md`, `doc/tmp/releases/`; expected commit: `docs(release): record description cleanup release`).
4. [TODO] Git Commit: `docs(release): record description cleanup release` (hash: TBD)

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
1. [DONE] Сжать persisted core snapshot шага `description` до одного канонического session slot `primarySession`: убрать legacy `collectorSession`, `session` и `sessionKind` из active types/store merge logic, сохранив только single-session source-of-truth; на workflow-state boundary временно оставлен compat alias от `primarySession`, пока PM consumers не перестанут читать `description.session/sessionKind` (scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/workflow/description/description-step-store.test.ts`; expected commit: `refactor(core): collapse description session slots`).
2. [DONE] Git Commit: `refactor(core): collapse description session slots` (hash: `92829b21`)

### Stream 1: Session handler and workspace activation
3. [DONE] Перевести description continuity/activation на приоритет `primarySession`, чтобы core routing и workspace activation перестали читать legacy collector slot как основной источник dialog/session identity; compat fallback пока сохраняется до следующего микро-шага (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `refactor(core): prefer primary session for description continuity`).
4. [DONE] Git Commit: `refactor(core): prefer primary session for description continuity` (hash: `16dbeb22`)
5. [DONE] Удалить из description session persistence/activation remaining fallback на legacy `collectorSession` / `session`, чтобы core-side continuity shape окончательно опирался на канонический `primarySession` (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `refactor(core): use canonical description session slot`).
6. [DONE] Git Commit: `refactor(core): use canonical description session slot` (hash: `8cd39e19`)

### Stream 2: PM workflow-state client alignment
7. [DONE] Перевести PM tree/stage sync на `primarySession`, чтобы Description branch открывал сессию и artifact sync через канонический slot вместо `branch.session` (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(pm): prefer primary session in description tree`).
8. [DONE] Git Commit: `refactor(pm): prefer primary session in description tree` (hash: `de680416`)
9. [DONE] Довести PM workflow-state alignment до канонического `primarySession`: поднять `primarySession` в client parse shape и перевести provider resolver на него как на основной источник provider choice (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-provider-resolver.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(pm): align description workflow state with primary session`).
10. [DONE] Git Commit: `refactor(pm): align description workflow state with primary session` (hash: `72eee7fc`)

### Stream 3: PM description state consumers
11. [DONE] Перевести оставшихся PM consumers workflow-state на `primarySession`, чтобы main-area и workspace auto-select больше не зависели от временного compat alias `description.session/sessionKind` при показе `questionnaire.md` и resume Description dialog (scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `src/client/project-manager/services/workflow-state-helpers.ts`; expected commit: `refactor(pm): use primary session in description consumers`).
12. [DONE] Git Commit: `refactor(pm): use primary session in description consumers` (hash: `6f32bbcd`)

### Stream 4: PM workflow-state boundary contract
13. [DONE] Удалить из PM workflow-state client/solver remaining fallback на legacy `description.session` / `description.collectorSession` / `description.sessionKind`, чтобы webview boundary тоже считала `primarySession` единственным живым session slot (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-provider-resolver.ts`, `src/client/project-manager/components/layout/use-main-area-workflow-state.test.ts`; expected commit: `refactor(pm): drop legacy description state aliases`).
14. [DONE] Git Commit: `refactor(pm): drop legacy description state aliases` (hash: `378f35ff`)

### Stream 5: Core workflow-state output cleanup
15. [DONE] Снять временный compat alias `description.session/sessionKind` на core workflow-state boundary после PM migration и закрепить canonical output contract только на `primarySession` (scope: `packages/core/src/workflow/description/description-step-types.ts`, `packages/core/src/workflow/description/description-step-store.ts`, `packages/core/src/remote-bridge/handlers/workspace-activate-service.test.ts`; expected commit: `refactor(core): drop description session compat alias`).
16. [DONE] Git Commit: `refactor(core): drop description session compat alias` (hash: `a68a1812`)

---

## Phase 299 — Runtime: remove attempt/run semantics from description flow (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Workflow runtime cleanup
1. [DONE] Удалить из workflow runtime run-scoped draft detection и stale-attempt gating для `description`, чтобы active runtime contract больше не распознавал `description/runs/<attempt>/description.md` как часть нормального flow (scope: `packages/core/src/workflow/runtime/workflow-runtime.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`; expected commit: `refactor(core): drop description attempt gating`).
2. [DONE] Git Commit: `refactor(core): drop description attempt gating` (hash: `cb3f0d91`)

### Stream 1: Remove new-attempt reset semantics
3. [DONE] Удалить `shouldResetDescriptionCollectorArtifacts(...)` и связанную reset-механику, которая обнуляет `draftPath`/`finalPath` при появлении новой description session как если бы существовала “новая попытка” (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `refactor(core): remove description attempt reset logic`).
4. [DONE] Git Commit: `refactor(core): remove description attempt reset logic` (hash: `3bf1abeb`)

---

## Phase 300 — Path contracts: remove legacy description artifact compatibility (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Questionnaire path canonicalization
1. [DONE] Свести resolution для анкеты к canonical `description/questionnaire.md` и убрать runtime/UI fallbacks для старых `description/runs/*` и `description/idea/*` путей (scope: `packages/core/src/remote-bridge/handlers/workspace-file-service.ts`, `src/client/ui/src/services/idea-questionnaire-paths.ts`, `src/client/ui/src/services/idea-questionnaire-paths.test.ts`; expected commit: `refactor(paths): drop legacy description questionnaire fallbacks`).
2. [DONE] Git Commit: `refactor(paths): drop legacy description questionnaire fallbacks` (hash: `800bffd5`)

### Stream 1: UI-side description output contract
3. [DONE] Убрать из active UI helpers/contract snapshots прямые упоминания `description.md` и `runs/*` как output-path модели шага `description`, чтобы клиент больше не производил старую artifact schema даже в fallback copy/state (scope: `src/client/ui/src/app-host/idea-kickoff-prompt.ts`, `src/client/ui/src/app-host/session-region-idea-paths.ts`, `src/client/ui/src/services/idea-collector-contract.ts`; expected commit: `refactor(ui): remove legacy description output paths`).
4. [DONE] Git Commit: `refactor(ui): remove legacy description output paths` (hash: `869851ad`)

### Stream 2: Agent asset path schema cleanup
5. [DONE] Удалить из idea-collector assets/path helpers run-scoped legacy output schema для `description`, чтобы bundled contracts больше не нормализовали старую attempt-era структуру артефактов (scope: `packages/agents/idea-collector/src/paths/artifact-paths.ts`, `packages/agents/idea-collector/assets/idea-template.md`; expected commit: `refactor(agents): drop legacy description artifact schema`).
6. [DONE] Git Commit: `refactor(agents): drop legacy description artifact schema` (hash: `df7c652a`)

### Stream 3: Fallback slots and schema text
7. [DONE] Перевести active fallback schema/prompt hints на Description SSOT: заменить `idea.md` и legacy `cluster.idea.*` slots на `Final_Description.md` и `workspace.description`, чтобы деградационные ветки UI не возвращали старую модель артефактов (scope: `src/client/ui/src/services/idea-collector-fallback-schema.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `src/client/ui/src/services/idea-collector-schema-utils.ts`; expected commit: `refactor(ui): align description fallback slots`).
8. [DONE] Git Commit: `refactor(ui): align description fallback slots` (hash: `7e5028c4`)

### Stream 4: Legacy artifact bridge labels
9. [DONE] Дочистить legacy finalize/bridge mapping для Description: старый artifact parser и core revise-artifacts labels не должны ссылаться на `cluster.idea.idea` или `idea.md`, если речь идёт о canonical `workspace.description` / `Final_Description.md` (scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(core): align description artifact bridge labels`).
10. [DONE] Git Commit: `refactor(core): align description artifact bridge labels` (hash: `44e75f42`)

### Stream 5: Legacy agent asset wording
11. [DONE] Синхронизировать оставшиеся bundled legacy assets `idea-collector` с каноническим Description contract: prompt/schema больше не должны описывать `idea.md` и `cluster.idea.*` как текущую модель финализации (scope: `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `packages/agents/idea-collector/assets/idea-collector-schema.json`, `doc/TODO/todo-plan.md`; expected commit: `docs(agents): align legacy idea collector assets with description contract`).
12. [DONE] Git Commit: `docs(agents): align legacy idea collector assets with description contract` (hash: `dd0914c9`)

### Stream 6: Remove obsolete legacy artifact endpoint
13. [DONE] Удалить неиспользуемый `/api/v1/orchestrator/idea-artifact` и связанные legacy path validators, а также вычистить UI-copy, которая всё ещё советует прикладывать `description.md` вместо `Final_Description.md` для `Virtual Simulation` (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `src/client/ui/src/services/idea-collector-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(core): remove legacy description artifact endpoint`).
14. [DONE] Git Commit: `refactor(core): remove legacy description artifact endpoint` (hash: `4797aef5`)

### Stream 7: Canonical label in Description tree routes
15. [DONE] Убрать user-facing label `description.md` из tree/auto-select маршрутов Description: при наличии legacy `draftPath` PM должен продолжать открывать файл, но показывать пользователю только канонический label `Final_Description.md` (scope: `src/client/project-manager/components/layout/workspace-tree-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-auto-select.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(pm): hide legacy description draft label`).
16. [DONE] Git Commit: `refactor(pm): hide legacy description draft label` (hash: `2cea566b`)

### Stream 8: Canonical label in main-area auto-open
17. [DONE] Перевести auto-open Description document в main-area на канонический label `Final_Description.md`, чтобы active PM view больше не рендерил legacy filename даже при compat `draftPath`; финальный guard на это инвариантное поведение будет добавлен в `Phase 302` (scope: `src/client/project-manager/components/layout/use-main-area-workflow-state.ts`, `src/client/project-manager/components/layout/main-area.tsx`, `doc/TODO/todo-plan.md`; expected commit: `refactor(pm): keep canonical description label in main area`).
18. [DONE] Git Commit: `refactor(pm): keep canonical description label in main area` (hash: `bf3a3f2b`)

---

## Phase 301 — SSOT docs: sync active documentation with cleanup target (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Description contracts
1. [DONE] Удалить recovery/restart semantics из живых description contracts и синхронизировать их с cleanup architecture SSOT, не переписывая исторические bug/session документы (scope: `doc/SolidWorks-WorkFlow/Contracts/DescriptionNode_ReviewSession.md`, `doc/SolidWorks-WorkFlow/Contracts/DescriptionStep_SingleAgent.md`, `doc/SolidWorks-WorkFlow/Contracts/Description_LegacyCleanup_Architecture.md`; expected commit: `docs(description): sync cleanup contracts`).
2. [DONE] Git Commit: `docs(description): sync cleanup contracts` (hash: `1b0ed9ea`)

### Stream 1: System and workflow overview
3. [DONE] Обновить системные и overview-документы под чистый single-agent contract без attempt/run compatibility и без упоминаний ручного restart flow как живой возможности продукта (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit: `docs(workflow): remove legacy description architecture references`).
4. [DONE] Git Commit: `docs(workflow): remove legacy description architecture references` (hash: `03b43acb`)

---

## Phase 302 — Guards + targeted verification + handoff (owner: Oleksandr, updated: 2026-03-13)

### Stream 0: Cleanup invariants guards
1. [DONE] Добавить финальные regression guards на отсутствие legacy restart/attempt semantics в живом Description flow: PM artifact header, workflow runtime и session handler должны проваливать тесты при попытке вернуть старую архитектуру (scope: `src/client/project-manager/components/layout/workflow-artifact-viewer.description-cleanup.test.ts`, `packages/core/src/workflow/runtime/workflow-runtime.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`; expected commit: `test(description): guard cleanup invariants`).
2. [DONE] Git Commit: `test(description): guard cleanup invariants` (hash: `7a80cbc7`)

### Stream 1: Targeted validation
3. [DONE] Прогнать таргетные проверки затронутых контуров cleanup-а и довести дерево до чистого состояния без полного релизного цикла до закрытия phase: core runtime/handlers + PM/webview + UI state contract (scope: `packages/core`, `src/client/project-manager`, `src/client/ui`; expected commit: `chore(verify): validate description cleanup targets`).
4. [DONE] Git Commit: `chore(verify): validate description cleanup targets` (hash: `273bae68`)

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

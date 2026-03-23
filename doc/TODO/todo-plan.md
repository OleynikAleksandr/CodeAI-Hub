# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`, `doc/Sessions/Session132.md`, `doc/Sessions/Session133.md`, `doc/Sessions/Session134.md`, `doc/Sessions/Session135.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 37 — Diagram Modules Product Part Decomposition Planning Baseline (owner: Oleksandr, updated: 2026-03-23)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый план до `Phase 36`, оформить новый planning-doc для decomposition `Diagram Modules` по `Product Part`, progressive React Flow materialization, hidden runtime orchestration turn-ов, deferred relation lines и compatibility aggregate, а также создать новый session report для bug findings и принятого refactor direction (scope: `doc/TODO/Archive/todo-plan-up-to-phase36-2026-03-23.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`, `doc/Sessions/Session133.md`; expected commit: `docs(plan): start diagram modules product part decomposition scope`).
2. [DONE] Git Commit: `docs(plan): start diagram modules product part decomposition scope` (hash: `6427aa35`)
3. [DONE] После planning-baseline commit-а синхронизировать новый active plan и `Session133` фактическими hash-ами, чтобы handoff не оставался с `TBD` и следующая сессия могла восстановить контекст без догадок (scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session133.md`; expected commit: `docs(session): sync diagram modules decomposition planning handoff`).
4. [DONE] Git Commit: `docs(session): sync diagram modules decomposition planning handoff` (hash: `a9a16ded`)

## Phase 38 — Diagram Modules Product Part Artifact Contract (owner: Oleksandr, updated: 2026-03-23)

### Stream: Workflow SSOT for staged decomposition
1. [DONE] Зафиксировать в workflow/system docs, что `Diagram Modules` больше не опирается на giant single-turn `module-inventory.md`, а начинается с `product-parts.index.md`, затем материализует отдельные part-файлы и откладывает relation lines из базового slice (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(workflow): formalize product part decomposition contract`).
2. [DONE] Git Commit: `docs(workflow): formalize product part decomposition contract` (hash: `b10ae202`)

### Stream: Prompt and path contract for new artifacts
1. [DONE] Добавить typed path contract `diagram_modules` для `product-parts.index.md` и dynamic `product-parts/<part-id>.md`, чтобы runtime мог безопасно разрешать staged artifact paths внутри workspace без giant single-file assumptions (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`; expected commit: `feat(diagram-workflow): add product part artifact path contract`).
2. [DONE] Git Commit: `feat(diagram-workflow): add product part artifact path contract` (hash: `941d5f03`)
3. [DONE] Перенастроить PM prompt pack `diagram_modules` на `product-parts.index.md`, staged `Product Part` generation и runtime-owned compatibility aggregate, чтобы первый user-visible turn больше не вел агента напрямую к giant `module-inventory.md` (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): retarget diagram modules prompt to staged artifacts`).
4. [DONE] Git Commit: `feat(diagram-workflow): retarget diagram modules prompt to staged artifacts` (hash: `0e8af96f`)

### Stream: Artifact upsert and validation baseline
1. [DONE] Добавить artifact-upsert validation rules для `product-parts.index.md` и `product-parts/<part-id>.md`, оставив aggregate `module-inventory.md` runtime-owned compatibility output, а не прямой agent-written target (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.artifact-upsert.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): validate product part artifacts`).
2. [DONE] Git Commit: `feat(diagram-workflow): validate product part artifacts` (hash: `624eebda`)

## Phase 39 — Hidden Runtime Orchestration And Lock Contract (owner: Oleksandr, updated: 2026-03-23)

### Stream: Sequential substep state model
1. [DONE] Добавить server-side `diagramModulesProgress` snapshot на основе `product-parts.index.md`, part-файлов и aggregate readiness, чтобы runtime мог публиковать `substep/currentPartId/generatedCount` до реального orchestration loop и UI не работал вслепую (scope: `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): expose diagram modules progress snapshot`).
2. [DONE] Git Commit: `feat(diagram-workflow): expose diagram modules progress snapshot` (hash: `8cd6f64b`)
3. [DONE] Протянуть `diagramModulesProgress` в PM workflow-state client, чтобы hidden orchestration, progress surface и input lock могли опираться на канонический `substep/cursor` вместо эвристик по артефактам; при restart `Diagram Modules` использовать `product-parts.index.md` как continuation source вместо повторного захода от `virtual-simulation.md` (scope: `src/client/project-manager/services/workflow-state-client.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): consume diagram modules progress snapshot`).
4. [DONE] Git Commit: `feat(diagram-workflow): consume diagram modules progress snapshot` (hash: `56d078dd`)

### Stream: Hidden continuation turns
1. [DONE] Добавить transport-level hidden workflow turn control, чтобы runtime мог отправлять continuation subturn без записи fake user-message в dialog/unified history и при этом не протекал внутренний `workflowControl` в provider turn options (scope: `packages/core/src/remote-bridge/handlers/workflow-turn-control.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): hide internal workflow control turns`).
2. [DONE] Git Commit: `feat(diagram-workflow): hide internal workflow control turns` (hash: `a54cdc64`)
3. [DONE] Реализовать PM-side orchestration loop для `diagram_modules`: на `structured_output` сохранять staged artifacts, читать `diagramModulesProgress` и автоматически отправлять hidden continuation packet на следующий `Product Part` до финального review boundary без fake user-visible `Продолжай` (scope: `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): orchestrate hidden product part turns`).
4. [DONE] Git Commit: `feat(diagram-workflow): orchestrate hidden product part turns` (hash: `826dd5c5`)

### Stream: Input lock until final review
1. [DONE] Добавить PM-side sequence lock между hidden `Product Part` subturn-ами и снимать его только на review boundary без следующего continuation prompt, чтобы decomposition не повторял premature unlock bug старого giant-turn flow даже при коротком idle-window между turn-ами (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(session-ui): keep input locked during product part sequence`).
2. [DONE] Git Commit: `fix(session-ui): keep input locked during product part sequence` (hash: `8a8a1e79`)

## Phase 40 — Progressive React Flow Materialization (owner: Oleksandr, updated: 2026-03-23)

### Stream: Index-first graph skeleton
1. [DONE] Научить `Diagram Modules` loader читать `product-parts.index.md`, строить skeleton `Product Part` containers и поверх него materialize-ить уже готовые part-файлы, чтобы visual graph начинал жить до появления compatibility aggregate `module-inventory.md` (scope: `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-ui): load product part skeleton from index artifact`).
2. [DONE] Git Commit: `feat(diagram-ui): load product part skeleton from index artifact` (hash: `c516da75`)

### Stream: Progressive graph regeneration
1. [DONE] Перевести flow projection на merge index placeholders с уже готовыми part-артефактами, чтобы React Flow инкрементально дорисовывал graph без очистки уже появившихся `Product Part` и сохранял порядок из staged index artifact вместо пересортировки по `id` (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-layout): progressively materialize product parts`).
2. [DONE] Git Commit: `feat(diagram-layout): progressively materialize product parts` (hash: `64979af0`)

### Stream: Progress surface in PM
1. [DONE] Добавить user-facing progress surface для `Diagram Modules`, чтобы PM показывал planned/generated `Product Part` state и не создавал ощущение, что во время длинной последовательности ничего не происходит; одновременно обновить help-panel под staged `index + product-parts/<part-id>.md + compatibility aggregate` model и сохранить совместимый export `DiagramEditorStage` для общих diagram hooks после loader refactor (scope: `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-ui): show product part generation progress`).
2. [DONE] Git Commit: `feat(diagram-ui): show product part generation progress` (hash: `63a8d40d`)

## Phase 41 — Compatibility Aggregate And Completion Gate (owner: Oleksandr, updated: 2026-03-23)

### Stream: Runtime aggregate compose
1. [DONE] Собрать compatibility aggregate `module-inventory.md` из `product-parts.index.md` и part-файлов, чтобы downstream `Diagram Facades` по-прежнему читал единый canonical input, а user-facing generation при этом оставался decomposed и progressive; aggregate должен materialize-иться runtime-ом после последнего `Product Part`, а не писаться агентом напрямую (scope: `src/client/project-manager/components/sessions/diagram-modules-aggregate.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): compose aggregate inventory from product parts`).
2. [DONE] Git Commit: `feat(diagram-workflow): compose aggregate inventory from product parts` (hash: `2829ac39`)

### Stream: Stage completion and gating
1. [DONE] Перевести `diagram_modules` completion/gating на правило `all planned Product Parts generated + aggregate inventory materialized`, при этом relation lines оставить deferred и не требовать их для базового завершения шага; server-side workflow state должен открывать `Diagram Facades` только при `awaiting_review + aggregateReady`, а промежуточные staged part-файлы не должны снимать gate раньше времени (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): gate completion by product part sequence`).
2. [DONE] Git Commit: `fix(diagram-workflow): gate completion by product part sequence` (hash: `ac2f7334`)

## Phase 42 — Codex Long-Turn Stability And Transcript Preservation (owner: Oleksandr, updated: 2026-03-23)

### Stream: False idle-timeout removal
1. [DONE] Убрать ложное завершение long-silent tool-heavy `Codex` turn-ов по hard `idle_timeout`, чтобы `diagram_modules` не погибал до `structured_output` и сохранения артефакта только из-за длинной паузы между provider events; вместо abort-а процессор должен логировать idle pulses и продолжать ждать реальный следующий event или terminal signal (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(codex): avoid false idle timeout on long diagram turns`).
2. [DONE] Git Commit: `fix(codex): avoid false idle timeout on long diagram turns` (hash: `3ea14565`)

### Stream: Late provider message preservation
1. [DONE] Сохранить late provider commentary/final messages в unified session и session UI после длинных `Codex` turn-ов, чтобы raw provider transcript и infinite session history больше не расходились, как в найденном `diagram_modules` failure case; provider-side assistant messages должны сохранять исходный timestamp даже если пришли уже после `turn_completed`, а regression test должен явно покрывать этот сценарий (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(session-history): preserve late codex provider messages`).
2. [DONE] Git Commit: `fix(session-history): preserve late codex provider messages` (hash: `4a896807`)

## Phase 43 — Release Build After Product Part Decomposition Refactor (owner: Oleksandr, updated: 2026-03-23)

### Stream: Release notes sync
1. [DONE] Перед новым release-cycle синхронизировать `README.md`, `CHANGELOG.md` и workflow docs с progressive `Product Part` generation baseline и deferred relation-line policy для следующего patch release после `1.1.767`, включая `Codex` long-turn stability и transcript preservation fixes в release notes `1.1.768` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync product part decomposition release notes`).
2. [DONE] Git Commit: `docs(release): sync product part decomposition release notes` (hash: `fddb26b2`)

### Stream: Release build
1. [DONE] После принятия decomposition refactor и `Codex` stability fixes выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` и собрать новый локальный baseline для следующего пользовательского retest (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare product part decomposition release`).
2. [DONE] Git Commit: `chore(release): prepare product part decomposition release` (hash: `18cd4660`)

### Stream: Session handoff
1. [DONE] После успешного релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report с итогами product-part refactor, `Codex` timeout fix и release verification, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record product part decomposition release`).
2. [DONE] Git Commit: `docs(session): record product part decomposition release` (hash: `d4f864cb`)

## Phase 44 — Diagram Modules Staged Prompt And Continuation Repair (owner: Oleksandr, updated: 2026-03-23)

### Stream: Staged prompt contract repair
1. [DONE] Переписать user-facing `diagram_modules` prompt asset и PM staged header так, чтобы live prompt больше не противоречил decomposition architecture: первый прямой artifact — `product-parts.index.md`, continuation turn materialize-ит один `product-parts/<part-id>.md`, `module-inventory.md` остаётся runtime aggregate, а relation lines не требуются в первом полезном slice (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `src/client/project-manager/services/prompt-pack-builder.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): align staged diagram modules prompt`).
2. [DONE] Git Commit: `fix(diagram-workflow): align staged diagram modules prompt` (hash: TBD)
3. [TODO] Добавить отдельные staged runtime templates для `product-parts.index.md` и одного `Product Part`, чтобы synced/bundled template layer перестал быть монолитным `module-inventory` contract и агент имел честный user-facing DSL для обеих фаз (scope: `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md`, `packages/agents/diagram-modules-agent/assets/product-part-template.md`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): add staged product part templates`).
4. [TODO] Git Commit: `feat(diagram-workflow): add staged product part templates` (hash: TBD)
5. [TODO] Синхронизировать bundled/template-sync contract под новый staged набор и покрыть это тестами, чтобы runtime template delivery в релизе больше не тащил старый monolithic prompt/template pair из `module-inventory` baseline (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): sync staged template delivery`).
6. [TODO] Git Commit: `test(diagram-workflow): sync staged template delivery` (hash: TBD)

### Stream: Continuation trigger repair
1. [TODO] Перевести `diagram_modules` orchestration с `structured_output`-only trigger на post-turn continuation rule, чтобы direct `file_change` / direct file-write `Codex` path после `product-parts.index.md` тоже запускал hidden следующий turn по `workflowState.diagramModulesProgress` без user-visible `Продолжай` (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): continue after staged file writes`).
2. [TODO] Git Commit: `fix(diagram-workflow): continue after staged file writes` (hash: TBD)
3. [TODO] Добавить regression coverage для live failure case `Phase 1 index written -> no structured_output -> hidden continuation still starts`, чтобы повторный retest `Diagram Modules` не зависел от удачи конкретного provider transport path (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`, `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): cover file-change continuation`).
4. [TODO] Git Commit: `test(diagram-workflow): cover file-change continuation` (hash: TBD)

### Stream: Release notes sync
1. [TODO] Перед новым patch release синхронизировать `README.md`, `CHANGELOG.md` и workflow docs под findings ретеста `1.1.768`: staged `Diagram Modules` prompt repair, direct file-change continuation support и сохранение skeleton-first `Product Part` rendering как ценного промежуточного результата (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync staged prompt continuation fixes`).
2. [TODO] Git Commit: `docs(release): sync staged prompt continuation fixes` (hash: TBD)

### Stream: Release build
1. [TODO] После prompt/template repair и continuation fixes выполнить новый release cycle: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, чтобы отдать пользователю новый baseline для повторного ретеста `Diagram Modules` без ручного `Продолжай` после `Phase 1` (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare staged prompt continuation release`).
2. [TODO] Git Commit: `chore(release): prepare staged prompt continuation release` (hash: TBD)

### Stream: Session handoff
1. [TODO] После нового релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report по prompt/template repair и continuation retest, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record staged prompt continuation release`).
2. [TODO] Git Commit: `docs(session): record staged prompt continuation release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase36-2026-03-23.md`
- Active planning docs for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`
- User constraints for this scope:
  - `Diagram Modules` остаётся главным graphical review step;
  - базовый slice не требует relation lines;
  - пользователь не должен подтверждать каждый отдельный `Product Part` через чат;
  - runtime должен sequentially materialize `Product Part` автоматически, скрывая orchestration-turns из обычного пользовательского диалога;
  - React Flow должен progressively regeneraте graph по мере появления новых part-артефактов;
  - decomposition не отменяет обязательный fix для ложного `Codex` idle-timeout и потери late provider messages;
  - staged user-facing prompt/template contract не должен противоречить реальному runtime flow;
  - continuation после `Phase 1` не должен зависеть только от `structured_output`, если provider пишет staged файлы напрямую.

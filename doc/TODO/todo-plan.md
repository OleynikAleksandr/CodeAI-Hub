# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Retest_Blockers_After_1_1_770_Architecture.md`, `doc/Sessions/Session132.md`, `doc/Sessions/Session133.md`, `doc/Sessions/Session134.md`, `doc/Sessions/Session135.md`, `doc/Sessions/Session137.md`, `doc/Sessions/Session138.md`, `doc/Sessions/Session139.md`, `doc/Sessions/Session140.md`
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
2. [DONE] Git Commit: `fix(diagram-workflow): align staged diagram modules prompt` (hash: `e08672f1`)
3. [DONE] Добавить отдельные staged runtime templates для `product-parts.index.md` и одного `Product Part`, чтобы synced/bundled template layer перестал быть монолитным `module-inventory` contract и агент имел честный user-facing DSL для обеих фаз (scope: `packages/agents/diagram-modules-agent/assets/product-parts-index-template.md`, `packages/agents/diagram-modules-agent/assets/product-part-template.md`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): add staged product part templates`).
4. [DONE] Git Commit: `feat(diagram-workflow): add staged product part templates` (hash: `dd0cec36`)
5. [DONE] Синхронизировать bundled/template-sync contract под новый staged набор и покрыть это тестами, чтобы runtime template delivery в релизе больше не тащил старый monolithic prompt/template pair из `module-inventory` baseline (scope: `scripts/generate-bundled-templates.js`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): sync staged template delivery`).
6. [DONE] Git Commit: `test(diagram-workflow): sync staged template delivery` (hash: `2000d02f`)

### Stream: Continuation trigger repair
1. [DONE] Перевести `diagram_modules` orchestration с `structured_output`-only trigger на post-turn continuation rule, чтобы direct `file_change` / direct file-write `Codex` path после `product-parts.index.md` тоже запускал hidden следующий turn по `workflowState.diagramModulesProgress` без user-visible `Продолжай` (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): continue after staged file writes`).
2. [DONE] Git Commit: `fix(diagram-workflow): continue after staged file writes` (hash: `ad266617`)
3. [DONE] Добавить regression coverage для live failure case `Phase 1 index written -> no structured_output -> hidden continuation still starts`, чтобы повторный retest `Diagram Modules` не зависел от удачи конкретного provider transport path (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`, `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): cover file-change continuation`).
4. [DONE] Git Commit: `test(diagram-workflow): cover file-change continuation` (hash: `fc6a66ce`)

### Stream: Release notes sync
1. [DONE] Перед новым patch release синхронизировать `README.md`, `CHANGELOG.md` и workflow docs под findings ретеста `1.1.768`: staged `Diagram Modules` prompt repair, direct file-change continuation support и сохранение skeleton-first `Product Part` rendering как ценного промежуточного результата (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync staged prompt continuation fixes`).
2. [DONE] Git Commit: `docs(release): sync staged prompt continuation fixes` (hash: `d792fcc9`)

### Stream: Release build
1. [DONE] После prompt/template repair и continuation fixes выполнить новый release cycle: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, чтобы отдать пользователю новый baseline для повторного ретеста `Diagram Modules` без ручного `Продолжай` после `Phase 1` (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare staged prompt continuation release`).
2. [DONE] Git Commit: `chore(release): prepare staged prompt continuation release` (hash: `92f4174a`)

### Stream: Session handoff
1. [DONE] После нового релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report по prompt/template repair и continuation retest, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record staged prompt continuation release`).
2. [DONE] Git Commit: `docs(session): record staged prompt continuation release` (hash: `e9790b9c`)

## Phase 45 — Diagram Workflow Composite Prompt Contract Cleanup (owner: Oleksandr, updated: 2026-03-23)

### Stream: Planning baseline
1. [DONE] Зафиксировать findings пользовательского retest `1.1.769`: составной prompt для `Diagram Modules` заставляет агента искать compatibility inventory, staged examples, continuity/runtime templates и legacy stage artifacts, после чего оформить новый planning-doc по composite prompt contract для `Diagram Modules` и `Diagram Facades` вместе с session report по этому retest (scope: `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`, `doc/Sessions/Session138.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): capture composite diagram prompt retest findings`).
2. [DONE] Git Commit: `docs(plan): capture composite diagram prompt retest findings` (hash: `cc80a289`)
3. [DONE] После planning-baseline commit-а синхронизировать active plan и `Session138` фактическими hash-ами, чтобы следующий cold start видел новый scope и report без `TBD` (scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session138.md`; expected commit: `docs(session): sync composite diagram prompt planning handoff`).
4. [DONE] Git Commit: `docs(session): sync composite diagram prompt planning handoff` (hash: `2b7b2008`)

### Stream: Diagram Modules prompt surface cleanup
1. [DONE] Ужесточить user-facing `diagram_modules` prompt asset и PM prompt pack: убрать guidance про поиск compatibility inventory / continuity files / staged examples / legacy `diagram_modules` artifacts, явно описать exact inputs и non-inputs текущего turn-а и перестать показывать generic template hint в compose prompt (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `src/client/project-manager/services/prompt-pack-builder.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): tighten diagram modules prompt surface`).
2. [DONE] Git Commit: `fix(diagram-workflow): tighten diagram modules prompt surface` (hash: `d2743e55`)

### Stream: Diagram stage contract assembly cleanup
1. [DONE] Перестроить runtime workflow contract assembly для diagram stages так, чтобы `diagram_modules` и `diagram_facades` больше не выглядели как generic single-template flow, mandatory DSL appendix продолжал подмешиваться в prompt напрямую, а compose layer не провоцировал template scouting через stage-level template path (scope: `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): simplify diagram stage contract assembly`).
2. [DONE] Git Commit: `fix(diagram-workflow): simplify diagram stage contract assembly` (hash: `c3c6d76c`)

### Stream: Diagram Facades prompt surface cleanup
1. [DONE] Проверить и ужесточить `diagram_facades` prompt surface по тем же правилам: exact inputs, explicit non-inputs, no continuity/template scouting и без generic template absolute path в user-visible compose prompt (scope: `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`, `src/client/project-manager/services/prompt-pack-builder.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-facades): tighten facade prompt surface`).
2. [DONE] Git Commit: `fix(diagram-facades): tighten facade prompt surface` (hash: `64840c35`)

### Stream: Contract regression coverage
1. [DONE] Обновить tests prompt/contract composition для `diagram_modules` и `diagram_facades`, чтобы они ловили legacy strings, unwanted template hints и отсутствие strict input restrictions до следующего релиза (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-workflow): cover composite prompt contract cleanup`).
2. [DONE] Git Commit: `test(diagram-workflow): cover composite prompt contract cleanup` (hash: `7d6120a9`)

### Stream: Release notes sync
1. [DONE] Перед новым patch release синхронизировать `README.md`, `CHANGELOG.md` и workflow docs под findings ретеста `1.1.769`: strict input contract для diagram prompts, removal of legacy template scouting и cleanup composite prompt assembly для `Diagram Modules` / `Diagram Facades` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync composite prompt cleanup notes`).
2. [DONE] Git Commit: `docs(release): sync composite prompt cleanup notes` (hash: `e4e51620`)

### Stream: Release build
1. [DONE] После cleanup prompt/contract layers выполнить новый release cycle: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, чтобы отдать пользователю новый baseline для повторного retest diagram steps без лишнего discovery chatter (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare composite prompt cleanup release`).
2. [DONE] Git Commit: `chore(release): prepare composite prompt cleanup release` (hash: `ad980668`)

### Stream: Session handoff
1. [DONE] После нового релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report по composite prompt cleanup и пользовательскому retest, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record composite prompt cleanup release`).
2. [DONE] Git Commit: `docs(session): record composite prompt cleanup release` (hash: `cd778971`)

## Phase 46 — Diagram Stage Compose Header Cleanup (owner: Oleksandr, updated: 2026-03-23)

### Stream: Stage-specific compose opener
1. [DONE] Убрать legacy opener `Собери артефакт на основе анкеты и шаблона.` из compose prompt для `diagram_modules` и `diagram_facades`, заменить его stage-specific direct-input wording и закрепить это regression tests, чтобы retest `1.1.770` не провоцировал у агента лишние мысли про несуществующий template input (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): remove legacy template header from diagram stages`).
2. [DONE] Git Commit: `fix(diagram-workflow): remove legacy template header from diagram stages` (hash: `3236a549`)

## Phase 47 — Diagram Modules Retest Blockers After 1.1.770 (owner: Oleksandr, updated: 2026-03-23)

### Stream: Planning baseline
1. [DONE] Зафиксировать пользовательский retest `1.1.770`: пустой React Flow после `product-parts.index.md`, несработавший hidden continuation и legacy `module-inventory` tails в `Diagram Modules` preamble / Source; оформить planning-doc и новый session report с уже локализованными root cause (scope: `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_Retest_Blockers_After_1_1_770_Architecture.md`, `doc/Sessions/Session140.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): capture diagram modules retest blockers after 1.1.770`).
2. [DONE] Git Commit: `docs(plan): capture diagram modules retest blockers after 1.1.770` (hash: `3bce6491`)
3. [DONE] После planning-baseline commit-а синхронизировать active plan и `Session140` фактическим hash-ом, чтобы следующий cold start не начинался с `TBD` (scope: `doc/TODO/todo-plan.md`, `doc/Sessions/Session140.md`; expected commit: `docs(session): sync diagram modules retest blocker handoff`).
4. [DONE] Git Commit: `docs(session): sync diagram modules retest blocker handoff` (hash: `5dd93831`)

### Stream: Index parser recovery
1. [DONE] Научить progressive loader и workflow progress snapshot читать реальный numbered `Canonical order` format текущего `product-parts.index.md`, чтобы после первого agent write появлялся staged skeleton и hidden continuation видел `currentPartId` вместо зависания на `substep: index` (scope: `src/client/project-manager/components/diagram-editor/diagram-modules-progressive-model.ts`, `packages/core/src/remote-bridge/handlers/diagram-modules-progress.ts`, targeted test file; expected commit: `fix(diagram-workflow): recover staged index parsing after retest`).
2. [DONE] Git Commit: `fix(diagram-workflow): recover staged index parsing after retest` (hash: `b1811063`)

### Stream: Diagram Modules source surface cleanup
1. [DONE] Вычистить из `Diagram Modules` panel и `Source` mode legacy inventory-first copy: intro text, canonical source label/path и pending message должны честно описывать staged `product-parts.index.md` baseline и runtime-owned aggregate, без возврата к `module-inventory.md` как primary artifact stage (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.ts`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`; expected commit: `fix(diagram-ui): align diagram modules source surface with staged flow`).
2. [DONE] Git Commit: `fix(diagram-ui): align diagram modules source surface with staged flow` (hash: `a8e862c2`)

### Stream: Diagram Modules empty-state copy cleanup
1. [DONE] Переписать misleading empty-canvas copy в visual shell так, чтобы index-first staged state больше не выглядел как ошибка пользователя и не советовал “add semantic entities”, закрепив это отдельным targeted test без смешивания со source-surface fix (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, targeted test file; expected commit: `fix(diagram-ui): clarify diagram modules empty staged state`).
2. [DONE] Git Commit: `fix(diagram-ui): clarify diagram modules empty staged state` (hash: `42e31c24`)

### Stream: Release notes sync
1. [TODO] Перед новым patch release синхронизировать `README.md`, `CHANGELOG.md` и active plan под fixes после retest `1.1.770`: tolerant parsing staged index, recovery hidden continuation path через корректный progress snapshot и cleanup `Diagram Modules` user-facing surface (`Source`, preamble, empty-state) (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync diagram modules retest blocker fixes`).
2. [TODO] Git Commit: `docs(release): sync diagram modules retest blocker fixes` (hash: TBD)

### Stream: Release build
1. [TODO] После release-notes sync выполнить новый release cycle: `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, чтобы отдать пользователю новый baseline с parser recovery и cleanup `Diagram Modules` surface (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare diagram modules retest blocker release`).
2. [TODO] Git Commit: `chore(release): prepare diagram modules retest blocker release` (hash: TBD)

### Stream: Session handoff
1. [TODO] После успешного релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report с пользовательским retest `1.1.770`, root cause analysis и итогами parser/UI cleanup release, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record diagram modules retest blocker release`).
2. [TODO] Git Commit: `docs(session): record diagram modules retest blocker release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase36-2026-03-23.md`
- Active planning docs for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StagedPrompt_And_Continuation_Repair_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Workflow_CompositePrompt_Contract_And_Runtime_Input_Restrictions_Architecture.md`
- User constraints for this scope:
  - `Diagram Modules` остаётся главным graphical review step;
  - базовый slice не требует relation lines;
  - пользователь не должен подтверждать каждый отдельный `Product Part` через чат;
  - runtime должен sequentially materialize `Product Part` автоматически, скрывая orchestration-turns из обычного пользовательского диалога;
  - React Flow должен progressively regeneraте graph по мере появления новых part-артефактов;
  - decomposition не отменяет обязательный fix для ложного `Codex` idle-timeout и потери late provider messages;
  - staged user-facing prompt/template contract не должен противоречить реальному runtime flow;
  - continuation после `Phase 1` не должен зависеть только от `structured_output`, если provider пишет staged файлы напрямую.
  - agent не должен тратить turn на поиск compatibility inventory, staged examples, continuity files или legacy helper artifacts, если runtime явно не передал их как вход текущего diagram stage.

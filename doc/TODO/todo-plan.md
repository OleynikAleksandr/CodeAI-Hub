# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`, `doc/Sessions/Session132.md`, `doc/Sessions/Session133.md`
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
4. [DONE] Git Commit: `docs(session): sync diagram modules decomposition planning handoff` (hash: TBD)

## Phase 38 — Diagram Modules Product Part Artifact Contract (owner: Oleksandr, updated: 2026-03-23)

### Stream: Workflow SSOT for staged decomposition
1. [DONE] Зафиксировать в workflow/system docs, что `Diagram Modules` больше не опирается на giant single-turn `module-inventory.md`, а начинается с `product-parts.index.md`, затем материализует отдельные part-файлы и откладывает relation lines из базового slice (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(workflow): formalize product part decomposition contract`).
2. [DONE] Git Commit: `docs(workflow): formalize product part decomposition contract` (hash: `b10ae202`)

### Stream: Prompt and path contract for new artifacts
1. [DONE] Добавить typed path contract `diagram_modules` для `product-parts.index.md` и dynamic `product-parts/<part-id>.md`, чтобы runtime мог безопасно разрешать staged artifact paths внутри workspace без giant single-file assumptions (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.test.ts`; expected commit: `feat(diagram-workflow): add product part artifact path contract`).
2. [DONE] Git Commit: `feat(diagram-workflow): add product part artifact path contract` (hash: `941d5f03`)
3. [DONE] Перенастроить PM prompt pack `diagram_modules` на `product-parts.index.md`, staged `Product Part` generation и runtime-owned compatibility aggregate, чтобы первый user-visible turn больше не вел агента напрямую к giant `module-inventory.md` (scope: `src/client/project-manager/services/prompt-pack-builder.ts`, `src/client/project-manager/services/prompt-pack-builder.virtual-simulation.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): retarget diagram modules prompt to staged artifacts`).
4. [TODO] Git Commit: `feat(diagram-workflow): retarget diagram modules prompt to staged artifacts` (hash: TBD)

### Stream: Artifact upsert and validation baseline
1. [TODO] Добавить artifact-upsert validation rules для `product-parts.index.md` и `product-parts/<part-id>.md`, оставив aggregate `module-inventory.md` runtime-owned compatibility output, а не прямой agent-written target (scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/workflow/paths/workflow-paths-types.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): validate product part artifacts`).
2. [TODO] Git Commit: `feat(diagram-workflow): validate product part artifacts` (hash: TBD)

## Phase 39 — Hidden Runtime Orchestration And Lock Contract (owner: Oleksandr, updated: 2026-03-23)

### Stream: Sequential substep state model
1. [TODO] Ввести runtime-visible substep contract для `diagram_modules` (`index`, `generate_product_part`, `compose_aggregate`, `awaiting_review`, `blocked_ambiguity`) с current part cursor и progress metadata, чтобы шаг больше не выглядел как один неразличимый giant turn (scope: `src/client/project-manager/core-stream-message-types.ts`, `src/client/project-manager/services/workflow-state-client.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): add product part substep state model`).
2. [TODO] Git Commit: `feat(diagram-workflow): add product part substep state model` (hash: TBD)

### Stream: Hidden continuation turns
1. [TODO] Реализовать runtime-controlled hidden continuation turns для последовательной генерации `Product Part`, чтобы следующий subturn запускался без fake user-visible `Продолжай`, а continuation packet содержал cursor, generated parts и stop conditions (scope: `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/description-submit-service.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): orchestrate hidden product part turns`).
2. [TODO] Git Commit: `feat(diagram-workflow): orchestrate hidden product part turns` (hash: TBD)

### Stream: Input lock until final review
1. [TODO] Удерживать session input locked между hidden product-part subturn-ами и отпускать его только на blocking ambiguity или на финальном review boundary, чтобы decomposition не повторил premature unlock bug старого giant-turn flow (scope: `src/client/ui/src/app-host/session-stream-snapshot-sync.ts`, `src/client/ui/src/session/input-panel.tsx`, `doc/TODO/todo-plan.md`; expected commit: `fix(session-ui): keep input locked during product part sequence`).
2. [TODO] Git Commit: `fix(session-ui): keep input locked during product part sequence` (hash: TBD)

## Phase 40 — Progressive React Flow Materialization (owner: Oleksandr, updated: 2026-03-23)

### Stream: Index-first graph skeleton
1. [TODO] Научить `Diagram Modules` loader читать `product-parts.index.md`, строить ordered skeleton `Product Part` containers и показывать placeholders для ещё не materialized part-файлов (scope: `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-ui): load product part skeleton from index artifact`).
2. [TODO] Git Commit: `feat(diagram-ui): load product part skeleton from index artifact` (hash: TBD)

### Stream: Progressive graph regeneration
1. [TODO] Перевести flow projection на merge index placeholders с уже готовыми part-артефактами, чтобы React Flow инкрементально дорисовывал graph без очистки уже появившихся `Product Part` (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-layout): progressively materialize product parts`).
2. [TODO] Git Commit: `feat(diagram-layout): progressively materialize product parts` (hash: TBD)

### Stream: Progress surface in PM
1. [TODO] Добавить user-facing progress surface для `Diagram Modules`, чтобы PM показывал planned/generated `Product Part` state и не создавал ощущение, что во время длинной последовательности ничего не происходит (scope: `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-ui): show product part generation progress`).
2. [TODO] Git Commit: `feat(diagram-ui): show product part generation progress` (hash: TBD)

## Phase 41 — Compatibility Aggregate And Completion Gate (owner: Oleksandr, updated: 2026-03-23)

### Stream: Runtime aggregate compose
1. [TODO] Собрать compatibility aggregate `module-inventory.md` из `product-parts.index.md` и part-файлов, чтобы downstream `Diagram Facades` по-прежнему читал единый canonical input, а user-facing generation при этом оставался decomposed и progressive (scope: `packages/core/src/workflow/diagram-dsl/module-inventory-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): compose aggregate inventory from product parts`).
2. [TODO] Git Commit: `feat(diagram-workflow): compose aggregate inventory from product parts` (hash: TBD)

### Stream: Stage completion and gating
1. [TODO] Перевести `diagram_modules` completion/gating на правило `all planned Product Parts generated + aggregate inventory materialized`, при этом relation lines оставить deferred и не требовать их для базового завершения шага (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-workflow): gate completion by product part sequence`).
2. [TODO] Git Commit: `fix(diagram-workflow): gate completion by product part sequence` (hash: TBD)

## Phase 42 — Codex Long-Turn Stability And Transcript Preservation (owner: Oleksandr, updated: 2026-03-23)

### Stream: False idle-timeout removal
1. [TODO] Убрать ложное завершение long-silent tool-heavy `Codex` turn-ов по hard `idle_timeout`, чтобы `diagram_modules` не погибал до `structured_output` и сохранения артефакта только из-за длинной паузы между provider events (scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(codex): avoid false idle timeout on long diagram turns`).
2. [TODO] Git Commit: `fix(codex): avoid false idle timeout on long diagram turns` (hash: TBD)

### Stream: Late provider message preservation
1. [TODO] Сохранить late provider commentary/final messages в unified session и session UI после длинных `Codex` turn-ов, чтобы raw provider transcript и infinite session history больше не расходились, как в найденном `diagram_modules` failure case (scope: `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/unified-session/storage.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(session-history): preserve late codex provider messages`).
2. [TODO] Git Commit: `fix(session-history): preserve late codex provider messages` (hash: TBD)

## Phase 43 — Release Build After Product Part Decomposition Refactor (owner: Oleksandr, updated: 2026-03-23)

### Stream: Release notes sync
1. [TODO] Перед новым release-cycle синхронизировать `README.md`, `CHANGELOG.md` и workflow docs с progressive `Product Part` generation baseline и deferred relation-line policy для следующего patch release после `1.1.767` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync product part decomposition release notes`).
2. [TODO] Git Commit: `docs(release): sync product part decomposition release notes` (hash: TBD)

### Stream: Release build
1. [TODO] После принятия decomposition refactor и `Codex` stability fixes выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` и собрать новый локальный baseline для следующего пользовательского retest (scope: release/version manifests and package metadata, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare product part decomposition release`).
2. [TODO] Git Commit: `chore(release): prepare product part decomposition release` (hash: TBD)

### Stream: Session handoff
1. [TODO] После успешного релиза синхронизировать active plan фактическими hash-ами, оформить следующий session report с итогами product-part refactor, `Codex` timeout fix и release verification, затем закрыть цикл clean-tree handoff-коммитом (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record product part decomposition release`).
2. [TODO] Git Commit: `docs(session): record product part decomposition release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase36-2026-03-23.md`
- Active planning docs for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Decomposition_And_Progressive_Rendering_Architecture.md`
- User constraints for this scope:
  - `Diagram Modules` остаётся главным graphical review step;
  - базовый slice не требует relation lines;
  - пользователь не должен подтверждать каждый отдельный `Product Part` через чат;
  - runtime должен sequentially materialize `Product Part` автоматически, скрывая orchestration-turns из обычного пользовательского диалога;
  - React Flow должен progressively regeneraте graph по мере появления новых part-артефактов;
  - decomposition не отменяет обязательный fix для ложного `Codex` idle-timeout и потери late provider messages.

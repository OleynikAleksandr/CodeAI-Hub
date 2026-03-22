# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`, `doc/Sessions/Session124.md`, `doc/Sessions/Session125.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 28 — Workflow Glossary Regression Follow-Up (owner: Oleksandr, updated: 2026-03-22)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый `Phase 27` plan и открыть новый testing-driven glossary scope, где accepted findings идут от live regression на `1.1.763`, а первым подтверждённым кейсом становится vocabulary drift между `Description Help`, diagram DSL и пользовательским пониманием верхнего уровня системы (scope: `doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`, `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start workflow glossary regression scope`).
2. [DONE] Git Commit: `docs(plan): start workflow glossary regression scope` (hash: `5c94b01c`)

### Stream: Product Part glossary and DSL simplification
1. [IN_PROGRESS] Закрыть сразу два принятых finding-а одним coherent fix: заменить в active glossary длинный термин `самостоятельная часть продукта` на канонический `Product Part`, а обязательное поле `Role` убрать из user-facing `module-inventory.md`, сохранив backward-compatible parse для legacy `Role:` строк (scope: `packages/core/src/workflow/diagram-dsl/diagram-dsl-types.ts`, `packages/core/src/workflow/diagram-dsl/module-inventory-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/description-agent/assets/description-template.md`, `src/client/project-manager/components/description/description-step-help.tsx`, `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix(diagram-modules): simplify product part DSL glossary`).
2. [TODO] Git Commit: `fix(diagram-modules): simplify product part DSL glossary` (hash: TBD)

### Stream: Explicit Module labeling in diagram UI
1. [IN_PROGRESS] Закрыть user-facing diagram finding: вернуть `Module` как явную сущность на карточках diagram UI, опустить `Kind` до вторичной подписи и убрать display-only `Role` с карточек `Product Part`, чтобы верхний уровень читался через `Product Part`, `Title`, `Purpose`, `Clusters` и `Standalone Modules` (scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.external-boundary.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`; expected commit: `fix(diagram-ui): restore explicit module labeling`).
2. [TODO] Git Commit: `fix(diagram-ui): restore explicit module labeling` (hash: TBD)

### Stream: Release build after accepted glossary fixes
1. [BLOCKED] После закрытия принятых glossary fixes, DSL simplification fixes и diagram UI labeling fixes выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, зафиксировать новый regression baseline и оформить новый session report (scope: release/version docs and session files to be determined by accepted fixes; expected commit: `chore(release): prepare workflow glossary regression release`).
2. [BLOCKED] Git Commit: `chore(release): prepare workflow glossary regression release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase26-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase27-2026-03-22.md`
- Active planning doc for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`
- Current validated release baseline:
  - `codeai-hub-1.1.763.vsix`
- Первые принятые cases этого scope:
  - user-facing vocabulary не объясняет, что `Product Part` — верхний уровень модели;
  - обязательное `Role` в user-facing inventory уже принято как кандидат на removal, а не на дальнейшее расширение enum;
  - diagram UI потерял явное user-facing имя сущности `Module`.

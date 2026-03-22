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
2. [TODO] Git Commit: `docs(plan): start workflow glossary regression scope` (hash: TBD)

### Stream: Product Part glossary alignment
1. [TODO] Классифицировать и закрыть первый accepted glossary finding: заменить в user-facing glossary длинный термин `самостоятельная часть продукта` на канонический `Product Part`, явно объяснив, что `Product Part` — это верхнеуровневая часть системы, а не отдельная роль внутри словаря (scope: `src/client/project-manager/components/description/description-step-help.tsx`, `packages/agents/description-agent/assets/description-template.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix(glossary): align top-level term to product part`).
2. [TODO] Git Commit: `fix(glossary): align top-level term to product part` (hash: TBD)

### Stream: Product Part role vocabulary expansion
1. [TODO] Синхронизировать user-facing role glossary для `Product Part`: добавить `application` и коротко объяснить, что `shell`, `application`, `runtime`, `provider`, `external` — это роли верхнеуровневой части продукта, а не отдельные уровни архитектуры; закрыть drift между кодовым DSL и user-facing field reference (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/description-agent/assets/description-collector-prompt.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `fix(glossary): explain product part roles`).
2. [TODO] Git Commit: `fix(glossary): explain product part roles` (hash: TBD)

### Stream: Testing-oriented wording follow-up
1. [TODO] Переписать active user-facing wording так, чтобы glossary помогал пользователю без знания кода замечать структурные smells на `Virtual Simulation` / `Diagram Modules`, не подсказывая готовую реализацию конкретного проекта (scope: `src/client/project-manager/components/description/description-step-help.tsx`, `packages/agents/description-agent/assets/description-template.md`, `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`; expected commit: `docs(glossary): refine testing-oriented wording`).
2. [TODO] Git Commit: `docs(glossary): refine testing-oriented wording` (hash: TBD)

### Stream: Role field simplification / DSL redesign
1. [TODO] Классифицировать и спроектировать следующий accepted finding: обязательное поле `Role` в `Product Part` даёт мало user-facing пользы, но создаёт жёсткий vocabulary drift для новых типов продуктов; определить минимальный redesign path (`optional Role` или removal from user-facing inventory) без поломки parser/runtime migration (scope: `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`, `packages/core/src/workflow/diagram-dsl/diagram-dsl-types.ts`, `packages/core/src/workflow/diagram-dsl/module-inventory-parser.ts`; expected commit: `docs(dsl): classify product part role simplification`).
2. [TODO] Git Commit: `docs(dsl): classify product part role simplification` (hash: TBD)

### Stream: Explicit Module labeling in diagram UI
1. [TODO] Классифицировать и закрыть user-facing diagram finding: вернуть `Module` как явную сущность на карточках diagram UI и отделить её от вторичного `Kind`, чтобы пользователь видел `Module`, а `service/store/library` читались только как классификация модуля (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `doc/SolidWorks-WorkFlow/Plans/WorkflowGlossary_TestingFeedback_Architecture.md`; expected commit: `fix(diagram-ui): restore explicit module labeling`).
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
  - user-facing vocabulary не объясняет, что `Product Part` — верхний уровень модели, и не даёт пользователю понятных ролей `shell / application / runtime / provider / external`;
  - обязательное `Role` выглядит кандидатом на упрощение DSL;
  - diagram UI потерял явное user-facing имя сущности `Module`.

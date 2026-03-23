# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/Sessions/Session130.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 31 — Diagram Modules Review-Step Baseline (owner: Oleksandr, updated: 2026-03-23)

### Stream: Planning baseline
1. [DONE] Заархивировать завершённый plan до `Phase 30`, оформить новый planning-doc, в котором `Diagram Modules` зафиксирован как главный user-review step workflow, а также открыть новый `todo-plan.md` с детерминированным `measure -> place` baseline для `Product Part / Cluster / Module` и финальным release stream (scope: `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start diagram modules review layout scope`).
2. [DONE] Git Commit: `docs(plan): start diagram modules review layout scope` (hash: `230a2894`)

## Phase 32 — Diagram Modules Purpose Surface And Layout Contract (owner: Oleksandr, updated: 2026-03-23)

### Stream: Product hierarchy node data
1. [DONE] Протянуть purpose text `Product Part` и `Cluster` через module-stage React Flow projection, чтобы renderer больше не терял этот слой при построении diagram nodes (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`; expected commit: `fix(diagram-layout): surface product hierarchy purpose text`).
2. [DONE] Git Commit: `fix(diagram-layout): surface product hierarchy purpose text` (hash: `7cb60c2a`)

### Stream: Product hierarchy card rendering
1. [DONE] Обновить container cards `Diagram Modules`, чтобы `Product Part` и `Cluster` показывали короткий purpose block как часть header-zone и не теряли текущую читаемость module cards (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-ui): show product hierarchy purpose text`).
2. [DONE] Git Commit: `fix(diagram-ui): show product hierarchy purpose text` (hash: `3bf565b6`)

### Stream: Layout contract in docs
1. [DONE] Зафиксировать в workflow/design docs, что `Diagram Modules` является главным user-review step до `Diagram Facades`, и записать accepted autolayout invariants для `measure -> place`, header-zone reservation и shortest-column standalone compaction (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(workflow): formalize diagram modules review contract`).
2. [DONE] Git Commit: `docs(workflow): formalize diagram modules review contract` (hash: `4996fc25`)

## Phase 33 — Diagram Modules Deterministic Autolayout (owner: Oleksandr, updated: 2026-03-23)

### Stream: Cluster measurement and stack safety
1. [DONE] Перевести высоту `Cluster` с расчёта по числу модулей на measured header/body budget, чтобы cluster header резервировал место под title/meta/purpose, а module cards больше не пересекали header-zone и соседние cards (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.standalone-band.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`; expected commit: `fix(diagram-layout): reserve cluster header and stack modules safely`).
2. [DONE] Git Commit: `fix(diagram-layout): reserve cluster header and stack modules safely` (hash: `7b133dcc`)

### Stream: Product part compaction
1. [DONE] Перестроить placement standalone modules внутри `Product Part`, чтобы они пристыковывались под более короткую измеренную колонку, а outer frame product-part замыкался по реально занятому содержимому с симметричными left/right/bottom paddings (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.product-parts.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-layout): compact standalone modules inside product part`).
2. [DONE] Git Commit: `fix(diagram-layout): compact standalone modules inside product part` (hash: `83f50d58`)

### Stream: Dense scenario regression evidence
1. [DONE] После принятия layout fixes зафиксировать regression evidence на самом плотном `Product Part` сценарии и подтвердить, что purpose text, cluster stacking и standalone compaction читаемы без ручной раскладки (scope: `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`, `doc/Sessions/Session130.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(layout): record dense product part regression evidence`).
2. [DONE] Git Commit: `docs(layout): record dense product part regression evidence` (hash: `4685fc3b`)

## Phase 34 — Release Build After Diagram Modules Review-Step Fixes (owner: Oleksandr, updated: 2026-03-23)

### Stream: Release notes sync
1. [DONE] До запуска release scripts синхронизировать `README.md` и `CHANGELOG.md` с ожидаемым release target `1.1.766`, чтобы build cycle шёл уже от актуального user-facing version narrative (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync diagram modules layout release notes`).
2. [DONE] Git Commit: `docs(release): sync diagram modules layout release notes` (hash: `d048904b`)

### Stream: Release build
1. [DONE] После принятия fixes по `Diagram Modules` review-surface и autolayout обновить релизные документы, выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version` и собрать новый локальный baseline (scope: `README.md`, `CHANGELOG.md`, release/version manifests and package metadata; expected commit: `chore(release): prepare diagram modules review layout release`).
2. [DONE] Git Commit: `chore(release): prepare diagram modules review layout release` (hash: `037bf15c`)

### Stream: Release gate contract sync
1. [DONE] Синхронизировать sidecar type-tests с новым `purpose` contract для `Product Part / Cluster`, чтобы финальный `build-release.sh --use-current-version` проходил type-check без post-release drift (scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `test(diagram-layout): sync flow sidecar purpose contract`).
2. [TODO] Git Commit: `test(diagram-layout): sync flow sidecar purpose contract` (hash: TBD)

### Stream: Session handoff
1. [TODO] После успешной релизной сборки синхронизировать active plan фактическими hash-ами, оформить новый session report и зафиксировать clean-tree handoff вместе с outcome-ами dense-layout regression (scope: `doc/TODO/todo-plan.md`, next session report file, related release docs if needed; expected commit: `docs(session): record diagram modules review layout release`).
2. [TODO] Git Commit: `docs(session): record diagram modules review layout release` (hash: TBD)

## Notes
- Archived completed rollout plans:
  - `doc/TODO/Archive/todo-plan-up-to-phase28-2026-03-22.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase30-2026-03-23.md`
- Active planning docs for this scope:
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_PromptConsistency_And_Autolayout_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ReviewStep_And_Autolayout_Architecture.md`
- User constraints for this scope:
  - `Diagram Modules` рассматривается как главный user-review step;
  - layout должен быть детерминированным и собираться по схеме `measure -> place`;
  - `Product Part` и `Cluster` обязаны показывать короткий purpose/description layer;
  - standalone modules должны компактизироваться под более короткую колонку, а не уходить в пустой нижний band;
  - relation lines и full `Diagram Facades` redesign не входят в ближайший implementation slice.

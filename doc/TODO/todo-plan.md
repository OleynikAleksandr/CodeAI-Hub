# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md`, `doc/Sessions/Session109.md`, `doc/Sessions/Session110.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 18 — Diagram User-Facing Layout And Format (owner: Oleksandr, updated: 2026-03-20)

### Stream: Planning baseline
1. [DONE] Заархивировать завершенный `Phase 17` execution plan, создать planning docs для user-facing layout/format diagram stages и для формальной module/cluster-facade grammar платформы, затем зафиксировать confirmed baseline: текущая диаграмма слабо полезна пользователю не только из-за layout overlap, но и из-за отсутствия внятно materialized formal entities в кодовой базе (scope: `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start diagram layout and format scope`).
2. [DONE] Git Commit: `docs(plan): start diagram layout and format scope` (hash: `b0eb2f09`)

## Phase 19 — Greenfield Polygon Prompt Grammar (owner: Oleksandr, updated: 2026-03-20)

### Stream: Polygon baseline
1. [DONE] Зафиксировать greenfield-полигон как активный execution scope: привязать новый planning-doc к active TODO и подтвердить, что ближайшая practical цель — не рефакторинг основного repo, а переписывание prompt/template grammar для `Description`, `Virtual Simulation` и `Diagram Modules` на пустых репозиториях (scope: `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): start greenfield architecture polygon`).
2. [DONE] Git Commit: `docs(plan): formalize greenfield polygon grammar` (hash: `080a7351`)

### Stream: Description grammar
1. [DONE] Переписать user-facing `Description` templates так, чтобы шаг начал собирать archetype приложения, deployable/runtime contours и язык formal boundaries, не превращаясь в низкоуровневую спецификацию; затем регенерировать bundled templates (scope: `packages/agents/description-agent/assets/questionnaire-template.md`, `packages/agents/description-agent/assets/description-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): align description user templates with polygon grammar`).
2. [DONE] Git Commit: `docs(prompt): align description and simulation polygon grammar` (hash: `df20c495`)
3. [DONE] Переписать `description-collector-prompt.md`, чтобы агент `Final_Description.md` уже оперировал `Archetype Shell`, `Archetype Profile`, `Package / Deployable Unit`, `Cluster`, `Module`, `Module Facade`, `Cluster Facade`; затем регенерировать bundled templates (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): teach description agent formal architecture grammar`).
4. [DONE] Git Commit: `docs(prompt): align description and simulation polygon grammar` (hash: `df20c495`)

### Stream: Virtual Simulation grammar
1. [DONE] Переписать `virtual-simulation-prompt.md`, чтобы сценарии порождали formal boundaries, archetype-aware shell constraints и простые user-readable interactions между будущими clusters/modules; затем регенерировать bundled templates и обновить prompt-only contract test (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`; expected commit: `docs(prompt): align virtual simulation with formal boundaries`).
2. [DONE] Git Commit: `docs(prompt): align description and simulation polygon grammar` (hash: `df20c495`)

### Stream: Diagram Modules grammar
1. [DONE] Переписать `module-inventory` prompt/template так, чтобы `Diagram Modules` строилась из formal clusters и formal modules: cluster отображается как container с вложенными module-nodes, standalone modules остаются отдельными node-ами, а связи остаются простыми и user-readable; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): align diagram modules inventory grammar`).
2. [DONE] Git Commit: `docs(prompt): align diagram modules polygon grammar` (hash: `ad0dc26b`)
3. [DONE] Переписать field-reference и merge-rules для `module-inventory`, чтобы grammar требовала formal clusters/modules, запрещала loose analytical labels и сохраняла user-approved boundaries; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): lock diagram modules formal grammar`).
4. [DONE] Git Commit: `docs(prompt): align diagram modules polygon grammar` (hash: `ad0dc26b`)
5. [DONE] Обновить diagram-stage contract test, чтобы prompt-pack для `Diagram Modules` проверял новую polygon grammar и appendix invariants для formal clusters/modules (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `test(prompt): cover diagram modules polygon grammar`).
6. [DONE] Git Commit: `docs(prompt): align diagram modules polygon grammar` (hash: `ad0dc26b`)

### Stream: Prompt-pack verification
1. [DONE] Расширить template-sync / visible-template checks так, чтобы `Description`, `Virtual Simulation` и `Diagram Modules` гарантированно поставляли пользователю актуальный polygon prompt surface через existing template-sync path (scope: `packages/core/src/templates/template-sync-service.test.ts`; expected commit: `test(prompt): verify polygon template sync surface`).
2. [DONE] Git Commit: `docs(prompt): align diagram modules polygon grammar` (hash: `ad0dc26b`)

## Phase 20 — Runtime Polygon Prompt And Help Alignment (owner: Oleksandr, updated: 2026-03-21)

### Stream: Description prompt/help alignment
1. [DONE] Имплементировать согласованный compact rewrite для `Description`: связать задачу агента напрямую с анкетой, встроить кластерно-модульный baseline, glossary и правила stop-questioning без повторения структуры questionnaire (scope: `packages/agents/description-agent/assets/description-collector-prompt.md`, `packages/agents/description-agent/assets/description-template.md`, `packages/agents/description-agent/assets/questionnaire-template.md`; expected commit: `docs(prompt): align description runtime surface`).
2. [DONE] Git Commit: `docs(prompt): align description runtime surface` (hash: `921b0198`)
3. [DONE] Выровнять user-facing help `Description` под согласованный glossary и двойной контракт артефакта: документ одновременно читаем пользователю и служит базой для следующего шага (scope: `src/client/project-manager/components/description/description-step-help.tsx`; expected commit: `docs(help): align description step help`).
4. [DONE] Git Commit: `docs(help): align description step help` (hash: `a977a922`)

### Stream: Virtual Simulation prompt/help alignment
1. [DONE] Имплементировать согласованный rewrite для `Virtual Simulation`: базировать шаг на `Final_Description.md`, требовать достаточное количество сценариев и scenario coverage всей системы, а не пересказ только 2-4 user flows (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`; expected commit: `docs(prompt): align virtual simulation coverage grammar`).
2. [DONE] Git Commit: `docs(prompt): align virtual simulation coverage grammar` (hash: `2e1f568e`)
3. [DONE] Выровнять user-facing help `Virtual Simulation` под language of coverage, artifact-as-baseline и stop-questioning contract без управления переходом пользователя между шагами (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-help.tsx`; expected commit: `docs(help): align virtual simulation step help`).
4. [DONE] Git Commit: `docs(help): align virtual simulation step help` (hash: `f0e0cbfd`)

### Stream: Diagram Modules prompt/help alignment
1. [DONE] Имплементировать согласованный rewrite prompt/template surface для `Diagram Modules`: убрать язык `significant/insignificant`, привязать форму артефакта к runtime templates и зафиксировать inventory как semantic source of truth, а не layout artifact (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): align diagram modules runtime surface`).
2. [DONE] Git Commit: `docs(prompt): align diagram modules runtime surface` (hash: `cb061550`)
3. [DONE] Выровнять field reference и merge-rules `Diagram Modules` под ownership-preserving grammar и подготовить переход к `Product Part` ownership layer без потери user-approved boundaries (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-merge-rules.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): prepare diagram modules ownership migration`).
4. [DONE] Git Commit: `docs(prompt): prepare diagram modules ownership migration` (hash: `4befb729`)
5. [DONE] Выровнять user-facing help `Diagram Modules` под runtime template references, glossary, semantic/layout split и объяснение роли `module-map.flow.json` как layout sidecar (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`; expected commit: `docs(help): align diagram modules step help`).
6. [DONE] Git Commit: `docs(help): align diagram modules step help` (hash: `c6bd9798`)

### Stream: Prompt-pack verification
1. [DONE] Обновить prompt-pack / template-sync проверки так, чтобы runtime surface для `Description`, `Virtual Simulation` и `Diagram Modules` гарантированно поставлял новые compact prompts, template references и coverage/ownership language (scope: `packages/core/src/templates/template-sync-service.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.virtual-simulation.test.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `test(prompt): verify ownership-aware prompt surface`).
2. [DONE] Git Commit: `test(prompt): verify ownership-aware prompt surface` (hash: `15221623`)

## Phase 21 — Diagram Modules Product Part DSL Migration (owner: Oleksandr, updated: 2026-03-21)

### Stream: DSL model and parser migration
1. [DONE] Ввести `Product Part` ownership layer в diagram DSL types и serializer contract, чтобы `Module` и `Cluster` больше не жили как сущности без top-level product ownership (scope: `packages/core/src/workflow/diagram-dsl/diagram-dsl-types.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`; expected commit: `feat(diagram-modules): define product part DSL contract`).
2. [DONE] Git Commit: `feat(diagram-modules): define product part DSL contract` (hash: `23da74ac`)
3. [DONE] Научить parser `module-inventory.md` читать hierarchical DSL `Product Part -> Cluster -> Module` и временно поддерживать legacy flat inventories через dual-read / synthetic default ownership path; по ходу синхронно скорректировать standalone module header в v2 template, чтобы parser и runtime template не расходились (scope: `packages/core/src/workflow/diagram-dsl/module-inventory-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`; expected commit: `feat(diagram-modules): parse product part hierarchy`).
4. [DONE] Git Commit: `feat(diagram-modules): parse product part hierarchy` (hash: `8290e8be`)

### Stream: React Flow hierarchy projection
1. [DONE] Перевести projection `Diagram Modules` на nested container model: `Product Part` как top-level container, `Cluster` как child container, `Module` как child node через `parentId` / `extent`, с явным различением cluster members и standalone modules внутри product part; по ходу разнести module-stage и facade-stage adapter tests, чтобы оба `src/` тестовых файла остались под 300 строк, и дочистить соседние diagram-editor fixtures под новый ownership contract, чтобы `typecheck:webview` оставался зелёным (scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.facades.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; expected commit: `feat(diagram-modules): project product part hierarchy to react flow`).
2. [DONE] Git Commit: `feat(diagram-modules): project product part hierarchy to react flow` (hash: `9e4539c5`)
3. [DONE] Обновить React Flow renderer `Diagram Modules`, чтобы `Product Part` и `Cluster` отображались как разные container layers, а модульные карточки оставались user-readable и совместимыми с текущим редактированием; по ходу вынести renderer-spec в отдельный test file, так как текущий `diagram-editor-facade.test.tsx` уже упирается в архитектурный лимит (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`; expected commit: `feat(diagram-modules): render nested ownership containers`).
4. [DONE] Git Commit: `feat(diagram-modules): render nested ownership containers` (hash: `b0dee9f6`)

### Stream: Sidecar and runtime verification
1. [DONE] Проверить, что `module-map.flow.json` остаётся non-semantic layout sidecar и корректно переживает container hierarchy без потери пользовательских drag-позиций и revision guard поведения; если production-код менять не нужно, зафиксировать это явными runtime tests и ownership-aware fixture'ами (scope: `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; expected commit: `test(diagram-modules): keep sidecar stable for nested hierarchy`).
2. [DONE] Git Commit: `test(diagram-modules): keep sidecar stable for nested hierarchy` (hash: `5b3e9528`)

## Phase 22 — Greenfield Runtime Prompt Scope And Help SSOT (owner: Oleksandr, updated: 2026-03-21)

### Stream: Empty-workspace guardrails and help SSOT
1. [DONE] Ужесточить greenfield source-scope в runtime prompt surface для `Virtual Simulation` и `Diagram Modules`: явно ограничить чтение только project-local artifacts внутри `.codeai-hub/<workspaceSlug>/...`, continuity-файлами текущего stage и файлами, которые пользователь явно указал для текущего проекта; отдельно запретить использовать implementation/parser code самого CodeAI Hub как источник архитектурных решений для empty-workspace сессий; затем регенерировать bundled templates (scope: `packages/core/src/templates/source/virtual-simulation-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): restrict greenfield stages to project artifacts`).
2. [DONE] Git Commit: `docs(prompt): restrict greenfield stages to project artifacts` (hash: `1d5198d1`)
3. [DONE] Дописать parser-critical invariants для `Diagram Modules` прямо в user-facing prompt surface: отдельно зафиксировать, что в каждом `Product Part` поля `Clusters:` и `Standalone Modules:` должны в точности совпадать с реально вложенными `### Cluster:` / standalone `### Module:` блоками этого же `Product Part`; заодно убрать устаревшее описание обязательных секций `## Clusters` / `## Standalone Modules` и заменить его на текущий DSL с `## Product Parts`; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(prompt): clarify product part parser invariants`).
4. [DONE] Git Commit: `docs(prompt): clarify product part parser invariants` (hash: `75f6c3ee`)
5. [DONE] Синхронизировать `Diagram Modules` runtime reference/template с новым ownership-aware DSL: добавить в field reference явное описание `Product Part` как top-level ownership layer, полей `Clusters` / `Standalone Modules` и правила exact match с nested blocks; в template добавить authoring checklist перед завершением (`Product Part Id/header match`, exact match списков и nested blocks, корректный ownership у cluster/module) и вычистить legacy-ориентированные формулировки; затем регенерировать bundled templates (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-field-reference.md`, `packages/agents/diagram-modules-agent/assets/module-inventory-template.md`, `packages/core/src/templates/bundled-templates.ts`; expected commit: `docs(template): codify product part authoring checklist`).
6. [TODO] Git Commit: `docs(template): codify product part authoring checklist` (hash: TBD)
7. [DONE] Свести empty artifact surfaces к единому SSOT на базе help-компонентов: пока canonical artifact ещё не создан, `Artifacts` panel для `Virtual Simulation`, `Diagram Modules` и `Diagram Facades` должна показывать тот же help-текст, что и вкладка `Help`, без отдельного diverging intro/pending prose (scope: `src/client/project-manager/components/virtual-simulation/virtual-simulation-panel.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`; expected commit: `fix(ui): reuse stage help before artifact creation`).
8. [DONE] Git Commit: `fix(ui): reuse stage help before artifact creation` (hash: `d41957d8`)

## Phase 23 — Следующий шаг: Diagram Modules Product Part Auto-Layout Stabilization (owner: Oleksandr, updated: 2026-03-21)

### Stream: Product Part lane placement
1. [TODO] Пересобрать first-open auto-layout для `Diagram Modules`, чтобы top-level `Product Part` раскладывались как независимые lane/row containers после расчёта реальных child bounds, а не паковались как обычные соседние узлы с наложением друг на друга; зафиксировать regression test на ownership-aware inventory без `module-map.flow.json`, чтобы overlap крупных parent containers больше не возвращался (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `fix(diagram-layout): separate product part containers`).
2. [TODO] Git Commit: `fix(diagram-layout): separate product part containers` (hash: TBD)

### Stream: Standalone module band stabilization
1. [TODO] Нормализовать размещение standalone modules внутри `Product Part`: вынести их в отдельную предсказуемую band/row внутри контейнера product part, чтобы standalone-карточки не ломали cluster grid и не выталкивали cluster containers в overlap при first-open layout; покрыть это ownership-aware fixture и sidecar-stability проверкой (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; expected commit: `fix(diagram-layout): stabilize standalone module band`).
2. [TODO] Git Commit: `fix(diagram-layout): stabilize standalone module band` (hash: TBD)

### Stream: External boundary readability
1. [TODO] Вернуть читаемую внешнюю boundary для выбранного AI provider и проверить, что gateway/external nodes не визуализируются как внутренние элементы `Product Part`; при необходимости развести materialization/layout rules для ownership-free external nodes и закрепить renderer expectation на уровне тестов (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-ownership-renderer.test.tsx`; expected commit: `fix(diagram-layout): keep external provider outside product parts`).
2. [TODO] Git Commit: `fix(diagram-layout): keep external provider outside product parts` (hash: TBD)

### Stream: Release build after Phase 22 and Phase 23
1. [TODO] После закрытия всех micro-task `Phase 22` и `Phase 23` выполнить release-oriented verification и собрать новый локальный релиз по стандартному checklist: таргетные проверки затронутых webview/diagram packages, затем на чистом дереве `./scripts/build-all.sh` и `./scripts/build-release.sh --use-current-version`; после успеха обновить `doc/Sessions/`, зафиксировать новую версию артефактов и handoff для следующего regression pass на свежем VSIX (scope: `scripts/build-all.sh`, `scripts/build-release.sh`, `doc/Sessions/Session115.md`; expected commit: `chore(release): build post-layout regression package`).
2. [TODO] Git Commit: `chore(release): build post-layout regression package` (hash: TBD)

## Notes
- Archived previous completed rollout plan: `doc/TODO/Archive/todo-plan-phase17-codex-resume-recovery-2026-03-20.md`
- Active planning docs for this phase:
  - `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_UserFacing_Layout_And_Format_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Formal_Module_Cluster_Facade_Architecture.md`
  - `doc/SolidWorks-WorkFlow/Plans/Greenfield_Architecture_Polygon.md`
  - `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_ProductPart_Hierarchy_DSL_Architecture.md`
- Session handoff report:
  - `doc/Sessions/Session109.md`
  - `doc/Sessions/Session110.md`
  - `doc/Sessions/Session111.md`
- Active mirrored workspace artifact:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/diagram_modules/module-inventory.md`
- Current verified baseline:
  - prompt/help/template rewrites для `Description`, `Virtual Simulation`, `Diagram Modules` уже закоммичены и вошли в локальный релиз `1.1.755`
  - `Diagram Modules` уже переведён на ownership-aware hierarchy `Product Part -> Cluster -> Module`
  - `module-map.flow.json` подтверждён как non-semantic layout sidecar и для новой nested hierarchy
- Current remaining validation focus:
  - greenfield regression для `Description` и `Virtual Simulation` на локальном релизе `1.1.755` уже пройден; следующий активный этап — `Diagram Modules`
  - после `Diagram Modules` продолжить regression-цепочку через `Diagram Facades`
  - при переходе к diagram stages проверить, насколько first-open diagram читается без sidecar и где fallback positions всё ещё ухудшают user readability
  - после regression-pass решить, архивировать ли текущий completed `todo-plan.md` и с каким новым scope открывать следующий execution plan
- Current greenfield regression artifact baseline:
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/questionnaire.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/description/Final_Description.md`
  - `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4/.codeai-hub/codeai-hub-codex-5-4/virtual_simulation/virtual-simulation.md`
- Questionnaire filling lesson from `Description` regression:
  - если ключевые product facts уже известны заранее, их лучше писать в анкету сразу: primary shell `Standalone Project Manager`, MVP-роль `VS Code extension`, известные workflow stages вроде `Description -> Virtual Simulation -> Diagram Modules -> Diagram Facades`
  - если такой уверенности нет, лучше оставить поле пустым и дать агенту задать уточняющие вопросы, потому что частично заданная, но архитектурно неточная анкета сильно удлиняет corrective dialogue

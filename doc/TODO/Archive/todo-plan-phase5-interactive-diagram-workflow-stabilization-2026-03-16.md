# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Дополнительно перед стартом этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`, `doc/Sessions/Archive/Session083.md`
- Execution-plan основан на planning-доке `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`
- TODO Plan состоит из Phase (Фаз). В каждой Phase некоторое количество Stream (стримов), в каждом стриме - микро-задачи
- Каждая микро-задача затрагивает не более 3 файлов или пакетов
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Таргетные сборки выполнять перед закрытием затронутого Stream/Phase
- После каждой Phase обязателен отдельный release stream: актуализация docs -> `./scripts/build-all.sh` -> `./scripts/build-release.sh --use-current-version` -> session report с ручным checklist того, что пользователь должен проверить
- Полностью реализованный `todo-plan.md` переносится в `doc/TODO/Archive/`, после чего на его месте создаётся новый план под следующий scope

---

## Phase 1 — DSL foundation and artifact migration (owner: Oleksandr, updated: 2026-03-16)

### Stream: Diagram DSL parser foundation
1. [DONE] Создать базовые типы DSL и parser для `Module Map`: `diagram-dsl-types.ts`, `markdown-dsl-shared.ts`, `markdown-dsl-parser.ts`, `markdown-dsl-parser.test.ts` (scope: `packages/core/src/workflow/diagram-dsl/diagram-dsl-types.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.test.ts`; expected commit: `feat(core): add module map dsl parser foundation`).
2. [DONE] Git Commit: `feat(core): add module map dsl parser foundation` (hash: `ae49756a`)
3. [DONE] Расширить parser под `Facade Map` и strict error policy для unknown/duplicate/missing-field cases: `diagram-dsl-types.ts`, `markdown-dsl-shared.ts`, `markdown-dsl-parser.ts`, `module-map-parser.ts`, `facade-map-parser.ts`, `markdown-dsl-parser.test.ts`, `facade-map-parser.test.ts` (scope: `packages/core/src/workflow/diagram-dsl/diagram-dsl-types.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.ts`, `packages/core/src/workflow/diagram-dsl/module-map-parser.ts`, `packages/core/src/workflow/diagram-dsl/facade-map-parser.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.test.ts`, `packages/core/src/workflow/diagram-dsl/facade-map-parser.test.ts`; expected commit: `feat(core): add facade map parser validation rules`).
4. [DONE] Git Commit: `feat(core): add facade map parser validation rules` (hash: `094d4133`)
5. [DONE] Добавить serializer и revision service для детерминированного Markdown-DSL output (scope: `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`, `packages/core/src/workflow/diagram-dsl/diagram-revision.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.test.ts`; expected commit: `feat(core): add diagram dsl serializer and revision`).
6. [DONE] Git Commit: `feat(core): add diagram dsl serializer and revision` (hash: `3a567d25`)

### Stream: Baseline diff and change summary
1. [DONE] Реализовать baseline diff service и типы structured `ChangeSummary` для `module-map.md` (scope: `packages/core/src/workflow/diagram-dsl/baseline-diff-service.ts`, `packages/core/src/workflow/diagram-dsl/change-summary-types.ts`, `packages/core/src/workflow/diagram-dsl/baseline-diff-service.test.ts`; expected commit: `feat(core): add module map baseline diff service`).
2. [DONE] Git Commit: `feat(core): add module map baseline diff service` (hash: `3a7f1f98`)
3. [DONE] Расширить baseline diff service под `facade-map.md` и field-level modified summaries (scope: `packages/core/src/workflow/diagram-dsl/baseline-diff-service.ts`, `packages/core/src/workflow/diagram-dsl/change-summary-types.ts`, `packages/core/src/workflow/diagram-dsl/baseline-diff-service.test.ts`; expected commit: `feat(core): add facade map change summaries`).
4. [DONE] Git Commit: `feat(core): add facade map change summaries` (hash: `20c7a858`)

### Stream: Agent stubs and prompt pack assembly
1. [DONE] Создать facade stubs для `diagram-modules-agent` и `diagram-facades-agent`, чтобы runtime имел явные точки входа под будущие asset packs (scope: `packages/agents/diagram-modules-agent/src/facade.ts`, `packages/agents/diagram-modules-agent/src/index.ts`, `packages/agents/diagram-facades-agent/src/facade.ts`; expected commit: `feat(agents): add diagram agent facades`).
2. [DONE] Git Commit: `feat(agents): add diagram agent facades` (hash: `f6a2f221`)
3. [DONE] Завести оставшийся facade stub и подключить diagram prompt pack assembly с change summary в runtime builder, читая agent assets из `packages/agents/*/assets/` (scope: `packages/agents/diagram-facades-agent/src/index.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected commit: `feat(runtime): assemble diagram prompt packs with change summary`).
4. [DONE] Git Commit: `feat(runtime): assemble diagram prompt packs with change summary` (hash: `e7724aed`)

### Stream: Artifact path migration and templates
1. [DONE] Перевести workflow artifact paths c `.mmd` на Markdown-DSL triplet в core path layer (scope: `packages/core/src/workflow/paths/workflow-paths-types.ts`, `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`; expected commit: `refactor(workflow): migrate diagram artifact paths to markdown dsl`).
2. [DONE] Git Commit: `refactor(workflow): migrate diagram artifact paths to markdown dsl` (hash: `56159d1c`)
3. [DONE] Создать module-agent asset pack part 1 в agent package: prompt, template и field-reference для `Diagram Modules` (scope: `packages/agents/diagram-modules-agent/assets/module-map-prompt.md`, `packages/agents/diagram-modules-agent/assets/module-map-template.md`, `packages/agents/diagram-modules-agent/assets/module-map-field-reference.md`; expected commit: `feat(agents): add module diagram asset pack part 1`).
4. [DONE] Git Commit: `feat(agents): add module diagram asset pack part 1` (hash: `5808a2c5`)
5. [DONE] Создать module-agent merge-rules asset и удалить legacy module Mermaid source files, чтобы orphaned `.mmd` не оставались в репозитории (scope: `packages/agents/diagram-modules-agent/assets/module-map-merge-rules.md`, `packages/core/src/templates/source/modules-diagram-prompt.md`, `packages/core/src/templates/source/modules-diagram-template.mmd`; expected commit: `refactor(agents): replace module mermaid assets with agent pack`).
6. [DONE] Git Commit: `refactor(agents): replace module mermaid assets with agent pack` (hash: `a1374150`)
7. [DONE] Создать facade-agent asset pack part 1 в agent package: prompt, template и field-reference для `Diagram Facades` (scope: `packages/agents/diagram-facades-agent/assets/facade-map-prompt.md`, `packages/agents/diagram-facades-agent/assets/facade-map-template.md`, `packages/agents/diagram-facades-agent/assets/facade-map-field-reference.md`; expected commit: `feat(agents): add facade diagram asset pack part 1`).
8. [DONE] Git Commit: `feat(agents): add facade diagram asset pack part 1` (hash: `66f6e95e`)
9. [DONE] Создать facade-agent merge-rules asset и удалить legacy facade Mermaid source files, чтобы orphaned `.mmd` не оставались в репозитории (scope: `packages/agents/diagram-facades-agent/assets/facade-map-merge-rules.md`, `packages/core/src/templates/source/facades-graph-prompt.md`, `packages/core/src/templates/source/facades-graph-template.mmd`; expected commit: `refactor(agents): replace facade mermaid assets with agent pack`).
10. [DONE] Git Commit: `refactor(agents): replace facade mermaid assets with agent pack` (hash: `84255881`)
11. [DONE] Обновить template registry/runtime references после удаления Mermaid assets и перевода diagram prompts на agent packages (scope: `packages/core/src/templates/bundled-templates.ts`, `src/client/project-manager/services/prompt-pack-builder.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`; expected commit: `refactor(runtime): point diagram template registry to agent asset packs`).
12. [DONE] Git Commit: `refactor(runtime): point diagram template registry to agent asset packs` (hash: `820c6dad`)

### Stream: SSOT migration
1. [DONE] Обновить SSOT шагов 3-4 и workflow artifact contract под `module-map.md` / `facade-map.md` / `*.agent-baseline.md` (scope: `doc/SolidWorks-WorkFlow/WorkflowSteps_Overview.md`, `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(workflow): sync diagram dsl artifact contract`).
2. [DONE] Git Commit: `docs(workflow): sync diagram dsl artifact contract` (hash: `0da009dc`)

### Stream: Phase 1 release build and verification
1. [DONE] Подготовить release-facing docs под Phase 1 foundation: новые canonical artifacts, baseline diff, prompt pack assets, отсутствие `.mmd` в workflow (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram dsl foundation release`).
2. [DONE] Git Commit: `docs(release): prep diagram dsl foundation release` (hash: `900c5116`)
3. [DONE] Исправить release generator `bundled-templates`, чтобы `build-core` не требовал удалённые Mermaid diagram source files (scope: `scripts/generate-bundled-templates.js`; expected commit: `fix(release): align bundled template generator with diagram dsl assets`).
4. [DONE] Git Commit: `fix(release): align bundled template generator with diagram dsl assets` (hash: `33309be2`)
5. [DONE] На чистом дереве выполнить release checklist Phase 1 через `./scripts/build-all.sh`, зафиксировать version bump и release artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram dsl foundation release`).
6. [DONE] Git Commit: `chore(release): build diagram dsl foundation release` (hash: `263df6eb`)
7. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: создание `module-map.md`, создание `module-map.agent-baseline.md`, повторный запуск агента с change summary, gating `Diagram Facades` по `module-map.md` (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram dsl foundation release`).
8. [DONE] Git Commit: `docs(session): record diagram dsl foundation release` (hash: TBD)

---

## Phase 2 — PM/UI contract alignment and visual shell (owner: Oleksandr, updated: 2026-03-16)

### Stream: Post-release diagram contract alignment
1. [DONE] Синхронизировать workflow gating и PM start-service под `module-map.md` / `facade-map.md`, чтобы кнопки запуска шагов 3-4 снова создавали agent sessions по новому artifact contract (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit: `fix(workflow): align diagram stage gating with markdown dsl`).
2. [DONE] Git Commit: `fix(workflow): align diagram stage gating with markdown dsl` (hash: `d5836ee2`)
3. [DONE] Перевести artifact availability hooks и tree blocking copy с Mermaid filenames на canonical DSL filenames (scope: `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`, `src/client/project-manager/components/layout/use-diagram-facades-artifact-availability.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit: `fix(ui): align diagram artifact availability with markdown dsl`).
4. [DONE] Git Commit: `fix(ui): align diagram artifact availability with markdown dsl` (hash: `59e9b91d`)
5. [DONE] Синхронизировать diagram panels/help/tree nodes с `module-map.md` / `facade-map.md`, чтобы пользователь видел корректные пути и labels до visual shell (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `fix(ui): sync diagram panels with markdown dsl artifacts`).
6. [DONE] Git Commit: `fix(ui): sync diagram panels with markdown dsl artifacts` (hash: `f9bfe14e`)
7. [DONE] Закрыть остаточные help-copy references на Mermaid contract и проверить запуск Diagram Modules/Facades вручную таргетными сборками PM/UI (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`, `doc/TODO/todo-plan.md`; expected commit: `docs(ui): remove mermaid references from diagram workflow help`).
8. [DONE] Git Commit: `docs(ui): remove mermaid references from diagram workflow help` (hash: `9a3d84b5`)

### Stream: Contract alignment test release
1. [DONE] Подготовить release-facing docs под PM/UI alignment для diagram workflow: запуск шагов 3-4, canonical `.md` artifacts в tree/panels/help, отсутствие активных Mermaid references в PM (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram contract alignment release`).
2. [DONE] Git Commit: `docs(release): prep diagram contract alignment release` (hash: `33b25bf8`)
3. [DONE] На чистом дереве выполнить release checklist для test release через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram contract alignment release`).
4. [DONE] Git Commit: `chore(release): build diagram contract alignment release` (hash: `881cd66f`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: toolbar start для `Diagram Modules`, toolbar start для `Diagram Facades`, открытие `module-map.md` / `facade-map.md` из tree, отсутствие `.mmd` labels в PM (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram contract alignment release`).
6. [DONE] Git Commit: `docs(session): record diagram contract alignment release` (hash: TBD)

### Stream: Diagram agent packaging and cache cleanup
1. [DONE] Добавить corrective stream после test release: diagram agent assets должны попадать в workspace/release surface, иначе contract endpoints в установленном VSIX не находят `module-map-prompt.md` / `facade-map-prompt.md` (scope: `package.json`, `scripts/build-core.sh`, `doc/TODO/todo-plan.md`; expected commit: `fix(release): ship diagram agent assets with core runtime`).
2. [DONE] Git Commit: `fix(release): ship diagram agent assets with core runtime` (hash: `9c35f4ad`)
3. [DONE] Удалить stale legacy diagram templates из `~/.codeai-hub/templates`, чтобы локальный cache не продолжал показывать `modules-diagram-prompt.md` и `modules-diagram-template.mmd` после перехода на Markdown DSL (scope: `packages/core/src/templates/template-sync-service.ts`, `packages/core/src/templates/template-sync-service.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(core): clean up legacy diagram templates`).
4. [DONE] Git Commit: `fix(core): clean up legacy diagram templates` (hash: `d6702846`)
5. [DONE] Подготовить release-facing docs под corrective release: diagram contracts в core runtime, cleanup legacy template cache, ожидаемая ручная проверка запуска `Diagram Modules` / `Diagram Facades` в установленном VSIX (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram contract corrective release`).
6. [DONE] Git Commit: `docs(release): prep diagram contract corrective release` (hash: `f0a1175b`)
7. [DONE] На чистом дереве выполнить release checklist для corrective test release, зафиксировать version bump и refreshed artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram contract corrective release`).
8. [DONE] Git Commit: `chore(release): build diagram contract corrective release` (hash: `60f6c07d`)
9. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки corrective release перед возвратом к visual shell (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram contract corrective release`).
10. [DONE] Git Commit: `docs(session): record diagram contract corrective release` (hash: TBD)

### Stream: Graph adapters
1. [DONE] Реализовать `domainModelToReactFlow()` adapter для module map и тесты на nodes/edges projection (scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`; expected commit: `feat(ui): add module graph adapter`).
2. [DONE] Git Commit: `feat(ui): add module graph adapter` (hash: `11a937a3`)
3. [DONE] Расширить graph adapter под facade map и общий stage-aware transform contract (scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`; expected commit: `feat(ui): add facade graph adapter`).
4. [DONE] Git Commit: `feat(ui): add facade graph adapter` (hash: `23937761`)

### Stream: Editor shell and layout facade
1. [DONE] Подключить `@xyflow/react` и `elkjs`, а также обновить build surface Project Manager для инъекции React Flow CSS без runtime import hacks (scope: `package.json`, `package-lock.json`, `scripts/build-project-manager.js`; expected commit: `build(ui): add diagram editor dependencies`).
2. [DONE] Git Commit: `build(ui): add diagram editor dependencies` (hash: `9f11087a`)
3. [DONE] Создать shared `DiagramEditorFacade` и `DiagramLayoutFacade` как изолирующий слой поверх внешних библиотек (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-layout-facade.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `feat(ui): add shared diagram editor facade`).
4. [DONE] Git Commit: `feat(ui): add shared diagram editor facade` (hash: `57941a08`)
5. [DONE] Реализовать read-only diagram shell с ELK first-layout и кнопкой `Auto-layout` (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/auto-layout-button.tsx`, `src/client/project-manager/components/diagram-editor/save-status-indicator.tsx`; expected commit: `feat(ui): add diagram editor visual shell`).
6. [DONE] Git Commit: `feat(ui): add diagram editor visual shell` (hash: `b72d72b9`)

### Stream: Flow sidecar persistence and panels
1. [DONE] Реализовать `*.flow.json` loader/persistence для positions/viewport без semantic writes в canonical `.md` (scope: `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`; expected commit: `feat(ui): persist diagram flow sidecar state`).
2. [DONE] Git Commit: `feat(ui): persist diagram flow sidecar state` (hash: `2d9439e9`)
3. [DONE] Перевести панели `Diagram Modules` и `Diagram Facades` с Mermaid-text view на read-only visual shell, а также закрыть browser-safe parser seam для PM bundle (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`; expected commit: `feat(ui): render diagram stages via visual shell`).
4. [DONE] Git Commit: `feat(ui): render diagram stages via visual shell` (hash: `a2ca1a02`)

### Stream: Phase 2 release build and verification
1. [DONE] Синхронизировать release-facing docs под visual shell: React Flow render, ELK first-layout, persisted `*.flow.json`, `Auto-layout` без semantic roundtrip (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep diagram visual shell release`).
2. [DONE] Git Commit: `docs(release): prep diagram visual shell release` (hash: `4e54ec48`)
3. [DONE] На чистом дереве выполнить release checklist Phase 2 через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram visual shell release`).
4. [DONE] Git Commit: `chore(release): build diagram visual shell release` (hash: `05184368`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: рендер `module-map.md`, рендер `facade-map.md`, `Auto-layout`, сохранение `*.flow.json`, reopen workspace с восстановлением layout (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram visual shell release`).
6. [DONE] Git Commit: `docs(session): record diagram visual shell release` (hash: TBD)

---

## Phase 3 — semantic editing for Diagram Modules (owner: Oleksandr, updated: 2026-03-16)

### Stream: Module semantic patch pipeline
1. [DONE] Реализовать module patch model и `applyModuleDomainPatch()` для add/update/delete module операций (scope: `src/client/project-manager/components/diagram-editor/module-domain-patches.ts`, `src/client/project-manager/components/diagram-editor/apply-module-domain-patch.ts`, `src/client/project-manager/components/diagram-editor/apply-module-domain-patch.test.ts`; expected commit: `feat(diagram-modules): add module patch pipeline`).
2. [DONE] Git Commit: `feat(diagram-modules): add module patch pipeline` (hash: `8e57e6e8`)
3. [DONE] Реализовать relation patch model и `applyModuleRelationPatch()` для add/update/delete relation операций (scope: `src/client/project-manager/components/diagram-editor/module-relation-patches.ts`, `src/client/project-manager/components/diagram-editor/apply-module-relation-patch.ts`, `src/client/project-manager/components/diagram-editor/apply-module-relation-patch.test.ts`; expected commit: `feat(diagram-modules): add relation patch pipeline`).
4. [DONE] Git Commit: `feat(diagram-modules): add relation patch pipeline` (hash: `6fc19de5`)

### Stream: Module semantic editing and conflict handling
1. [DONE] Добавить semantic editing UI для modules/relations, autosave в `module-map.md`, `Origin: agent -> merged` transitions и shared local merge/conflict loop поверх visual shell (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-editor/use-domain-patch.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`, `src/client/project-manager/components/diagram-editor/save-status-indicator.tsx`, `src/client/project-manager/components/diagram-editor/module-origin-rules.ts`, `src/client/project-manager/components/diagram-editor/module-conflict-merge.ts`, `src/client/project-manager/components/diagram-editor/module-conflict-merge.test.ts`, `src/client/project-manager/components/diagram-editor/module-entity-editor.tsx`, `src/client/project-manager/components/diagram-editor/module-relation-editor.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`; expected commit: `feat(diagram-modules): add semantic editing ui`).
2. [DONE] Git Commit: `feat(diagram-modules): add semantic editing ui` (hash: `837bf0ff`)

### Stream: Phase 3 release build and verification
1. [DONE] Синхронизировать release-facing docs под первый full roundtrip для `Diagram Modules`: semantic edits, autosave, merge/conflict handling и повторный запуск агента поверх user changes (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep diagram modules semantic editing release`).
2. [DONE] Git Commit: `docs(release): prep diagram modules semantic editing release` (hash: `49a87a1a`)
3. [DONE] На чистом дереве выполнить release checklist Phase 3 через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram modules semantic editing release`).
4. [DONE] Git Commit: `chore(release): build diagram modules semantic editing release` (hash: `9d624be6`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: добавить модуль, изменить поля модуля, создать/удалить relation, убедиться что `module-map.md` обновился корректно, повторно запустить агента и проверить сохранение user changes (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram modules semantic editing release`).
6. [DONE] Git Commit: `docs(session): record diagram modules semantic editing release` (hash: TBD)

---

## Phase 4 — semantic editing for Diagram Facades (owner: Oleksandr, updated: 2026-03-16)

### Stream: Facade semantic patch pipeline
1. [DONE] Реализовать facade patch model и `applyFacadeDomainPatch()` для add/update/delete facade операций (scope: `src/client/project-manager/components/diagram-editor/facade-domain-patches.ts`, `src/client/project-manager/components/diagram-editor/apply-facade-domain-patch.ts`, `src/client/project-manager/components/diagram-editor/apply-facade-domain-patch.test.ts`; expected commit: `feat(diagram-facades): add facade patch pipeline`).
2. [DONE] Git Commit: `feat(diagram-facades): add facade patch pipeline` (hash: `84e23463`)
3. [DONE] Реализовать facade relation patch model и patch application для add/update/delete facade relation (scope: `src/client/project-manager/components/diagram-editor/facade-relation-patches.ts`, `src/client/project-manager/components/diagram-editor/apply-facade-relation-patch.ts`, `src/client/project-manager/components/diagram-editor/apply-facade-relation-patch.test.ts`; expected commit: `feat(diagram-facades): add facade relation patch pipeline`).
4. [DONE] Git Commit: `feat(diagram-facades): add facade relation patch pipeline` (hash: `dff772f9`)

### Stream: Facade semantic editing and conflict handling
1. [DONE] Добавить semantic editing UI для facades, methods, ports и facade relations, autosave в `facade-map.md`, facade-specific merge warnings и save/conflict UX поверх visual shell (scope: `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/diagram-editor/facade-entity-editor.tsx`, `src/client/project-manager/components/diagram-editor/facade-methods-editor.tsx`, `src/client/project-manager/components/diagram-editor/facade-ports-editor.tsx`, `src/client/project-manager/components/diagram-editor/facade-relation-editor.tsx`, `src/client/project-manager/components/diagram-editor/facade-conflict-merge.ts`, `src/client/project-manager/components/diagram-editor/facade-conflict-merge.test.ts`; expected commit: `feat(diagram-facades): add semantic editing ui`).
2. [DONE] Git Commit: `feat(diagram-facades): add semantic editing ui` (hash: `de24c20a`)

### Stream: Phase 4 release build and verification
1. [DONE] Синхронизировать release-facing docs под full roundtrip для `Diagram Facades`: methods/ports, facade relations, autosave и повторный запуск facade-agent поверх user edits (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`; expected commit: `docs(release): prep diagram facades semantic editing release`).
2. [DONE] Git Commit: `docs(release): prep diagram facades semantic editing release` (hash: `72f24ae7`)
3. [DONE] На чистом дереве выполнить release checklist Phase 4 через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram facades semantic editing release`).
4. [DONE] Git Commit: `chore(release): build diagram facades semantic editing release` (hash: `aaeebe99`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: построение `facade-map.md` из `module-map.md`, редактирование methods/ports, создание facade relation, повторный запуск facade-agent с сохранением user changes, проверка `Diagram Facades = OUTDATED` после изменения `module-map.md` (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram facades semantic editing release`).
6. [DONE] Git Commit: `docs(session): record diagram facades semantic editing release` (hash: TBD)

---

## Phase 5 — hardening, tests and workflow stabilization (owner: Oleksandr, updated: 2026-03-16)

### Stream: Core and runtime hardening
1. [DONE] Добавить интеграционные тесты concurrent agent/UI writes и baseline-driven merge invariants вне foundation unit-тестов (scope: `packages/core/src/workflow/diagram-dsl/baseline-diff-service.test.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`, `src/client/project-manager/components/diagram-editor/facade-conflict-merge.test.ts`; expected commit: `test(diagrams): cover concurrent merge scenarios`).
2. [DONE] Git Commit: `test(diagrams): cover concurrent merge scenarios` (hash: `143d4abd`)
3. [DONE] Закрыть parser edge cases для BOM / normalized metadata parsing в Markdown DSL (scope: `packages/core/src/workflow/diagram-dsl/markdown-dsl-parser.test.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-shared.ts`; expected commit: `fix(core): harden diagram parser edge cases`).
4. [DONE] Git Commit: `fix(core): harden diagram parser edge cases` (hash: `6b3abc08`)
5. [DONE] Закрыть serializer edge cases для multiline CRLF values и canonical output normalization (scope: `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.test.ts`, `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.ts`; expected commit: `fix(core): harden diagram serializer edge cases`).
6. [DONE] Git Commit: `fix(core): harden diagram serializer edge cases` (hash: `7f084ba8`)

### Stream: UX stabilization
1. [DONE] Довести UX/error states в shared diagram editor: empty states, parse errors, conflict affordances, reopen/resume stability без монолитного компонента (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/save-status-indicator.tsx`, `src/client/project-manager/components/diagram-editor/use-diagram-loader.ts`; expected commit: `fix(ui): harden shared diagram editor ux`).
2. [DONE] Git Commit: `fix(ui): harden shared diagram editor ux` (hash: `b4bc784f`)
3. [DONE] Довести workflow stage UX вокруг diagram branches и availability states после semantic editing, сохранив реальные `blocked/outdated` child-node statuses и targeted coverage (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.test.ts`; expected commit: `fix(ui): harden diagram workflow availability states`).
4. [DONE] Git Commit: `fix(ui): harden diagram workflow availability states` (hash: `62db59e3`)

### Stream: Phase 5 release build and final verification
1. [DONE] Синхронизировать финальные release-facing docs под устойчивый workflow шагов 3-4 и зафиксировать полный manual verification flow в `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` и execution-plan (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep interactive diagram workflow stabilization release`).
2. [DONE] Git Commit: `docs(release): prep interactive diagram workflow stabilization release` (hash: `1e6d0693`)
3. [DONE] На чистом дереве выполнить финальный release checklist через `./scripts/build-all.sh`, зафиксировать version bump и release artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build interactive diagram workflow stabilization release`).
4. [DONE] Git Commit: `chore(release): build interactive diagram workflow stabilization release` (hash: `29cad20f`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать финальный session report и полный checklist ручной проверки: end-to-end flow `Description -> Virtual Simulation -> Diagram Modules -> Diagram Facades`, reopen/resume, autosave, conflict UX, repeated agent runs, gating/OUTDATED propagation и отсутствие regressions в release build (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record interactive diagram workflow stabilization release`).
6. [DONE] Git Commit: `docs(session): record interactive diagram workflow stabilization release` (hash: TBD)

---

## Notes
- Planning doc for this scope: `doc/SolidWorks-WorkFlow/Plans/DiagramSteps_InteractiveDSL_Architecture.md`
- Session reports to review before the first implementation stream: `doc/Sessions/Archive/Session078.md`, `doc/Sessions/Archive/Session079.md`, `doc/Sessions/Archive/Session080.md`, `doc/Sessions/Archive/Session081.md`, `doc/Sessions/Archive/Session082.md`
- Target verification principle for the whole scope: после каждой Phase должен существовать новый локальный релиз, в котором пользователь может проверить либо новый artifact/gating behavior, либо новый visual layer, либо новый semantic roundtrip, а не ждать финала всего scope

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Дополнительно перед стартом этого scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/Sessions/Archive/Session102.md`
- Для следующего diagram UI scope рабочей planning-basis остаётся `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
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
1. [BLOCKED] Синхронизировать workflow gating и PM start-service под `module-map.md` / `facade-map.md`, чтобы кнопки запуска шагов 3-4 снова создавали agent sessions по новому artifact contract (audit 2026-03-18: historical `DONE` disproved; fresh toolbar bootstrap был сломан уже как минимум в трёх местах — лишний `stage === completed` check в PM start-service, cold-start `workflow-state`, который не гидрировал уже существующие `virtual-simulation.md` / `module-map.md` из filesystem, и Core gating, который ошибочно превращал `invalid/outdated` upstream status в hard blocker вместо проверки только наличия предыдущего canonical artifact) (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `src/client/project-manager/services/workflow-step-start-service.ts`, `src/client/project-manager/services/workflow-step-start-service.gating.test.ts`; expected commit: `fix(workflow): align diagram stage gating with markdown dsl`).
2. [DONE] Git Commit: `fix(workflow): align diagram stage gating with markdown dsl` (hash: `d5836ee2`)
3. [DONE] Перевести artifact availability hooks и tree blocking copy с Mermaid filenames на canonical DSL filenames (scope: `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts`, `src/client/project-manager/components/layout/use-diagram-facades-artifact-availability.ts`, `src/client/project-manager/components/layout/workspace-tree-model.ts`; expected commit: `fix(ui): align diagram artifact availability with markdown dsl`).
4. [DONE] Git Commit: `fix(ui): align diagram artifact availability with markdown dsl` (hash: `59e9b91d`)
5. [DONE] Синхронизировать diagram panels/help/tree nodes с `module-map.md` / `facade-map.md`, чтобы пользователь видел корректные пути и labels до visual shell (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`; expected commit: `fix(ui): sync diagram panels with markdown dsl artifacts`).
6. [DONE] Git Commit: `fix(ui): sync diagram panels with markdown dsl artifacts` (hash: `f9bfe14e`)
7. [BLOCKED] Закрыть остаточные help-copy references на Mermaid contract и проверить запуск Diagram Modules/Facades вручную таргетными сборками PM/UI (audit 2026-03-18: help-copy cleanup may be valid, but the launch verification outcome was not truthful because fresh toolbar bootstrap remained broken) (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`, `doc/TODO/todo-plan.md`; expected commit: `docs(ui): remove mermaid references from diagram workflow help`).
8. [DONE] Git Commit: `docs(ui): remove mermaid references from diagram workflow help` (hash: `9a3d84b5`)
9. [DONE] Восстановить source-of-truth для diagram bootstrap: гидрировать `workflow-state` из canonical filesystem artifacts на cold start и развести validation status vs manual start gating, чтобы `Diagram Modules` / `Diagram Facades` разблокировались по наличию предыдущего canonical artifact даже после перезапуска Core/PM и при `invalid/outdated` upstream status (scope: `packages/core/src/remote-bridge/handlers/workflow-state-service.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-filesystem-hydration.ts`, `packages/core/src/remote-bridge/handlers/workflow-state-service.test.ts`; commit: `fix(workflow): restore diagram bootstrap gating source`).
10. [DONE] Git Commit: `fix(workflow): restore diagram bootstrap gating source` (hash: `e2d91aa5`)
11. [DONE] Выполнить release cycle для recovery audit fix (`build-all.sh` + `build-release.sh --use-current-version`) и собрать локальный VSIX `v1.1.739` (scope: release manifests, `package.json`, `package-lock.json`, `codeai-hub-1.1.739.vsix`; commit: `chore(release): build diagram bootstrap audit release`).
12. [DONE] Git Commit: `chore(release): build diagram bootstrap audit release` (hash: `57b34220`)
13. [DONE] Повторно проверить в живом PM на `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude` и `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4`, что toolbar click `Diagram Modules` теперь проходит дальше gating и действительно доходит до `session:create -> session:created -> session:binding` (manual verification 2026-03-18: `v1.1.740` подтвердил, что `Diagram Modules` и `Diagram Facades` теперь действительно стартуют из top toolbar и создают новые collector sessions).
14. [DONE] Ужесточить diagram contract delivery: встроить `module-map-field-reference.md` / `facade-map-field-reference.md` и `*-merge-rules.md` прямо в prompt для collector-сессий, чтобы агент не генерировал невалидные DSL enum values вроде `Kind: application` и свежий артефакт сразу рендерился в PM (scope: `packages/core/src/remote-bridge/handlers/idea-contract-service.ts`, `packages/core/src/remote-bridge/handlers/diagram-contract-prompt-assets.ts`, `packages/core/src/remote-bridge/handlers/idea-contract-service.diagram-stages.test.ts`; expected commit: `fix(workflow): embed strict diagram contract references`).
15. [DONE] Git Commit: `fix(workflow): embed strict diagram contract references` (hash: `52408187`)
16. [DONE] Выполнить release cycle для strict diagram contract fix (`build-all.sh` + `build-release.sh --use-current-version`) и собрать локальный VSIX `v1.1.740`, чтобы пользователь мог сразу перепроверить fresh `Diagram Modules` run на реальном PM после ужесточения prompt contract (scope: release manifests, `package.json`, `package-lock.json`, `codeai-hub-1.1.740.vsix`; commit: `chore(release): build strict diagram contract release`).
17. [DONE] Git Commit: `chore(release): build strict diagram contract release` (hash: `b7cc7420`)
18. [DONE] Перепроверить на живом PM в `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub claude`, что новый `Diagram Modules` запуск не только стартует, но и создаёт parseable `module-map.md` (manual verification 2026-03-18: `v1.1.740` подтвердил parseable `module-map.md` и рабочий переход дальше к `Diagram Facades`; текущий открытый дефект уже не в parseability, а в user-surface contract и читаемости диаграмм).

### Stream: Contract alignment test release
1. [DONE] Подготовить release-facing docs под PM/UI alignment для diagram workflow: запуск шагов 3-4, canonical `.md` artifacts в tree/panels/help, отсутствие активных Mermaid references в PM (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram contract alignment release`).
2. [DONE] Git Commit: `docs(release): prep diagram contract alignment release` (hash: `33b25bf8`)
3. [DONE] На чистом дереве выполнить release checklist для test release через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram contract alignment release`).
4. [DONE] Git Commit: `chore(release): build diagram contract alignment release` (hash: `881cd66f`)
5. [BLOCKED] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: toolbar start для `Diagram Modules`, toolbar start для `Diagram Facades`, открытие `module-map.md` / `facade-map.md` из tree, отсутствие `.mmd` labels в PM (audit 2026-03-18: toolbar-start verification was not truthfully closed and must be re-run after recovery) (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram contract alignment release`).
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

## Phase 6 — diagram user surface recovery (owner: Oleksandr, updated: 2026-03-18)

### Stream: Planning and audit rewrite
1. [DONE] Зафиксировать новый user-surface contract для `Diagram Modules` / `Diagram Facades`: `Artifacts = diagram`, `Source = raw markdown`, `Help = guidance`; при этом канонические `module-map.md` / `facade-map.md` остаются SSOT для runtime, но не default UI, а `*.flow.json` скрывается как internal sidecar (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope diagram user surface recovery`).
2. [DONE] Git Commit: `docs(plan): scope diagram user surface recovery` (hash: `5cc54c10`)
3. [DONE] Синхронизировать SSOT и release-facing docs под новый contract, в котором успешный diagram stage означает visual diagram как primary surface, `Source` как secondary debug view и ручную корректировку layout как допустимый path alongside auto-layout (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `README.md`, `CHANGELOG.md`; expected commit: `docs(workflow): define diagram user surface contract`).
4. [DONE] Git Commit: `docs(workflow): define diagram user surface contract` (hash: `562b3edf`)

### Stream: Artifacts / Source / Help contract in PM
1. [DONE] Расширить header-mode model для правой панели: для diagram stages добавить `Source`, удержать `Artifacts` дефолтным режимом при toolbar/tree reopen и перестать трактовать internal artifact selection как причину показывать raw `.md` вместо diagram surface (scope: `src/client/project-manager/components/layout/main-area.tsx`, `src/client/project-manager/components/layout/stage-artifact-header-toggle.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.ts`; expected commit: `feat(ui): add diagram source mode toggle`).
2. [DONE] Git Commit: `feat(ui): add diagram source mode toggle` (hash: `9ea0b6a3`)
3. [DONE] Перенаправить diagram-stage source rendering в отдельный secondary view: `Artifacts` должен всегда открывать visual panel для `Diagram Modules` / `Diagram Facades`, а `Source` должен показывать read-only canonical `.md` без раскрытия `*.flow.json` и без перехвата default reopen behavior (scope: `src/client/project-manager/components/layout/main-area-panel-content.tsx`, `src/client/project-manager/components/layout/workflow-artifact-viewer.tsx`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`; expected commit: `fix(ui): keep diagrams primary and source secondary`).
4. [DONE] Git Commit: `fix(ui): keep diagrams primary and source secondary` (hash: `10fe98a5`)

### Stream: Diagram-first stage panels and layout editing
1. [DONE] Переделать `Diagram Modules` panel в diagram-first surface: canvas сверху, internal path/sidecar chrome скрыт, semantic editing переведён во вторичные collapsible sections, а ручная корректировка node layout сохраняется как first-class user action (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-section.tsx`; expected commit: `feat(diagram-modules): prioritize visual surface`).
2. [DONE] Git Commit: `feat(diagram-modules): prioritize visual surface` (hash: `033bcd0c`)
3. [DONE] Переделать `Diagram Facades` panel и shared canvas chrome под тот же contract: diagram-first rendering, compact secondary editing groups, читаемый minimap/canvas chrome и persistence ручного layout после reopen/resume (scope: `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `feat(diagram-facades): prioritize visual surface`).
4. [DONE] Git Commit: `feat(diagram-facades): prioritize visual surface` (hash: `9b7db88c`)

### Stream: Phase 6 release build and verification
1. [DONE] Подготовить release-facing docs под diagram user surface recovery: новый `Artifacts / Source / Help` contract, diagram-first reopen behavior, скрытый `*.flow.json`, manual layout correction и обновлённый checklist ручной проверки (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram user surface recovery release`).
2. [DONE] Git Commit: `docs(release): prep diagram user surface recovery release` (hash: `583a7424`)
3. [DONE] На чистом дереве выполнить release checklist для Phase 6 через `./scripts/build-all.sh`, зафиксировать version bump и artifacts (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram user surface recovery release`).
4. [DONE] Git Commit: `chore(release): build diagram user surface recovery release` (hash: `e9ae8b3b`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем зафиксировать session report и checklist ручной проверки: `Artifacts` по умолчанию открывает diagram, `Source` показывает canonical `.md`, возврат на diagram stage не подменяет surface на raw markdown, ручной layout сохраняется после reopen/resume, `*.flow.json` нигде не показывается пользователю (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/SessionXXX.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram user surface recovery release`).
6. [DONE] Git Commit: `docs(session): record diagram user surface recovery release` (hash: `b06f6e8d`)

---

## Phase 7 — repository duplication debt reduction (owner: Oleksandr, updated: 2026-03-18)

### Stream: Planning and audit scoping
1. [DONE] Зафиксировать отдельный recovery scope для repository-wide duplication debt: описать mismatch между `check-architecture.sh` и `check:dup`, зафиксировать top clone clusters и утвердить structural reduction strategy вместо threshold/ignore обходов (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/RepositoryDuplicationDebt_Reduction_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope duplication debt reduction`).
2. [DONE] Git Commit: `docs(plan): scope duplication debt reduction` (hash: `322f65b6`)

### Stream: High-value structural clone extraction
1. [DONE] Вынести shared provider option dialog shell для Codex/Gemini reasoning-thinking модалок, сохранив текущее поведение и сократив самый крупный settings clone cluster (scope: `src/client/ui/src/components/settings/shared/provider-option-dialog.tsx`, `src/client/ui/src/components/settings/codex-default-model/codex-reasoning-dialog.tsx`, `src/client/ui/src/components/settings/gemini-default-model/gemini-thinking-dialog.tsx`; expected commit: `refactor(settings): share provider option dialog shell`).
2. [DONE] Git Commit: `refactor(settings): share provider option dialog shell` (hash: `6299ad48`)
3. [DONE] Вынести общий scaffold для `Diagram Modules` / `Diagram Facades`, чтобы loading/error/pending/visual-surface shell и conflict chrome не дублировались в двух stage panels (scope: `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`; expected commit: `refactor(diagrams): share stage panel scaffold`).
4. [DONE] Git Commit: `refactor(diagrams): share stage panel scaffold` (hash: `eb8181c5`)
5. [DONE] Вынести общий relation editor scaffold для module/facade relation editing, сохранив stage-specific поля поверх shared add-update-delete flow (scope: `src/client/project-manager/components/diagram-editor/relation-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/module-relation-editor.tsx`, `src/client/project-manager/components/diagram-editor/facade-relation-editor.tsx`; expected commit: `refactor(diagrams): share relation editor scaffold`).
6. [DONE] Git Commit: `refactor(diagrams): share relation editor scaffold` (hash: `fa0ae1f0`)
7. [DONE] Если repository-wide duplication всё ещё выше `3%`, схлопнуть следующий крупный cross-surface helper cluster без изменения product contract, начиная с `dialog-segment-meta` shared extraction (scope: `src/client/shared/dialog-segment-meta.ts`, `src/client/project-manager/components/sessions/dialog-segment-meta.ts`, `src/client/ui/src/session/dialog-segment-meta.ts`; expected commit: `refactor(session): share dialog segment meta helpers`).
8. [DONE] Git Commit: `refactor(session): share dialog segment meta helpers` (hash: `eaf4ab8c`)

### Stream: Duplication gate alignment and release
1. [DONE] После фактического снижения repository-wide `jscpd` ниже `3%` выровнять duplication gate между `check-architecture.sh` и `check:dup`, чтобы pre-commit и release проверяли одну и ту же source surface (scope: `scripts/check-architecture.sh`, `package.json`, `doc/TODO/todo-plan.md`; expected commit: `chore(quality): align duplication gates`).
2. [DONE] Git Commit: `chore(quality): align duplication gates` (hash: `e67413de`)
3. [DONE] Подготовить release-facing docs под debt-reduction phase: зафиксировать, что duplication advisory снят, какие shared scaffolds появились и что release pipeline снова чист по repository-wide `jscpd` (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep duplication debt reduction release`).
4. [DONE] Git Commit: `docs(release): prep duplication debt reduction release` (hash: `724dfcd6`)
5. [DONE] На чистом дереве выполнить `./scripts/build-all.sh`, зафиксировать version bump до `1.1.742` и release artifacts для provider/core/ui/launcher перед финальной VSIX упаковкой (scope: release manifests, `package.json`, `package-lock.json`, `assets/**/manifest.json`, `media/react-chat.js`; expected commit: `chore(release): build duplication debt reduction release`).
6. [DONE] Git Commit: `chore(release): build duplication debt reduction release` (hash: `5881cc02`)
7. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, убедиться что repository-wide duplication больше не выдаёт advisory, затем оформить session report с точным `jscpd` result и checklist ручной проверки локального VSIX (scope: `codeai-hub-1.1.742.vsix`, `doc/Sessions/Archive/Session095.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record duplication debt reduction release`).
8. [DONE] Git Commit: `docs(session): record duplication debt reduction release` (hash: `7765f7ed`)

---

## Phase 8 — diagram auto-layout realtime refresh (owner: Oleksandr, updated: 2026-03-18)

### Stream: Live viewport refit after auto-layout
1. [DONE] Зафиксировать corrective scope для auto-layout visibility bug: подтвердить, что shared diagram shell сохраняет новый layout в `*.flow.json`, но не обновляет live React Flow viewport, из-за чего пользователь видит результат только после reopen/remount stage (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope diagram auto-layout realtime refresh`).
2. [DONE] Git Commit: `docs(plan): scope diagram auto-layout realtime refresh` (hash: `e09630a2`)
3. [DONE] Исправить shared auto-layout feedback loop: после первичной авто-раскладки и после явного клика `Auto-layout` canvas должен сразу перестраиваться в текущем экране через live viewport refit, без ухода на другой шаг и без remount diagram stage (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `fix(ui): refresh diagram viewport after auto-layout`).
4. [DONE] Git Commit: `fix(ui): refresh diagram viewport after auto-layout` (hash: `2811a78b`)
5. [DONE] Прогнать таргетную verification цепочку для shared diagram editor: `diagram-editor-facade.test.tsx`, `typecheck:webview`, `build:webview`, затем подготовить manual checklist для повторной проверки `Diagram Modules` / `Diagram Facades` в локальном релизе (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `README.md`, `CHANGELOG.md`; expected commit: `docs(release): prep diagram auto-layout refresh verification`).
6. [DONE] Git Commit: `docs(release): prep diagram auto-layout refresh verification` (hash: `f234ffc8`)
7. [DONE] Выполнить release checklist для этого corrective stream: `./scripts/build-all.sh`, `./scripts/build-release.sh --use-current-version`, затем оформить новый session report с checklist ручной проверки realtime `Auto-layout` в `Diagram Modules` / `Diagram Facades` (scope: `codeai-hub-1.1.743.vsix`, `doc/Sessions/Archive/Session096.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram auto-layout refresh release`).
8. [DONE] Git Commit: `docs(session): record diagram auto-layout refresh release` (hash: `8dc94043`)

---

## Phase 9 — diagram modules layout profiles and full-height surface (owner: Oleksandr, updated: 2026-03-18)

### Stream: Planning and modules-first corrective scope
1. [DONE] Зафиксировать modules-first corrective scope: текущий `Auto-layout` уже обновляет canvas в реальном времени, но всё ещё держится на одном hard-coded ELK mode, который может схлопывать `Diagram Modules` в одну горизонтальную линию; одновременно stage-panel должен занять всю вертикальную площадь artifact column до нижней границы Project Manager (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope diagram modules layout profiles`).
2. [DONE] Git Commit: `docs(plan): scope diagram modules layout profiles` (hash: `b7c43537`)
3. [DONE] Добавить несколько concrete ELK profiles для `Diagram Modules` рядом с `Auto-layout`: как минимум `Vertical`, `Horizontal`, `Compact`, `Fill space`, где `Fill space` пытается использовать всю доступную площадь canvas вместо одной компактной полосы (scope: `src/client/project-manager/components/diagram-editor/diagram-layout-facade.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`; expected commit: `feat(diagram-modules): add layout profiles`).
4. [DONE] Git Commit: `feat(diagram-modules): add layout profiles` (hash: `ced1a8b0`)
5. [DONE] Растянуть modules diagram stage на всю высоту artifact panel: canvas должен забирать свободную вертикаль, а collapsed `Edit modules` / `Edit relations` оставаться прижатыми к нижней части общей stage surface без мёртвого пустого поля снизу (scope: `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`; expected commit: `fix(diagram-modules): stretch stage surface vertically`).
6. [DONE] Git Commit: `fix(diagram-modules): stretch stage surface vertically` (hash: `c281dbc7`)
7. [DONE] Прогнать таргетную verification цепочку для modules layout stream: обновить targeted coverage при необходимости, затем выполнить `typecheck:webview` и `build:webview`, после чего подготовить новый release checklist только для `Diagram Modules` layout profiles/full-height surface (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`, `README.md`, `CHANGELOG.md`; expected commit: `docs(release): prep diagram modules layout profiles verification`).
8. [DONE] Git Commit: `docs(release): prep diagram modules layout profiles verification` (hash: `1f6ab6f3`)

### Stream: Phase 9 release build and verification
1. [DONE] На чистом дереве выполнить release checklist для `Diagram Modules` layout profiles/full-height surface через `./scripts/build-all.sh`, зафиксировать version bump и release artifacts для `v1.1.744` (scope: release manifests + `doc/tmp/releases/`; expected commit: `chore(release): build diagram modules layout profiles release`).
2. [DONE] Git Commit: `chore(release): build diagram modules layout profiles release` (hash: `f1dea5e2`)
3. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем оформить session report с manual checklist: выбор `Vertical/Horizontal/Compact/Fill space`, realtime перестроение после `Auto-layout`, сохранение layout после reopen и full-height behavior artifact panel без нижней пустой зоны (scope: `codeai-hub-1.1.744.vsix`, `doc/Sessions/Archive/Session097.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram modules layout profiles release`).
4. [TODO] Git Commit: `docs(session): record diagram modules layout profiles release` (hash: TBD)

---

## Phase 10 — launcher-safe diagram layout profile control (owner: Oleksandr, updated: 2026-03-19)

### Stream: Crash audit and control replacement
1. [DONE] Зафиксировать corrective scope после manual verification `v1.1.744`: падение launcher происходит не в ELK, а в native HTML `<select>` popup path внутри macOS CEF/AppKit, поэтому профильный selector для `Diagram Modules` нужно заменить на launcher-safe custom control без native dropdown (scope: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope launcher-safe layout profile control`).
2. [DONE] Git Commit: `docs(plan): scope launcher-safe layout profile control` (hash: `ba94fabe`)
3. [DONE] Заменить toolbar `<select>` для layout profiles на launcher-safe button group / segmented control, сохранив выбор `Vertical`, `Horizontal`, `Compact`, `Fill space` рядом с `Auto-layout`, и добавить regression coverage на отсутствие native select path (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `fix(diagram-modules): replace layout profile select`).
4. [DONE] Git Commit: `fix(diagram-modules): replace layout profile select` (hash: `a062884b`)
5. [DONE] Расширить `module-map.flow.json` sidecar так, чтобы выбранный layout profile сохранялся и восстанавливался вместе с node positions; добавить targeted coverage на parse/serialize этого поля (scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/use-diagram-persistence.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`; expected commit: `feat(diagram-modules): persist layout profile in sidecar`).
6. [DONE] Git Commit: `feat(diagram-modules): persist layout profile in sidecar` (hash: `1c7c28c5`)
7. [DONE] Заставить `Diagram Modules` немедленно применять выбранный profile к текущему graph и писать его в sidecar, чтобы reopen/restart восстанавливал не только позиции, но и активный режим layout (scope: `src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`; expected commit: `fix(diagram-modules): apply selected layout profile immediately`).
8. [DONE] Git Commit: `fix(diagram-modules): apply selected layout profile immediately` (hash: `3d0dc3a4`)
9. [DONE] Обновить targeted source-level coverage для `Diagram Modules`: shell должен auto-apply выбранный profile, modules panel должна восстанавливать его из sidecar, а launcher-safe toolbar contract должен оставаться без native `<select>` (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.test.tsx`; expected commit: `test(diagram-modules): cover layout profile restore flow`).
10. [DONE] Git Commit: `test(diagram-modules): cover layout profile restore flow` (hash: `61df7eef`)

### Stream: Phase 10 release build and verification
1. [DONE] Синхронизировать release-facing docs под launcher-safe profile control, immediate layout apply и persistence в `module-map.flow.json`, плюс manual verification без native dropdown crash path и без silent revert к vertical after reopen/restart (scope: `README.md`, `CHANGELOG.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep layout profile persistence release`).
2. [DONE] Git Commit: `docs(release): prep layout profile persistence release` (hash: `4a7817b2`)
3. [DONE] На чистом дереве выполнить release checklist для immediate layout apply и persistence profile через `./scripts/build-all.sh`, зафиксировать version bump до `1.1.746` и release manifests (scope: release manifests + versioned package descriptors; expected commit: `chore(release): build layout profile persistence release`).
4. [DONE] Git Commit: `chore(release): build layout profile persistence release` (hash: `5fc65c2d`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем оформить session report с manual checklist: profile buttons не падают, переключение `Vertical/Horizontal/Compact/Fill space` немедленно перестраивает текущий graph и выбранный режим восстанавливается после reopen/restart `Diagram Modules` (scope: `codeai-hub-1.1.746.vsix`, `doc/Sessions/Archive/Session099.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record layout profile persistence release`).
6. [DONE] Git Commit: `docs(session): record layout profile persistence release` (hash: `c1ca457f`)

---

## Phase 11 — diagram modules visible layout effect recovery (owner: Oleksandr, updated: 2026-03-19)

### Stream: Runtime projection and renderer correction
1. [DONE] Убрать ложную parent/child семантику cluster->module для `Diagram Modules`, которая мешала React Flow корректно применять новые ELK coordinates, и вернуть явный visual renderer contract через `nodeTypes`, чтобы переключение `Vertical` / `Horizontal` / `Compact` / `Fill space` меняло именно текущий canvas, а не только sidecar state (scope: `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.ts`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.test.ts`; expected commit: `fix(diagram-modules): restore visible layout profile effect`).
2. [DONE] Git Commit: `fix(diagram-modules): restore visible layout profile effect` (hash: `bdbc516d`)

### Stream: Phase 11 release build and verification
1. [DONE] Синхронизировать release-facing docs под реальную причину `v1.1.746`: ELK profiles уже считались, но visual shell `Diagram Modules` рендерил сломанный cluster/module projection, поэтому новый релиз `v1.1.747` должен явно описывать восстановленный renderer contract и видимый effect на canvas (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep visible layout profile effect release`).
2. [DONE] Git Commit: `docs(release): prep visible layout profile effect release` (hash: `9cffa2c4`)
3. [DONE] На чистом дереве выполнить release checklist для renderer-corrected `Diagram Modules`, зафиксировать version bump до `1.1.747` и release manifests (scope: release manifests + versioned package descriptors; expected commit: `chore(release): build visible layout profile effect release`).
4. [DONE] Git Commit: `chore(release): build visible layout profile effect release` (hash: `80f64f4e`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем оформить session report с manual checklist: profile switch реально меняет diagram canvas без reopen, выбранный режим переживает reopen/restart, и launcher-safe toolbar остаётся стабильным (scope: `codeai-hub-1.1.747.vsix`, `doc/Sessions/Archive/Session100.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record visible layout profile effect release`).
6. [TODO] Git Commit: `docs(session): record visible layout profile effect release` (hash: TBD)

---

## Phase 12 — diagram manual-layout first cleanup (owner: Oleksandr, updated: 2026-03-19)

### Stream: Product contract rewrite and ELK removal
1. [DONE] Зафиксировать новый product contract для diagram steps: `module-map.md` / `facade-map.md` определяют semantic structure, а `*.flow.json` хранит только пользовательскую геометрию; `Auto-layout` и profile chooser больше не считаются частью основного UX (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope manual-layout first diagrams`).
2. [DONE] Git Commit: `docs(plan): scope manual-layout first diagrams` (hash: `dce318fc`)
3. [DONE] Удалить ELK-driven product UX и runtime pipeline: убрать `Auto-layout`, layout profiles, `Layout saved` chip, удалить `diagram-layout-facade`/`auto-layout-button`/`save-status-indicator`, вычистить sidecar profile contract и снять зависимость `elkjs`, сохранив только manual drag positions в `*.flow.json`; подтвердить поведение таргетными проверками `flow-sidecar-types.test.ts`, `diagram-editor-facade.test.tsx`, `typecheck:webview`, `build:webview`, `build:project-manager` (scope: `src/client/project-manager/components/diagram-editor/**`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `package.json`, `package-lock.json`; expected commit: `refactor(diagrams): remove elk auto-layout pipeline`).
4. [DONE] Git Commit: `refactor(diagrams): remove elk auto-layout pipeline` (hash: `fdeb958e`)

### Stream: Phase 12 release build and verification
1. [DONE] Синхронизировать release-facing docs под manual-layout-first contract: диаграммы больше не зависят от ELK, `*.flow.json` хранит только пользовательские позиции, а `Edit Modules` / `Edit Relations` остаются вторичными inline editors beneath the visual canvas (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep manual-layout first release`).
2. [DONE] Git Commit: `docs(release): prep manual-layout first release` (hash: `9e38fc01`)
3. [DONE] На чистом дереве выполнить release checklist для manual-layout cleanup через `./scripts/build-all.sh`, зафиксировать version bump до `1.1.748` и release manifests (scope: release manifests + versioned package descriptors; expected commit: `chore(release): build manual-layout first release`).
4. [DONE] Git Commit: `chore(release): build manual-layout first release` (hash: `e9388a42`)
5. [DONE] Выполнить `./scripts/build-release.sh --use-current-version`, затем оформить session report с manual checklist: diagram toolbar без `Auto-layout`/profiles, ручной drag по-прежнему сохраняется в `*.flow.json`, `Source` остаётся вторичным raw Markdown view, а inline секции `Edit Modules` / `Edit Relations` продолжают редактировать canonical DSL без ELK fallback path (scope: `codeai-hub-1.1.748.vsix`, `doc/Sessions/Archive/Session101.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record manual-layout first release`).
6. [DONE] Git Commit: `docs(session): record manual-layout first release` (hash: `53df00e2`)

---

## Phase 13 — diagram surface simplification (owner: Oleksandr, updated: 2026-03-19)

### Stream: Remove inline semantic editors and minimap
1. [DONE] Update diagram workflow planning docs and SSOT to remove visible semantic editors from `Diagram Modules` / `Diagram Facades` and drop the bottom-right minimap while preserving agent-driven semantic updates and manual layout controls (scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(plan): scope diagram surface simplification`).
2. [DONE] Git Commit: `docs(plan): scope diagram surface simplification` (hash: `bad254d8`)
3. [DONE] Remove `Edit Modules` / `Edit Relations` and facade editing sections from the diagram panels, and remove the `MiniMap` from the shared React Flow shell while keeping `Controls` and manual drag persistence (scope: `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`, `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`; expected commit: `refactor(diagrams): remove semantic editors and minimap`).
4. [DONE] Git Commit: `refactor(diagrams): remove semantic editors and minimap` (hash: `7bb7a330`)

### Stream: Phase 13 release build and verification
1. [DONE] Sync release-facing docs and version notes for the diagram surface simplification, now that visible inline semantic editors are gone and the canvas is manual-layout-only (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): prep diagram surface simplification release`).
2. [DONE] Git Commit: `docs(release): prep diagram surface simplification release` (hash: `15e32479`)
3. [DONE] On a clean tree run `./scripts/build-all.sh` and record the new version bump + release manifests for the simplified diagram surface (scope: release manifests + versioned package descriptors; expected commit: `chore(release): build diagram surface simplification release`).
4. [DONE] Git Commit: `chore(release): build diagram surface simplification release` (hash: `028f1686`)
5. [DONE] Run `./scripts/build-release.sh --use-current-version` and capture the session report with manual checklist: diagram toolbar has no `Auto-layout`/profile chrome, no visible semantic editors under the diagram, and the bottom-right minimap is gone while the left-bottom zoom controls remain (scope: `codeai-hub-<version>.vsix`, `doc/Sessions/Archive/Session102.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record diagram surface simplification release`).
6. [DONE] Git Commit: `docs(session): record diagram surface simplification release` (hash: `9d7f852d`)

## Notes
- Planning doc for the next follow-up scope: `doc/SolidWorks-WorkFlow/Plans/DiagramWorkflow_UserSurface_Architecture.md`
- Historical archived planning docs for the completed diagram rollout: `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramSteps_InteractiveDSL_Architecture.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/DiagramWorkflow_Audit_TODO_Plan.md`, `doc/SolidWorks-WorkFlow/Plans/Archive/RepositoryDuplicationDebt_Reduction_Architecture.md`
- Session reports to review before the first implementation stream: `doc/Sessions/Archive/Session078.md`, `doc/Sessions/Archive/Session079.md`, `doc/Sessions/Archive/Session080.md`, `doc/Sessions/Archive/Session081.md`, `doc/Sessions/Archive/Session082.md`
- Target verification principle for the whole scope: после каждой Phase должен существовать новый локальный релиз, в котором пользователь может проверить либо новый artifact/gating behavior, либо новый visual layer, либо новый semantic roundtrip, а не ждать финала всего scope

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- Перед работой по этому scope открыть: `AGENTS.md`, `doc/SolidWorks-WorkFlow/README.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`, `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/SolidWorks-WorkFlow/Plans/Diagram_Modules_StepByStep_Workflow_And_UX_Refactor.md`, `doc/Sessions/Session149.md`
- Каждая микро-задача оформляется парой пунктов: (1) реализация/изменения, (2) отдельный пункт `Git Commit: ...`
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`
- Каждая микро-задача должна затрагивать не более 3 файлов; если scope разрастается, stream нужно дробить заново
- Husky gates не обходить (`--no-verify` запрещен)
- Любые изменения логики/архитектуры синхронно отражать в документации `doc/` до коммита
- Перед закрытием stream выполнять таргетные проверки затронутых пакетов/клиентов
- После закрытия release stream: выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, записать результаты в `doc/Sessions/`

---

## Phase 54 — Diagram Modules Step-by-Step Workflow & UX Refactor (owner: Oleksandr, updated: 2026-03-24)

### Stream 1: Remove hidden auto-continuation
1. [DONE] Убрать hidden auto-continuation из `use-diagram-modules-orchestration.ts`: удалить `buildDiagramModulesContinuationPrompt`, удалить `cachedPartTemplateRef`, убрать вызов `api.sendSessionMessage` с `visibility: "hidden"` для part turns. Оставить aggregate compose logic и sequence lock для финализации. Обновить тесты в `use-diagram-modules-orchestration.test.ts` (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(diagram-workflow): remove hidden auto-continuation for part turns`)
2. [DONE] Git Commit: `refactor(diagram-workflow): remove hidden auto-continuation for part turns` (hash: 92a429ba)

### Stream 2: Rewrite agent prompt for step-by-step workflow
1. [DONE] Переписать `module-inventory-prompt.md` — новая step-by-step schema: (1) первый turn — только index (список product parts без спецификации), задать вопросы по составу, ждать ответа; (2) каждый следующий turn — по одному product part после подтверждения пользователя; (3) убрать инструкции про hidden continuation. Обновить bundled-templates.ts (scope: `packages/agents/diagram-modules-agent/assets/module-inventory-prompt.md`, `packages/core/src/templates/bundled-templates.ts`, `doc/TODO/todo-plan.md`; expected commit: `feat(diagram-workflow): rewrite prompt for step-by-step user-driven workflow`)
2. [DONE] Git Commit: `feat(diagram-workflow): rewrite prompt for step-by-step user-driven workflow` (hash: 98785429)

### Stream 3: Graph refresh on new artifact
1. [DONE] При artifact persist или turn_completed для diagram_modules — диспатчить custom event `pm:diagram:refresh` из orchestration. В `DiagramModulesPanel` слушать этот event и инкрементировать refreshKey (scope: `src/client/project-manager/components/sessions/use-diagram-modules-orchestration.ts`, `src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-modules): refresh graph on new product part artifact`)
2. [DONE] Git Commit: `fix(diagram-modules): refresh graph on new product part artifact` (hash: d5b4c22f)

### Stream 4: Fix auto-layout — sidecar fallback
1. [DONE] В `applyFlowSidecarPositions` (`flow-sidecar-types.ts`) — если sidecar не содержит ВСЕХ нодов текущей проекции, не применять его (fallback на computed layout). Обновить тесты (scope: `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`, `src/client/project-manager/components/diagram-editor/flow-sidecar-types.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-modules): fallback to computed layout when sidecar is incomplete`)
2. [DONE] Git Commit: `fix(diagram-modules): fallback to computed layout when sidecar is incomplete` (hash: TBD)

### Stream 4b: Fix auto-layout — Purpose panel width
1. [TODO] В `diagram-editor-facade.tsx` — убрать `minmax(240px, 320px)` для Purpose panel, заменить на `minmax(240px, 1fr)` чтобы Purpose растягивалась по ширине Product Part вместо фиксированных 320px. В `module-stage-react-flow.ts` — пересчитать `PRODUCT_PART_PURPOSE_CHARS_PER_LINE` под реальную ширину Purpose panel (зависит от productPartWidth). Обновить `getProductPartHeaderHeight` для динамического расчёта (scope: `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`, `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-modules): make Purpose panel width dynamic and align layout calculations`)
2. [TODO] Git Commit: `fix(diagram-modules): make Purpose panel width dynamic and align layout calculations` (hash: TBD)

### Stream 4c: Fix auto-layout — height underestimation
1. [TODO] Audit и fix расчёта высот в `module-stage-react-flow.ts`: (a) пересчитать `chars-per-line` констант (24/32/42) под реальные CSS widths при font-size 11-14px; (b) увеличить `MODULE_CARD_MIN_HEIGHT` если 132px недостаточно; (c) пересчитать `getClusterHeaderHeight` и `getModuleCardHeight` чтобы совпадали с реальным CSS рендером; (d) добавить safety buffer к container heights чтобы дети не вылезали. Верифицировать на реальных данных (scope: `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`, `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `fix(diagram-modules): fix height calculation to prevent node overlap in auto-layout`)
2. [TODO] Git Commit: `fix(diagram-modules): fix height calculation to prevent node overlap in auto-layout` (hash: TBD)

### Stream 5: Sidebar — rename artifact + remove Source
1. [TODO] Переименовать артефакт в sidebar: label `"module-inventory.md"` → `"Module Graph"` в `workspace-tree-diagram-branch-nodes.ts`. Переключить artifact availability check с existence of `module-inventory.md` на existence of `product-parts.index.md`. Обновить тесты (scope: `src/client/project-manager/components/layout/workspace-tree-diagram-branch-nodes.ts`, `src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(sidebar): rename diagram modules artifact to Module Graph`)
2. [TODO] Git Commit: `refactor(sidebar): rename diagram modules artifact to Module Graph` (hash: TBD)
3. [TODO] Убрать Source mode для Diagram Modules: в `stage-artifact-mode.ts` — modes `["artifacts", "help"]` вместо `["artifacts", "source", "help"]`. Убрать Source pending message для Diagram Modules. Обновить тесты (scope: `src/client/project-manager/components/layout/stage-artifact-mode.ts`, `src/client/project-manager/components/layout/stage-artifact-mode.test.ts`, `doc/TODO/todo-plan.md`; expected commit: `refactor(sidebar): remove Source mode for Diagram Modules`)
4. [TODO] Git Commit: `refactor(sidebar): remove Source mode for Diagram Modules` (hash: TBD)

### Stream 6: Documentation sync
1. [TODO] Обновить `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — отразить step-by-step workflow, убрать упоминания auto-continuation для diagram modules, зафиксировать Module Graph naming (scope: `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(architecture): reflect step-by-step diagram modules workflow`)
2. [TODO] Git Commit: `docs(architecture): reflect step-by-step diagram modules workflow` (hash: TBD)

### Stream 7: Release notes + build
1. [TODO] Обновить `README.md` и `CHANGELOG.md` с описанием step-by-step workflow, graph refresh, auto-layout fix, Module Graph naming (scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(release): sync step-by-step diagram modules workflow notes`)
2. [TODO] Git Commit: `docs(release): sync step-by-step diagram modules workflow notes` (hash: TBD)
3. [TODO] Выполнить `./scripts/build-all.sh`, затем `./scripts/build-release.sh --use-current-version`, проверить VSIX, скопировать tarballs (scope: release manifests, `doc/TODO/todo-plan.md`; expected commit: `chore(release): prepare step-by-step diagram modules workflow release`)
4. [TODO] Git Commit: `chore(release): prepare step-by-step diagram modules workflow release` (hash: TBD)

### Stream 8: Session handoff
1. [TODO] Создать session report, записать все hashes (scope: `doc/Sessions/Session150.md`, `doc/TODO/todo-plan.md`; expected commit: `docs(session): record step-by-step diagram modules workflow release`)
2. [TODO] Git Commit: `docs(session): record step-by-step diagram modules workflow release` (hash: TBD)

# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **Required reading (прочитать перед каждым фиксом):**
  - `doc/SolidWorks-WorkFlow/README.md`
  - `doc/SolidWorks-WorkFlow/Docs_Index.md`
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
  - `doc/SolidWorks-WorkFlow/Contracts/Workflow_CLI.md`
  - `doc/SolidWorks-WorkFlow/Contracts/VirtualSimulation_Step.md`
  - `doc/BugRegistry.md`
- **Ограничение:** каждая подзадача должна затрагивать **≤ 3 файлов**.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Статусы: `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`.
- **Gates (автоматически через Husky hooks):**
  - `git commit` → `.husky/pre-commit`: `npm test`, `./scripts/check-architecture.sh`, `npm run lint`, `npm run check:tsprune`, `npx ultracite fix`
  - `git push` → `.husky/pre-push`: `npm run check:dup`, `npm run check:links`
- **НИКОГДА** не обходить гейты (`--no-verify`).

---

## Phase 259 — Diagram Modules & Diagram Facades workflow steps (owner: Oleksandr, updated: 2026-02-26)

**Проблема:** Кнопки Diagram Modules и Diagram Facades в тулбаре Project Manager не работают — нет UI-панелей, нет запуска сессий, нет отображения артефактов в дереве.

**Решение:** Реализовать client-side активацию по образу и подобию Virtual Simulation. Core-side полностью готов (типы, гейтинг, шаблоны, контракты, HTTP-роуты, watcher, continuity).

**Ключевые контракты (Core — уже реализовано, НЕ трогаем):**
- Artifact: `.codeai-hub/{slug}/diagram_modules/modules-diagram.mmd`
- Artifact: `.codeai-hub/{slug}/diagram_facades/facades-graph.mmd`
- Gating: diagram_modules blocked пока нет `virtual-simulation.md` (DONE); diagram_facades blocked пока нет `modules-diagram.mmd` (DONE)
- Контракты: `buildDiagramModulesContract()`, `buildDiagramFacadesContract()` в `idea-contract-service.ts`
- HTTP: `GET /api/v1/orchestrator/diagram-modules-contract`, `GET /api/v1/orchestrator/diagram-facades-contract`

---

### Stream 0: WorkflowStepStartService — methods for diagram steps
1. [DONE] Добавить `startDiagramModules()` и `startDiagramFacades()` в `WorkflowStepStartService`. Расширен `resolveMostRecentContinuitySessionId` — union `ContinuityStageId`. Тип параметров обобщён в `StartWorkflowStepParams`. (scope: `workflow-step-start-service.ts`, 120 строк)
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 1: Toolbar handler — handle Diagram tool clicks
1. [DONE] В `use-workflow-tool-select.ts`: добавлены `DIAGRAM_MODULES_TOOL_LABEL`, `DIAGRAM_FACADES_TOOL_LABEL`, `DIAGRAM_STAGE_MAP`, `diagramStartInFlightRef`. Общая логика через table-driven `DIAGRAM_STAGE_MAP` вместо дублирования. (scope: `use-workflow-tool-select.ts`, 206 строк)
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 2: Artifact availability hooks
1. [DONE] Созданы `use-diagram-modules-artifact-availability.ts` (68 строк) и `use-diagram-facades-artifact-availability.ts` (68 строк). Паттерн идентичен VS hook.
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 3: DiagramModulesPanel component
1. [DONE] Создан `diagram-modules/diagram-modules-panel.tsx` (227 строк). Validation: `%% Modules Diagram` title + ≥1 subgraph. Кнопка "Fix with agent" вызывает `startDiagramModules()`.
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 4: DiagramFacadesPanel component
1. [DONE] Создан `diagram-facades/diagram-facades-panel.tsx` (227 строк). Validation: `%% Facades Graph` title + ≥1 edge. Кнопка "Fix with agent" вызывает `startDiagramFacades()`.
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 5: main-area.tsx — route to diagram panels
1. [DONE] Импортированы `DiagramModulesPanel` и `DiagramFacadesPanel`. Placeholder'ы заменены на `renderStagePanel()` helper. (scope: `main-area.tsx`, 294 строки)
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 6: Workspace tree — availability hooks + branch nodes
1. [DONE] В `workspace-tree.tsx`: подключены оба availability hooks, stage→builder маппинг вынесен в `resolveStageChildren()` (новый файл `workspace-tree-stage-children.ts`). `resolveTreeStatus` перенесён в `workspace-tree-model.ts`. (scope: `workspace-tree.tsx` 289 строк, `workspace-tree-stage-children.ts` 70 строк, `workspace-tree-model.ts` 42 строки)
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 7: Workspace tree branch nodes — builders + sync payload
1. [DONE] Diagram builders вынесены в отдельный модуль `workspace-tree-diagram-branch-nodes.ts` (252 строки) для соблюдения лимита ≤300 строк. Фасад `workspace-tree-branch-nodes.ts` (285 строк) ре-экспортирует builders и делегирует diagram sync payload. `resolveStageSyncPayload()` расширен: `diagramModulesArtifactAvailable`, `diagramFacadesArtifactAvailable`. `use-stage-panel-sync.ts` расширен аналогично.
2. [DONE] Git Commit: TBD (входит в общий коммит Phase 259)

### Stream 8: Build & verify
1. [DONE] `npm run typecheck:webview` — passed. `npm run build:webview` — passed. `npx ultracite check` — 0 issues.
2. [TODO] Обновить документацию: `README.md`, `CHANGELOG.md` (scope: `README.md`, `CHANGELOG.md`; expected commit: `docs: update README and CHANGELOG for diagram steps`).
3. [TODO] Git Commit: `docs: update README and CHANGELOG for diagram steps` (hash: TBD)

### Stream 9: Release build
1. [TODO] `./scripts/build-all.sh` на чистом дереве (scope: scripts (run); expected commit: `chore(release): build-all`).
2. [TODO] Git Commit: `chore(release): build-all` (hash: TBD)
3. [TODO] `./scripts/build-release.sh --use-current-version`; VSIX в `doc/tmp/releases/` (scope: scripts (run); expected commit: none).

---

**Архитектурные решения (отклонения от исходного плана):**
- `workspace-tree-branch-nodes.ts` разбит на 2 файла (фасад + `workspace-tree-diagram-branch-nodes.ts`) — иначе 485 строк (лимит ≤300).
- `workspace-tree.tsx` рефакторинг: `resolveStageChildren()` вынесен в `workspace-tree-stage-children.ts`, `resolveTreeStatus()` перенесён в `workspace-tree-model.ts` — иначе 330 строк (лимит ≤300).
- `main-area.tsx` рефакторинг: введён `renderStagePanel()` helper для устранения дублирования 3× workspace-check pattern — 294 строки.
- `use-stage-panel-sync.ts` модифицирован (добавлены `diagramModulesArtifactAvailable`, `diagramFacadesArtifactAvailable`) — необходимое следствие расширения `resolveStageSyncPayload`.

**Итого новых файлов:** 7 (4 по плану + 3 из-за рефакторинга ≤300)
**Итого модифицированных файлов:** 7 (5 по плану + 2 из-за рефакторинга)
**Все файлы ≤300 строк:** подтверждено.

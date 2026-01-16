# План разработки (Development TODO Plan)

## Правила выполнения (Execution Rules):
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое колличество - Stream (стрим), в каждом Стриме - некоторое кол-во подзадач.
- Каждая подзадача должна затрагивать не более 3 файлов.
- Каждая подзадача оформляется парой пунктов: (1) реализация/изменения, (2) `Git Commit: ...` (отдельной строкой).
- Если по факту разработки оказывается, что конкретная подзазача Stream затрагивает больше 3 файлов - такая задача должна быть разбита на более мелкие и список задач в Стриме переписывается.
- **Gates**: после выполнения каждой подзадачи прогоняется Гейт Качества -
`scripts/check-architecture.sh`, `npx ultracite check`, `npx ts-prune`, `npx jscpd --threshold 3 --silent --reporters console src --ignore "**/node_modules/**"`, `npm run check:links`, затем выполняем таргетную сборку (`npm run build --workspace <package>`, `npm run build:webview`, `npm run typecheck:webview`).
- **Commit**: После зеленых гейтов — Git Commit с максимально релевантным описанием (код + доки) и апдейт `todo-plan.md` (дата, статус, хеш).
- **Real-time Документация**: любое изменение протоколов/архитектуры требует синхронного обновления документов из `doc/` **до** коммита.

## Required documents to review before work
1. `doc/Architecture/Architecture.md`
2. `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`
3. `doc/TODO/todo-plan.md`

## Phase 29 — Artifact Upsert Protocol (Variant B) (owner: Oleksandr, updated: 2026-01-13)
### Stream: Design approval
1. [DONE] Утвердить архитектуру Variant B — scope: `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: approve artifact upsert protocol vB`
2. [DONE] Git Commit: `docs: approve artifact upsert protocol vB` (hash: b24f798b)

### Stream: Core slot→path + upsert endpoint (MVP)
1. [DONE] Core: добавить slot→path mapping для Idea stage и новый upsert контракт (artifacts[]: slot+markdown) — scope: `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `packages/core/src/remote-bridge/handlers/session-request-handler.ts`, `packages/core/src/remote-bridge/types.ts`; expected commit message: `feat(core): add artifact upsert protocol vB`
2. [DONE] Git Commit: `feat(core): add artifact upsert protocol vB` (hash: 03397944)

### Stream: UI accept partial artifacts + no agent paths
1. [DONE] UI: принимать partial artifacts и писать только то, что пришло (без требований "оба файла"), убрать зависимость от agent paths — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `src/client/ui/src/services/idea-artifact-persistence.ts`, `src/client/ui/src/services/idea-collector-service.ts`; expected commit message: `feat(ui): persist artifact upserts by slot`
2. [DONE] Git Commit: `feat(ui): persist artifact upserts by slot` (hash: 1b5ac333)

### Stream: Agent contract simplification (Idea Collector)
1. [DONE] Contract: заменить artifact.*_path и next_action на artifacts[] (slot+markdown), обновить prompt — scope: `packages/agents/idea-collector/assets/idea-collector-schema.json`, `packages/agents/idea-collector/assets/idea-collector-prompt.md`, `src/client/ui/src/services/idea-collector-fallback-schema.ts`; expected commit message: `feat(idea): switch to artifact upsert protocol vB`
2. [DONE] Git Commit: `feat(idea): switch to artifact upsert protocol vB` (hash: fef0d66e)

### Stream: Compatibility + cleanup
1. [DONE] Compatibility: поддержать new→legacy fallback на переходный период, добавить защиту от silent-drop — scope: `src/client/ui/src/services/idea-collector-artifact.ts`, `packages/core/src/remote-bridge/handlers/http-api-router.ts`, `doc/Architecture/Architecture.md`; expected commit message: `fix: prevent silent artifact drops (vB)`
2. [DONE] Git Commit: `fix: prevent silent artifact drops (vB)` (hash: d9ddc01d)

## Phase 30 — Workflow Tree Workbench Shell (owner: Oleksandr, updated: 2026-01-15)
### Stream: Workbench shell
1. [DONE] UI: собрать Workbench-раскладку (контекстный сайдбар, tool palette, status bar, сплит сессии/артефактов + ресайз) с синхронизацией доков — scope: `src/client/project-manager/`, `packages/ui/project-manager/`, `docs (README.md, CHANGELOG.md, doc/)`; expected commit message: `feat(project-manager): workflow tree workbench shell`
2. [DONE] Git Commit: `feat(project-manager): workflow tree workbench shell` (hash: 0b690e83)

### Stream: Workbench interaction stability
1. [DONE] UI: защитить workspace/initiative controls и fallback выбора папки — scope: `src/client/project-manager/api.ts`, `src/client/project-manager/components/layout/sidebar.tsx`; expected commit message: `fix(project-manager): guard workspace controls`
2. [DONE] Git Commit: `fix(project-manager): guard workspace controls` (hash: caf137f9)
3. [DONE] Docs: обновить релизные заметки и систему под 1.1.419 — scope: `README.md`, `CHANGELOG.md`, `doc/`; expected commit message: `docs: update 1.1.419 release notes`
4. [DONE] Git Commit: `docs: update 1.1.419 release notes` (hash: d500a791)

### Stream: Workbench interaction stability (CEF crash)
1. [DONE] UI: заменить нативные select на кастомные меню, чтобы убрать краши CEF — scope: `src/client/project-manager/components/layout/sidebar.tsx`, `packages/ui/project-manager/styles.css`, `src/client/project-manager/api.ts`; expected commit message: `fix(project-manager): replace native selects`
2. [DONE] Git Commit: `fix(project-manager): replace native selects` (hash: 4647482e)

### Stream: Release 1.1.420 docs
1. [DONE] Docs: обновить релизные заметки и систему под 1.1.420 — scope: `README.md`, `CHANGELOG.md`, `doc/`; expected commit message: `docs: update 1.1.420 release notes`
2. [DONE] Git Commit: `docs: update 1.1.420 release notes` (hash: 9e9bd282)

### Stream: Workspace-only Workbench + Release 1.1.421
1. [DONE] UI: убрать сущность Initiative и сделать полноэкранный workspace menu (Add/Fork/New) — scope: `src/client/project-manager/components/layout/{main-layout,sidebar,status-bar}.tsx`, `src/client/project-manager/types.ts`, `packages/ui/project-manager/styles.css`, `doc/SolidWorks-Flow/`, `README.md`, `CHANGELOG.md`, `doc/`; expected commit message: `feat(project-manager): workspace-only workbench menu`
2. [DONE] Git Commit: `feat(project-manager): workspace-only workbench menu` (hash: 361aeca6)
3. [DONE] Release: bump + build-all артефакты под 1.1.421 — scope: `package.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.421`
4. [DONE] Git Commit: `chore(release): bump 1.1.421` (hash: 318bab89)

### Stream: Tree cleanup + Release 1.1.422
1. [DONE] UI: убрать заголовок дерева, выровнять уровни (Description/Diagrams на уровне workspace) и добавить сворачивание треугольниками — scope: `src/client/project-manager/components/layout/{sidebar,workspace-tree}.tsx`, `packages/ui/project-manager/styles.css`, `README.md`, `CHANGELOG.md`, `doc/`; expected commit message: `feat(project-manager): collapsible workflow tree layout`
2. [DONE] Git Commit: `feat(project-manager): collapsible workflow tree layout` (hash: 72e1ac93)
3. [DONE] Release: bump + build-all артефакты под 1.1.422 — scope: `package.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.422`
4. [DONE] Git Commit: `chore(release): bump 1.1.422` (hash: 0344af1e)

## Phase 31 — Workflow Tree Marker Alignment + Release 1.1.423 (owner: Oleksandr, updated: 2026-01-16)
### Stream: Tree marker alignment
1. [DONE] UI: увеличить треугольники, выровнять оси маркеров (triangle/dot) и уменьшить шаг смещения в дереве — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `packages/ui/project-manager/styles.css`; expected commit message: `feat(project-manager): align tree markers`
2. [DONE] Git Commit: `feat(project-manager): align tree markers` (hash: 2e50cf96)

### Stream: Release 1.1.423 docs
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.423 release notes`
2. [DONE] Git Commit: `docs: update 1.1.423 release notes` (hash: 310da73d)
3. [DONE] Docs: обновить системную архитектуру под 1.1.423 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update 1.1.423 architecture notes`
4. [DONE] Git Commit: `docs: update 1.1.423 architecture notes` (hash: 92a84498)

### Stream: Release 1.1.423 build
1. [DONE] Release: bump + build-all артефакты под 1.1.423 — scope: `package.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.423`
2. [DONE] Git Commit: `chore(release): bump 1.1.423` (hash: 8c12f3e1)

## Phase 32 — Module Step Alignment + Release 1.1.424 (owner: Oleksandr, updated: 2026-01-16)
### Stream: Module step alignment
1. [DONE] UI: выровнять Spec/Plan/Execute по оси маркера модуля и сохранить отступ Orchestration — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`; expected commit message: `fix(project-manager): align module step markers`
2. [DONE] Git Commit: `fix(project-manager): align module step markers` (hash: 07f8de23)

### Stream: Release 1.1.424 docs
1. [DONE] Docs: обновить релизные заметки — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: update 1.1.424 release notes`
2. [DONE] Git Commit: `docs: update 1.1.424 release notes` (hash: 4e556a10)
3. [DONE] Docs: обновить системную архитектуру под 1.1.424 — scope: `doc/Architecture/Architecture.md`, `doc/Project_Docs/SystemArchitecture/SystemArchitecture.md`; expected commit message: `docs: update 1.1.424 architecture notes`
4. [DONE] Git Commit: `docs: update 1.1.424 architecture notes` (hash: 4b6381bf)

### Stream: Release 1.1.424 build
1. [DONE] Release: bump + build-all артефакты под 1.1.424 — scope: `package.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.424`
2. [DONE] Git Commit: `chore(release): bump 1.1.424` (hash: d7d69ccf)

## Phase 33 — SolidWorks-Flow Release Docs + GitHub Push (owner: Oleksandr, updated: 2026-01-16)
### Stream: SolidWorks-Flow release docs
1. [DONE] Docs: актуализировать SolidWorks-Flow под релиз 1.1.424 — scope: `doc/SolidWorks-Flow/README.md`, `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs: update solidworks-flow 1.1.424 notes`
2. [DONE] Git Commit: `docs: update solidworks-flow 1.1.424 notes` (hash: d1f09bcb)

### Stream: Release notes refresh
1. [DONE] Docs: уточнить релизные заметки под 1.1.424 — scope: `README.md`, `CHANGELOG.md`; expected commit message: `docs: refine 1.1.424 release notes`
2. [DONE] Git Commit: `docs: refine 1.1.424 release notes` (hash: 4b22a490)


## Phase 34 — Project Manager Workflow Bootstrap + Release 1.1.425 (owner: Oleksandr, updated: 2026-01-16)
### Stream: Workflow Tree canon
1. [IN_PROGRESS] Docs: унифицировать Workflow Tree документ под MVP Project Manager + привязка к runtime артефактам — scope: `doc/SolidWorks-Flow/Architecture/WorkflowTree_UI_Architecture.md`; expected commit message: `docs: consolidate workflow tree mvp`
2. [TODO] Git Commit: `docs: consolidate workflow tree mvp` (hash: TBD)

### Stream: Disable mock workflow tree
1. [IN_PROGRESS] UI: показывать только корень workspace (без моковых шагов/модулей/tools) — scope: `src/client/project-manager/components/layout/workspace-tree.tsx`, `src/client/project-manager/components/layout/main-area.tsx`; expected commit message: `fix(project-manager): hide mock workflow tree`
2. [TODO] Git Commit: `fix(project-manager): hide mock workflow tree` (hash: TBD)

### Stream: Release 1.1.425 build
1. [TODO] Release: bump + build-all артефакты под 1.1.425 — scope: `package.json`, `assets/*/manifest.json`, workspace `package.json`; expected commit message: `chore(release): bump 1.1.425`
2. [TODO] Git Commit: `chore(release): bump 1.1.425` (hash: TBD)

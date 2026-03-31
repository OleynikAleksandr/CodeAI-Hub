# Session 153 — Phase 57: Cleanup Diagram Facades + module-inventory aggregate

**Date:** 2026-03-24 15:00–16:30 (CET)
**Branch:** main
**Version:** 1.1.786 → 1.1.788

---

# 1. Work Done in This Session

## Context: What Was This About

CodeAI Hub — VS Code extension + standalone Project Manager (CEF) + Core server.
Multi-provider AI orchestration (Claude, Codex, Gemini) for a SolidWorks-like workflow.

The workflow has a sequential trunk of 4 steps:
**Questionnaire → Description → Virtual Simulation → Diagram Modules**

In Session 152 three architecture decisions were made:
1. **Diagram Facades removed as trunk workflow step** — a flat diagram of 34+ facade entities was an unreadable "visual monolith". Facade specs will instead live inside per-cluster and per-module branches (future design).
2. **module-inventory.md aggregate removed** — the Module Graph is built progressively from individual `product-parts/<part-id>.md` files; the single-file aggregate was redundant and had known bugs.
3. **Workflow tree structure defined** — after Diagram Modules (last trunk step), work branches per Product Part → per Cluster → per Module. See `memory/workflow-tree-evolution.md`.

This session (153) implemented all three decisions as a full cleanup Phase 57.

## Work summary

### Stream 1: Remove Diagram Facades stage (86 files, -3,576 lines)
- **Deleted entirely** (24 files): `packages/agents/diagram-facades-agent/` (agent + 4 assets), `src/.../diagram-facades/` (panel + help), facade parser + test in core, 13 facade-specific editor files (entity/methods/ports/relation editors, domain patches, conflict merge), `use-diagram-facades-artifact-availability.ts`
- **Cleaned references** (62 files): removed `"diagram_facades"` from all type unions, stage arrays, gating logic, REST routes, layout, services, session continuity, bundled templates, tests
- Regenerated `bundled-templates.ts` via `generate-bundled-templates.js` (14 → 10 templates)
- Added legacy facade template paths to `LEGACY_TEMPLATE_RELATIVE_PATHS` in `template-sync-service.ts` for disk cleanup

### Stream 2: Remove module-inventory compose pipeline (16 files, -557 lines)
- **Deleted**: `diagram-modules-aggregate.ts` + test
- **Removed**: `compose_aggregate` orchestration substep, module-inventory.md from workflow-paths, hydration targets, http-api-router, diagram-modules-progress, prompt-pack phases, panel/help text
- Updated all related tests

### Stream 3: Documentation sync
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` — removed all Diagram Facades sections and module-inventory aggregate references; hydration list narrowed to `Final_Description.md`, `virtual-simulation.md`, `product-parts.index.md`
- `CHANGELOG.md` — added `[Unreleased]` section with removal notes

### Stream 4: Release build
- Fixed `build-core.sh` — removed rsync for deleted `diagram-facades-agent/`
- Fixed `diagram-editor-facade.tsx` — removed leftover `FacadeNode` component (caught by TypeScript during build-release)
- `build-all.sh` → 1.1.788, `build-release.sh` → `codeai-hub-1.1.788.vsix`
- Tarballs → `doc/tmp/releases/`

### Stream 5: Session handoff
- This report + `todo-plan.md` updated

## Git commits
(ВАЖНО: Этот список нужен для следующей сессии, чтобы восстановить контекст через `git show`)
- `5b12c63d refactor(workflow): remove Diagram Facades stage and all facade references`
- `e8a6c3ab refactor(diagram-modules): remove module-inventory aggregate pipeline`
- `491a029f docs(architecture): remove Diagram Facades and module-inventory from docs`
- `b493b5cb chore(release): bump version to 1.1.787`
- `c5dd8547 fix(build): remove diagram-facades-agent rsync from build-core.sh`
- `d64f90f6 chore(release): bump version to 1.1.788`
- `087f2fac fix(diagram-editor): remove FacadeNode from editor component`
- `25f6ea86 docs(session): record session 153 with phase 57 completion`

---

# 2. Current State of the Codebase After This Session

## Workflow pipeline (trunk)
```
Questionnaire → Description → Virtual Simulation → Diagram Modules (LAST trunk step)
```
No workflow step after Diagram Modules exists yet. Per-cluster/per-module branches are **designed but not implemented**.

## Diagram Modules: how it works now
- Agent generates `product-parts.index.md` (list of product parts with order and purpose)
- For each product part, agent materializes `product-parts/<part-id>.md` (clusters + modules)
- **Progressive model** (`diagram-modules-progressive-model.ts`): reads index → loads each part file → merges into `ModuleMapModel` → renders via React Flow
- **No aggregate**: `module-inventory.md` is no longer generated or expected
- Layout sidecar: `module-map.flow.json` (node positions persisted by the visual editor)

## Key type definitions
- `WorkflowStageId` = `"description" | "virtual_simulation" | "diagram_modules"` (no `diagram_facades`)
- `DiagramEditorStage` = `"diagram_modules"` (singleton)
- `DiagramMapModel` = `ModuleMapModel` (facade model type removed from `diagram-dsl-types.ts`)
- Bundled templates: 10 (3 description + 1 virtual-simulation + 6 diagram-modules)

## What was NOT removed (design-pattern facades, not workflow-step facades)
- `diagram-editor-facade.tsx` — React Flow rendering component (architectural Facade pattern)
- `SessionContinuityFacade`, `CodexResponsePolicyFacade`, etc. in provider modules — design pattern, not workflow step

## Pre-existing issues (NOT regressions)
- Serializer tests fail under tsx/ESM (crypto `require` unavailable) — pre-existing since before this session
- Relations not parsed from product part files → intentionally deferred
- `product-parts.index.md` statuses remain "planned" → intentionally deferred

---

# 3. Instructions for Next Session

## Required documents to review before work
1. `AGENTS.md` — master process and architecture
2. `doc/SolidWorks-WorkFlow/README.md`
3. `doc/SolidWorks-WorkFlow/Docs_Index.md`
4. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
5. `doc/TODO/todo-plan.md` — Phase 57 completed
6. `doc/Sessions/Archive/Session153.md` (THIS REPORT)
7. Memory: `workflow-tree-evolution.md` — trunk ends at Diagram Modules

> Далее: в зависимости от задачи открыть нужные документы из `doc/SolidWorks-WorkFlow/Clusters/`, `Modules/`, `Contracts/`.

## Plans for next session

### 1. Test release 1.1.788
- Clean `~/.codeai-hub/templates/` before install
- Install `codeai-hub-1.1.788.vsix`
- Verify end-to-end: Questionnaire → Description → Virtual Simulation → Diagram Modules
- Verify legacy facade templates are cleaned from disk by `template-sync-service`
- Verify toolbar shows only 3 steps (Description, Virtual Simulation, Diagram Modules)
- Verify sidebar tree has no "Diagram Facades" entries
- Verify Module Graph renders correctly from progressive model

### 2. Design per-cluster/per-module branching workflow (if testing passes)
- Trunk ends at Diagram Modules — define what happens next in the UI/UX
- Design per-cluster branching: cluster spec + cluster facade contract
- Design per-module branching: module spec + module facade spec + ToDoPlan + Implementation
- Create planning document in `doc/SolidWorks-WorkFlow/Plans/`

### 3. Known deferred issues
- Relations not parsed from product part files → revisit during branch workflow design
- `product-parts.index.md` statuses remain "planned" → revisit during branch workflow design

# Session 152 — Post-Release Feedback Fixes + Workflow Architecture Decision

**Date:** 2026-03-24 12:00–15:00 (CET)
**Branch:** main
**Version:** 1.1.782 → 1.1.786

---

# 1. Work Done in This Session

## Work summary

### Phase 55 completion (releases 1.1.783–1.1.785)
- **Stream 1**: PP header padding — added `PP_CARD_PAD_TOP=18` to `getProductPartHeaderHeight`
- **Stream 2**: 3-col table parser — fixed `\s*` newline crossing (N-1 bug), phantom header filter, humanized titles
- **Stream 3**: CHANGELOG, release 1.1.783, session 151

### Phase 56 — Post-release feedback fixes (releases 1.1.784–1.1.786)

**Stream 1: Uniform spacing (1.1.784)**
- `getClusterHeaderHeight` missing `CL_PAD_TOP=14` (clusterCardStyle padding-top) and `MODULE_CARD_GAP` after header
- Purpose text lineHeight 1.4 → `CL_PURPOSE_LH=16` instead of `LH11=14`
- `PRODUCT_PART_HEADER_BODY_GAP` raised from 4 to 12
- All vertical gaps now uniform at `MODULE_CARD_GAP=12`

**Stream 2: Parser bugs from artifact review (1.1.786)**
- **Responsibility truncation**: `[^|]+?` in `OUTLINE_MODULE_ROW_RE` optional group treated `|` inside backtick expressions (e.g. `` `turn_completed|turn_failed` ``) as column separator. Fix: removed raw-text alternative from optional group
- **Kind always "service"**: `toModuleEntity` hardcoded `kind: "service"`. Fix: pass detected kind, validate against `ModuleKind` union type with `isModuleKind` guard
- **Relations empty in aggregate**: `materializeModuleMapFromProductPartOutline` does not parse `## Simple Relations` section → compose produces empty `## Relations`. Decision: NOT fixing — will be removed together with `module-inventory.md` aggregate

### Test coverage added
- `diagram-modules-staged-part-parser.test.ts`: 4 tests
  1. 3-col table: no phantom header, correct module count
  2. 3-col table: humanized titles, preserved kind (service/store/adapter)
  3. Responsibility with `|` inside backticks: not truncated
  4. 4-col table: explicit title preserved

### Full workflow artifact review
Read all artifacts end-to-end for workspace "CodeAI-Hub codex 5.4":
- **Questionnaire**: well-filled, clear language, proper boundary separation
- **Final Description**: correct archetype/shell/application/core separation, 8 scenarios, candidate clusters
- **Virtual Simulation**: 7 scenarios with boundary-sensitive interactions, continuity model (JSONL, step-session over provider-sessions)
- **Diagram Modules**: 5 product parts, 15 clusters, 34 modules — matches upstream boundaries, AI providers correctly left as standalone peers

### Architecture decisions

**Decision 1: Remove Diagram Facades as trunk workflow step**
- A single diagram of all facades across all 34 modules would create an unreadable "visual monolith"
- Diagram Modules is the LAST trunk step
- Facade specs belong inside per-cluster and per-module branches, not in one flat diagram
- See `memory/workflow-tree-evolution.md` for details

**Decision 2: Workflow tree structure**
- **Trunk (sequential):** Questionnaire → Description → Virtual Simulation → Diagram Modules
- **Branch by Product Part** (already exists as per-part turns)
- **Branch by Cluster:** cluster spec + cluster facade contract
- **Branch by Module:** module spec (≈ code) + module facade spec + ToDoPlan + Implementation

**Decision 3: Remove module-inventory.md aggregate**
- Module Graph is already built from individual `product-parts/<part-id>.md` files via progressive model
- `module-inventory.md` is a redundant aggregate with known bugs (lost relations, lost kind before fix)
- Will be removed together with Diagram Facades in cleanup refactoring

## Git commits
- `36cc3656 fix(diagram-modules): include product part card padding in header height calculation`
- `cb4e0aad fix(diagram-modules): parse 3-column module tables and show correct module count`
- `e85016cf docs(release): sync auto-layout and parser fix notes`
- `4f8744e5 chore(release): bump version to 1.1.783`
- `29fd4b8d docs(session): record session 151 with phase 55 completion`
- `25005a05 fix(diagram-modules): uniform spacing with cluster padding and correct purpose line height`
- `153b57fd chore(release): bump version to 1.1.784`
- `242b7921 chore(release): bump version to 1.1.785`
- `00d41c73 fix(diagram-modules): preserve module kind and fix responsibility truncation at pipe chars`
- `79021c1c fix(diagram-modules): type-safe module kind with ModuleKind validation`
- `0a2eb5e8 chore(release): bump version to 1.1.786`
- `8dd7085f docs(session): record session 152 with phase 56 completion`

---

# 2. Instructions for Next Session

## Required documents to review before work

### Архитектурные и workflow документы
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`

### Текущие session/plan
5. `doc/TODO/todo-plan.md` — Phase 57 planned
6. `doc/Sessions/Session152.md` (THIS REPORT)

### Key architecture decisions
7. Memory: `workflow-tree-evolution.md` — trunk ends at Diagram Modules, no Diagram Facades step

## Plans for next session

### Phase 57 — Cleanup: remove Diagram Facades + module-inventory aggregate

#### Diagram Facades scope (37 files in src/, 33 in packages/)

**Dedicated facade components (DELETE):**
- `src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx`
- `src/client/project-manager/components/diagram-facades/diagram-facades-help.tsx`
- `packages/agents/diagram-facades-agent/` (entire agent: `assets/facade-map-prompt.md`, `assets/facade-map-template.md`, `src/facade.ts`)

**Facade-specific editor code (DELETE):**
- `src/.../diagram-editor/apply-facade-domain-patch.ts` + `.test.ts`
- `src/.../diagram-editor/apply-facade-relation-patch.ts` + `.test.ts`
- `src/.../diagram-editor/facade-conflict-merge.test.ts`
- `src/.../diagram-editor/adapters/domain-model-to-react-flow.facades.test.ts`

**Facade parser in core (DELETE):**
- `packages/core/src/workflow/diagram-dsl/facade-map-parser.ts` + `.test.ts`

**Files needing facade REFERENCES removed (EDIT, not delete):**
- `src/.../layout/stage-artifact-mode.ts` + `.test.ts` — remove `diagram_facades` from stage modes
- `src/.../layout/workspace-tree-diagram-branch-nodes.ts` + `.test.ts` — remove facade branch
- `src/.../layout/use-diagram-facades-artifact-availability.ts` — DELETE entire file
- `src/.../layout/main-area.tsx`, `main-area-panel-content.tsx`, `main-area-utils.ts` — remove facade panel routing
- `src/.../layout/workspace-tree-model.ts`, `workspace-tree-branch-nodes.ts`, `workspace-tree.tsx` — remove facade entries
- `src/.../layout/use-main-area-workflow-state.ts`, `use-stage-panel-sync.ts`, `use-workflow-tool-select.ts` — remove facade refs
- `src/.../shared/stage-artifact-fix-button.tsx`, `stage-artifact-content-view.tsx`, `use-stage-artifact-loader.ts` — remove facade cases
- `src/.../diagram-editor/diagram-stage-panel-scaffold.tsx` — remove facade mode
- `src/.../diagram-editor/diagram-modules-progressive-model.ts` — remove facade model refs
- `src/.../diagram-editor/adapters/domain-model-to-react-flow.ts`, `.types.ts` — remove facade adapter path
- `src/.../diagram-editor/diagram-editor-facade.test.tsx` — remove facade test cases
- `src/.../services/prompt-pack-builder.ts` — remove facade prompt pack
- `src/.../services/workflow-step-start-service.ts` + `.gating.test.ts` — remove facade step start
- `src/.../services/workflow-state-client.ts` — remove facade state
- `src/.../services/description-submit-service.ts` — remove facade refs
- `packages/core/src/workflow/paths/workflow-artifact-paths.ts`, `workflow-paths-types.ts` — remove facade paths
- `packages/core/src/workflow/diagram-dsl/markdown-dsl-serializer.test.ts`, `markdown-dsl-parser.ts`, `diagram-dsl-types.ts` — remove facade types/serializer
- `packages/core/src/workflow/diagram-dsl/baseline-diff-service.test.ts` — remove facade diff tests
- `packages/core/src/remote-bridge/handlers/` — remove facade contract handlers, session refs, state refs
- `packages/core/src/workflow/watcher/`, `state/`, `session-continuity/` — remove facade watcher, state, continuity refs
- `packages/core/src/templates/bundled-templates.ts`, `template-sync-service.ts` + `.test.ts` — remove facade templates

#### module-inventory.md scope (16 files)
- `src/.../sessions/diagram-modules-aggregate.ts` + `.test.ts` — DELETE compose pipeline
- `src/.../layout/` — remove availability checks and sidebar refs to module-inventory
- `src/.../services/prompt-pack-builder.ts` — remove module-inventory as prompt context
- `src/.../diagram-editor/use-diagram-loader.ts` — verify it loads from part files, not aggregate
- `src/.../diagram-modules/diagram-modules-panel.tsx` — verify no aggregate dependency

#### Post-cleanup
- Sync documentation: `SystemArchitecture.md`, workflow docs, CHANGELOG
- Design per-cluster/per-module branching workflow

### Known bugs NOT fixed (deferred to cleanup)
- Relations not parsed from product part files → irrelevant after module-inventory.md removal
- `product-parts.index.md` statuses remain "planned" → revisit during branch workflow design

# План разработки: CSS-Native Layout для Diagram Modules

## Context Pack For This Cycle
- **Planning source:** `.claude/plans/vectorized-herding-planet.md`
- **Read this context before implementation:**
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx`
  - `src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx`
  - `src/client/project-manager/components/diagram-editor/adapters/module-stage-react-flow.ts`
  - `src/client/project-manager/components/diagram-editor/adapters/domain-model-to-react-flow.types.ts`
  - `src/client/project-manager/components/diagram-editor/flow-sidecar-types.ts`
- Только этот список является источником документов для восстановления контекста текущего execution cycle.

## Phase 1 — Kill Old Layout (owner: agent, updated: 2026-04-08)

### Stream 1: Strip shell of normalizer wiring
1. [DONE] Edit shell.tsx + shell.test.ts — remove normalizer imports/calls
2. [DONE] Git Commit: `refactor(diagram): strip shell of layout normalizer wiring` (hash: 0b48a3ad0)

### Stream 2: Strip facade of measured-layout-bridge
1. [DONE] Edit facade.tsx + facade.test.tsx — remove bridge import/JSX
2. [DONE] Git Commit: combined with Stream 3

### Stream 3: Delete orphaned layout files
1. [DONE] Delete 7 files (~1350 lines)
2. [DONE] Git Commit: `refactor(diagram): strip facade and delete legacy layout engine (~1350 lines)` (hash: 3838d8c45)
3. [DONE] Targeted build: `npm run build:webview` — PASS

## Phase 2 — CSS-Native Layout (owner: agent, updated: 2026-04-08)

### Stream 4: Layout params types + auto-columns
1. [DONE] Create diagram-editor-layout-params.ts + test
2. [DONE] Git Commit: `feat(diagram): add layout-params types and auto-columns algorithm` (hash: 03ce9d805)

### Stream 5+6: Rewrite types + adapter + facade with CSS Grid
1. [DONE] Simplify domain-model-to-react-flow.types.ts — removed ContainerConstraints, measured, edges
2. [DONE] Rewrite module-stage-react-flow.ts — ProductPart-only nodes with nested data
3. [DONE] Rewrite domain-model-to-react-flow.ts — removed edges
4. [DONE] Rewrite facade.tsx — CSS Grid ProductPartNode with ClusterCard/ModuleCard
5. [DONE] Rewrite all adapter tests + facade tests
6. [DONE] Update progressive-model — removed layoutSource
7. [DONE] Git Commit: `feat(diagram): rewrite types, adapter and facade for CSS Grid layout` (hash: 1ea2f2afa)
8. [DONE] Targeted build: `npm run build:webview` — PASS

## Phase 3 — Context Menu (owner: agent, updated: 2026-04-08)

### Stream 8+9: Context menu + wiring + persist
1. [DONE] Create diagram-editor-context-menu.tsx
2. [DONE] Wire into shell.tsx + facade.tsx (React Context for callbacks)
3. [DONE] Git Commit: `feat(diagram): add context menu for layout param overrides` (hash: 59e86b129)

## Phase 4 — Build + Release (owner: agent, updated: 2026-04-08)

### Stream 10: Final verification
1. [TODO] Update README.md and CHANGELOG.md
2. [TODO] Full build: `./scripts/build-all.sh`
3. [TODO] Git Commit: build/release
4. [TODO] Update docs + session report

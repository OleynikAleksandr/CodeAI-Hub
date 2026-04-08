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

## Правила выполнения (Execution Rules):
- **Required reading:** `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
- **TODO Plan** состоит из Phase (Фаз). В каждой Phase некоторое количество Stream, в каждом Стриме подзадачи.
- Каждая подзадача затрагивает не более 3 файлов.
- **Gates:** Husky hooks автоматически (`pre-commit`, `pre-push`).
- **Targeted builds** вручную перед закрытием Phase.

## Phase 1 — Kill Old Layout (owner: agent, updated: 2026-04-08)

### Stream 1: Strip shell of normalizer wiring
1. [TODO] Edit `diagram-editor-shell.tsx` + `diagram-editor-shell.test.ts` — remove normalizer imports/calls, simplify handleFlowNodesChange
2. [TODO] Git Commit: `refactor(diagram): strip shell of layout normalizer wiring` (hash: TBD)

### Stream 2: Strip facade of measured-layout-bridge
1. [TODO] Edit `diagram-editor-facade.tsx` + `diagram-editor-facade.test.tsx` — remove bridge import/JSX, body-start-offset attrs
2. [TODO] Git Commit: `refactor(diagram): strip facade of measured-layout-bridge` (hash: TBD)

### Stream 3: Delete orphaned layout files
1. [TODO] Delete 7 files: layout-bounds, autolayout-packer, measured-normalizer, manual-normalizer, measured-bridge + 2 tests (~1350 lines)
2. [TODO] Git Commit: `refactor(diagram): delete legacy layout engine (~1350 lines)` (hash: TBD)
3. [TODO] Targeted build: `npm run build:webview`
4. [TODO] Git Commit: build fix if needed

## Phase 2 — CSS-Native Layout (owner: agent, updated: 2026-04-08)

### Stream 4: Layout params types + auto-columns
1. [TODO] Create `diagram-editor-layout-params.ts` — types, resolveProductPartColumns(), resolveClusterModuleColumns(), defaults
2. [TODO] Git Commit: `feat(diagram): add layout-params types and auto-columns algorithm` (hash: TBD)
3. [TODO] Create `diagram-editor-layout-params.test.ts` — cover auto-columns, overrides, defaults
4. [TODO] Git Commit: `test(diagram): cover layout-params auto-columns algorithm` (hash: TBD)

### Stream 5: Rewrite types + adapter
1. [TODO] Simplify `domain-model-to-react-flow.types.ts` — delete ContainerConstraints, measured types, edges; nest data
2. [TODO] Git Commit: `refactor(diagram): simplify react-flow types for CSS-native layout` (hash: TBD)
3. [TODO] Rewrite `module-stage-react-flow.ts` — emit ProductPart-only nodes with nested data
4. [TODO] Git Commit: `refactor(diagram): rewrite adapter to emit ProductPart-only nodes` (hash: TBD)
5. [TODO] Update `domain-model-to-react-flow.ts` + test — remove edges
6. [TODO] Git Commit: `refactor(diagram): remove edges from adapter` (hash: TBD)

### Stream 6: Rewrite facade with CSS Grid
1. [TODO] Rewrite `diagram-editor-facade.tsx` — ProductPartNode with CSS Grid (ClusterCard, ModuleCard)
2. [TODO] Git Commit: `feat(diagram): implement CSS Grid ProductPartNode` (hash: TBD)
3. [TODO] Update `diagram-editor-facade.test.tsx`
4. [TODO] Git Commit: `test(diagram): update facade tests for CSS Grid` (hash: TBD)

### Stream 7: Rewire sidecar + progressive model + persistence
1. [TODO] Rewrite `flow-sidecar-types.ts` — v2 format
2. [TODO] Git Commit: `refactor(diagram): rewrite sidecar to v2 format` (hash: TBD)
3. [TODO] Update `flow-sidecar-types.test.ts`
4. [TODO] Git Commit: `test(diagram): rewrite sidecar tests for v2` (hash: TBD)
5. [TODO] Update `diagram-modules-progressive-model.ts` — v2 sidecar loading
6. [TODO] Git Commit: `refactor(diagram): update progressive model for v2 sidecar` (hash: TBD)
7. [TODO] Update `use-diagram-persistence.ts` + `diagram-editor-shell.tsx` — v2 persistence
8. [TODO] Git Commit: `refactor(diagram): rewire persistence for v2 layout params` (hash: TBD)
9. [TODO] Targeted build: `npm run build:webview` + `npm run typecheck:webview`

## Phase 3 — Context Menu (owner: agent, updated: 2026-04-08)

### Stream 8: Context menu component
1. [TODO] Create `diagram-editor-context-menu.tsx` — positioned menu for ProductPart/Cluster overrides
2. [TODO] Git Commit: `feat(diagram): add layout context menu component` (hash: TBD)

### Stream 9: Wire context menu + persist
1. [TODO] Wire into `diagram-editor-shell.tsx` + `diagram-editor-facade.tsx`
2. [TODO] Git Commit: `feat(diagram): wire context menu into shell and facade` (hash: TBD)
3. [TODO] Persist via `use-diagram-persistence.ts`
4. [TODO] Git Commit: `feat(diagram): persist context menu layout overrides` (hash: TBD)

## Phase 4 — Build + Release (owner: agent, updated: 2026-04-08)

### Stream 10: Final verification
1. [TODO] Full build: `./scripts/build-all.sh`
2. [TODO] Git Commit: build/release
3. [TODO] Update docs + session report

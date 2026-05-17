# Diagram Modules Row-Aware Auto Layout Planning

**Status:** Active planning source
**Created:** 2026-05-17
**Owner:** Codex

## Problem

The Diagram Modules artifact surface uses nested CSS Grid for automatic placement. A Product Part can place several clusters in the same horizontal row, while each cluster independently resolves its own module columns. This allows a row such as:

- cluster A with two horizontal module cards;
- cluster B with two horizontal module cards;

The resulting row contains four module cards across the same visual band and often exceeds the right Project Manager artifact panel. Users then have to open each cluster layout menu and manually force fewer columns.

The issue is layout-only. The canonical semantic artifacts remain:

- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts.index.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/product-parts/<part-id>.md`
- `.codeai-hub/<workspaceSlug>/diagram_modules/module-map.flow.json` as non-semantic layout sidecar

## Scope

Add a default automatic layout rule for Diagram Modules:

- automatic Product Part placement must account for the effective number of module cards visible in each horizontal Product Part row;
- in default auto layout, a row must not exceed three horizontal module-card slots across clusters and standalone modules combined;
- manual sidecar overrides remain authoritative: explicit Product Part `columns` and Cluster `moduleColumns` settings still apply when the user intentionally chooses them;
- no semantic artifact format changes;
- no React Flow reintroduction.

## Proposed Implementation

1. Extend `src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.ts` with row-aware auto helpers:
   - keep public layout params unchanged;
   - compute default cluster module columns with row context;
   - choose Product Part auto columns by rejecting candidate row arrangements that exceed the row module-card budget.
2. Update `DiagramEditorFacade` only if needed to use the row-aware helper for cluster rendering.
3. Add regression tests for the screenshot scenario:
   - two adjacent two-module clusters must not auto-render as 2 + 2 horizontal module cards;
   - the second cluster should resolve to one column when the row budget is already consumed;
   - explicit overrides remain respected.
4. Document the default row budget in the System Architecture visual-shell boundary.

## Verification

Targeted checks:

- `npx tsx --test src/client/project-manager/components/diagram-editor/diagram-editor-layout-params.test.ts`
- `npm run typecheck:webview`
- `npm run build:webview`

Full release build is not started without a separate explicit user confirmation.

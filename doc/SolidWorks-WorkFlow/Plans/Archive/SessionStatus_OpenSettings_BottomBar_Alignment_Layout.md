# Session Status Bar / OPEN SETTINGS Bottom Alignment — Layout Planning

- **Status:** active planning source for the current execution cycle.
- **Planning source:** user request 2026-06-01 (Project Manager UI layout fix, screenshot-driven).
- **Scope kind:** pure visual / CSS layout (no workflow-truth, no Core-owned state change).
- **Planning owner:** Claude.

## 1. Problem (user request)

In the Project Manager window the two bottom elements are not visually aligned:

- Left column (`WORKSPACE`) → `OPEN SETTINGS` button at the very bottom. It is tall (≈35px) and its footer zone is tall (≈58px).
- Center column (`SESSIONS`) → bottom status panel: `Model | <model chip> | (reasoning) | Tokens: N (P%)`.

The user wants the bottom of both columns to form a single, tightly aligned bottom bar.

## 2. Current state (measured from code)

Render tree (single DOM, no iframe — `sessionContent` is a React node inside `.pm-panel__content`):

```
.pm-layout (flex row, 100vh)
├── .pm-sidebar (flex column, full height)
│   └── .pm-sidebar__footer (padding 10px 12px 12px; border-top)
│       └── .pm-sidebar__settings-button (width 100%; padding 9px 12px)
└── .pm-main-area (flex col; padding 0 8px 8px 0)   // bottom 8px = --pm-panel-gap
    └── .pm-panel-container (flex row)
        └── .pm-panel--sessions (flex col)
            ├── .pm-panel__header (36px)
            └── .pm-panel__content (flex 1; padding 16px; overflow-y auto)
                └── .session-app (flex col; gap 8px; padding 0 0 8px)
                    ├── header / SessionIdBar
                    └── .session-app__content (flex 1; gap 8px)
                        ├── .session-app__dialog (flex 1)        // chat
                        └── .session-app__rails (flex col; gap 8px)
                            ├── InputPanel
                            └── StatusPanel = .session-status.session-panel
```

Key numbers:

- **Vertical gap unit everywhere = 8px** (`--pm-panel-gap`, `.session-app` gap, `.session-app__rails` gap). This is the "minimal gap" the user refers to.
- **Status panel height ≈ 50px**: `.session-panel` padding 8px×2 + row 32px (tallest chip `.session-status-chip--limits` `min-height: 32px`, row `align-items: stretch`) + border 1px×2.
- **Status chip button** `.session-status-button`: `min-height: 28px`, `padding: 4px 12px`.
- **Status panel bottom offset to window bottom = 32px**: `.session-app` padding-bottom 8px + `.pm-panel__content` padding-bottom 16px + `.pm-main-area` padding-bottom 8px.
- **OPEN SETTINGS** `.pm-sidebar__settings-button`: `padding: 9px 12px` → button ≈ 35px; footer zone ≈ 58px; button bottom ≈ 12px from window bottom.

So the two bottom edges are misaligned (status panel sits 32px up, button sits 12px up), the button is taller than the chips, and the footer zone is taller than the status panel.

## 3. Target behavior

1. **OPEN SETTINGS button height = VISIBLE status chip height** → `min-height: 32px`. The model/reasoning buttons (`.session-status-button`, base `min-height: 28px`) share a row with the tokens chip (`.session-status-chip--limits`, `min-height: 32px`) under `align-items: stretch`, so they render at 32px — that is the height to match (not the 28px base value).
2. **OPEN SETTINGS footer zone has symmetric top/bottom gaps** and grows to fit the rule below (≈67px), rather than matching the panel box height.
3. **Status panel dropped to the very bottom** → remove the extra 8px (`.session-app` padding-bottom) + 16px (`.pm-panel__content` bottom padding for the sessions panel), leaving only the single 8px `--pm-panel-gap` below it. (Accepted in 1.2.432.)
4. **OPEN SETTINGS top/bottom aligned with the status chips** → the chips baseline is `17px` above the window edge (`8px` `--pm-panel-gap` + `1px` panel border + `8px` panel padding), so the footer bottom padding is `17px` and the top padding `17px` (symmetric). With the `32px` button the footer zone is `17 + 32 + 17 + 1` (border-top) = `67px`.

Net result: the OPEN SETTINGS button and the status chips share the same top and bottom edges — one horizontal line across both columns; the footer zone has equal top/bottom gaps.

## 4. Files in scope

- `media/session-view.css` — Session UI layer: `.session-app` bottom padding.
- `packages/ui/project-manager/styles.css` — PM shell layer: `.pm-panel--sessions .pm-panel__content` bottom padding; `.pm-sidebar__footer` + `.pm-sidebar__settings-button` height/alignment.

No TSX changes expected (existing class names are sufficient). No Core/contract changes — this does not touch workflow truth, so no `System/`/`Clusters/`/`Contracts/` SSOT edits are required; the change is documented here and verified by the user visually.

## 5. Implementation slicing (micro-tasks ≤ 3 files)

- **Stream A — Session Status Panel Bottom Drop**: remove the residual bottom spacing under the status panel so it sits at the 8px minimal gap. Files: `media/session-view.css`, `packages/ui/project-manager/styles.css`.
- **Stream B — OPEN SETTINGS Button Alignment**: button height = chip height, footer zone height = status panel height, button bottom-aligned to the status panel. Files: `packages/ui/project-manager/styles.css`.

## 6. Verification, release and acceptance

- **Tooling Verification**: targeted `npm run build:webview` / `npm run typecheck:webview` and `npm run build:project-manager` as relevant (CSS-only, but confirm bundles regenerate cleanly). Husky gates run on commit/push.
- **Release Build Confirmation Gate**: ask the user explicitly before running `build-all.sh` (mandatory, even though the user already requested a release up front).
- **Release Build**: README/CHANGELOG for the next version, `build-all.sh`, `build-release.sh --use-current-version`, collect VSIX.
- **User Visual Acceptance Testing**: hand over the VSIX; pixel alignment confirmed visually by the user. Minor 1px tweaks may follow as an additional stream if needed.
- **Scope Closeout**: archive `todo-plan.md` + this planning doc, update `Docs_Index.md` — only after explicit user acceptance.

## 7. Risks / open points

- Round 1 (1.2.432) aligned the button to the panel-box bottom (8px) with a 28px button; user feedback showed the button must instead match the VISIBLE chip height (32px) and the chips baseline (17px). Resolved in Round 2 (1.2.433) per §3, confirmed against the approved prototype `doc/tmp/prototypes/open-settings-bottom-align.html`.
- `.pm-panel__content` bottom padding is changed only for the sessions panel (`.pm-panel--sessions .pm-panel__content`) so the artifacts panel is unaffected.

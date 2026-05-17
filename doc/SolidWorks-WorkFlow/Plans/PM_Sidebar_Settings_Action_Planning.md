# PM Sidebar Settings Action Planning

**Status:** Accepted for implementation.
**Created:** 2026-05-17.
**Owner:** Codex.

## Problem

Project Manager currently renders the Settings entry point in the bottom footer/status bar together with the `Workflow Tree MVP` hint. That footer consumes vertical space below the session and artifact panes. The user wants the footer gone completely, the title text removed, and the Settings action moved to the bottom of the left sidebar where the workflow trees live.

## Target Behavior

- Remove the Project Manager bottom footer/status bar from the main layout.
- Remove the visible `Workflow Tree MVP` text.
- Move the `Open Settings` action to the bottom of the left sidebar, below the Documentation Tree / Development Tree area.
- Keep Settings behavior unchanged: clicking the sidebar action still opens the PM-owned in-shell Settings takeover in the right panel.
- Let the session and artifact panels use the vertical space previously reserved by the footer.

## Design

1. Sidebar action:
   - add the Settings action button to `Sidebar`;
   - dispatch the existing `pm:settings:open` event so `MainArea` remains the owner of Settings mode.

2. Main layout:
   - remove `StatusBar` rendering from `MainArea`;
   - stop reserving footer height in Project Manager layout styles.

3. Styling:
   - add a sidebar footer/action style that sits at the bottom of the left sidebar;
   - remove the old footer-specific `pm-status-bar` and `pm-status-open-settings` layout styles if no longer used.

## Relevant Files

- `src/client/project-manager/components/layout/sidebar.tsx`
- `src/client/project-manager/components/layout/main-area.tsx`
- `src/client/project-manager/components/layout/status-bar.tsx`
- `packages/ui/project-manager/styles.css`
- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

## Verification

- `npm run typecheck:webview`
- `npm run build:webview`
- targeted static checks or tests if existing layout tests cover sidebar-only navigation.

# Hide Session Tab Bar / Raise ID Bar — Layout Planning

- **Status:** active planning source for the current execution cycle.
- **Planning source:** user request 2026-06-01 (Project Manager UI, screenshot-driven).
- **Scope kind:** pure visual / CSS layout (no workflow-truth, no Core-owned state change). Tab bar stays in the code, only hidden.
- **Planning owner:** Claude.

## 1. Problem (user request)

The SESSIONS column has a tab bar near the top — the strip with session tabs like
`Diagram Modules Codex` and an `×` close button. The user wants it hidden (kept in
code, just not displayed). The freed space is reclaimed by the rest of the UI:
the session ID bar moves up and the gap above it becomes the standard horizontal
panel gap (8px).

## 2. Current state (measured from code)

Render tree inside the SESSIONS panel:

```
.pm-panel--sessions
├── .pm-panel__header (36px, "SESSIONS")
└── .pm-panel__content (padding 16px; bottom 0 from the prior scope)
    └── .session-app (flex col; gap 8px; padding 0)
        ├── .session-app__header        <- TAB BAR (SessionHeader -> SessionTabs)
        ├── .session-id-bar             <- "ID: ..." + Session/Weekly usage
        └── .session-app__content       <- chat / input / status
```

- Tab bar component: `SessionHeader` in `src/client/ui/src/session/virtual-conversation.tsx` renders `<div className="session-app__header">` wrapping `SessionTabs` (`src/client/ui/src/session/session-tabs.tsx`). The `{header}` slot is passed in `session-view.tsx`.
- `.session-app__header` CSS (`media/session-view.css`): `display: flex; flex-shrink: 0; flex-direction: column; gap: 8px;` (no own height — sized by `.session-tabs`, tabs are `height: 32px`).
- `.session-id-bar`: `min-height: 32px; padding: 4px 8px;` — a sibling after the header; the 8px gap above it comes from `.session-app` `gap: 8px`.
- `.session-app`: `gap: 8px; padding: 0`.
- Above `.session-app`: `.pm-panel--sessions .pm-panel__content` top padding is 16px.
- So today: SESSIONS header -> 16px (content top padding) -> tab bar -> 8px gap -> id bar -> 8px -> content.

`SessionTabs` returns `null` when there are no sessions, but `SessionHeader` (the `.session-app__header` container) always renders. Nothing functional depends on the tab bar being visible — hiding it is purely visual.

## 3. Target behavior

1. **Hide the tab bar** → `.session-app__header { display: none; }`. It stays in the DOM/code, just not rendered. As a `display: none` flex item it leaves the flex flow entirely (its `.session-app` gap contribution disappears too), so the id bar becomes the first visible row.
2. **Raise the ID bar with an 8px top gap** → set the sessions-panel content top padding to 8px (`.pm-panel--sessions .pm-panel__content { padding-top: 8px; }`), matching the standard horizontal panel gap.
3. Net result: SESSIONS header -> 8px -> ID bar -> 8px -> content. The tab bar no longer occupies space; the rest of the UI shifts up.

## 4. Files in scope

- `media/session-view.css` — `.session-app__header { display: none; }`.
- `packages/ui/project-manager/styles.css` — `.pm-panel--sessions .pm-panel__content` top padding 16px -> 8px.

No TSX changes (the tab bar code is retained, only hidden via CSS). No Core/contract changes — no workflow-truth touched.

## 5. Implementation slicing (micro-tasks <= 3 files)

- **Stream — Hide Tab Bar & Raise ID Bar**: both edits together (the hide and the gap are one visual change). Files: `media/session-view.css`, `packages/ui/project-manager/styles.css`.

## 6. Verification, release and acceptance

- **Tooling Verification**: `npm run build:project-manager` (confirm the new CSS is injected) + `npm run typecheck:webview`. A throwaway HTML prototype under `doc/tmp/prototypes/` may be used to visually confirm before the release build.
- **Release Build Confirmation Gate**: ask the user explicitly before `build-all.sh`.
- **Release Build**: README/CHANGELOG for 1.2.434, `build-all.sh`, `build-release.sh --use-current-version`, collect VSIX.
- **User Visual Acceptance Testing**: hand over the VSIX; confirmed visually by the user.
- **Scope Closeout**: archive `todo-plan.md` + this planning doc, update `Docs_Index.md` — only after explicit user acceptance.

## 7. Risks / open points

- The `.pm-panel__content` top padding is changed only for the sessions panel (`.pm-panel--sessions`) so the artifacts panel keeps its 16px top padding.
- Hiding `.session-app__header` (the whole tab-bar strip) rather than only `.session-tabs` keeps the layout clean (no empty header box contributing flex gap).

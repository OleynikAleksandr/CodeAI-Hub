# PM Detached Diagram Popup Lifecycle — Architecture

## Problem
- `Diagram Modules -> Detach` opens a second standalone CEF window as intended, but closing that detached window also closes the whole Project Manager application.
- The detached diagram window also opens with the full standalone window geometry instead of a popup-sized width that matches the in-shell artifact experience more closely.

## Confirmed Trigger
- The detach action uses `window.open(...)` with route `?mode=detached-diagram`.
- Standalone CEF popup creation goes through `LauncherBrowserViewDelegate::OnPopupBrowserViewCreated(...)`.
- On macOS the current `LauncherWindowDelegate::CanClose(...)` does not distinguish between the main Project Manager browser and popup browsers: every red-window-close action routes into `RequestNativeApplicationTermination()`.
- macOS window-state restore/persist also currently applies to popup browsers, so detached windows inherit the same autosave bucket as the main PM window.

## Root Cause
- The `1.2.52` launcher fix solved the main-window shutdown crash by short-circuiting the red close button into native application termination, but the implementation was left browser-role agnostic.
- As a result, popup windows inherit main-window shutdown semantics even though detached diagram windows should be disposable child surfaces, not application owners.
- Popup windows also inherit main-window frame persistence, so their startup geometry follows the last PM window frame instead of a dedicated popup presentation.

## Decision
- Split standalone launcher window behavior by browser role.
- The main Project Manager browser keeps the existing macOS native-termination short-circuit from `1.2.52`.
- Detached popup browsers get popup-local lifecycle semantics:
  - closing the popup must not terminate the whole application;
  - popup windows must not restore or persist against the main-window autosave slot;
  - popup creation should prefer a narrower artifact-oriented width instead of reopening at full PM window width.
- The PM detach action may still provide a JS-side popup width hint, but the launcher remains authoritative for popup-vs-main ownership.

## Scope
- `packages/cef-launcher/src/launcher_app.cc`
- `packages/cef-launcher/src/platform/mac/launcher_handler_mac.mm`
- `src/client/project-manager/components/layout/detach-diagram-button.tsx`
- minimal sync updates in SSOT / bug history only if implementation confirms the launcher contract change

## Non-Goals
- Do not remove detached diagram mode.
- Do not fold the diagram back into an in-shell-only surface.
- Do not introduce a new generic launcher bridge command.
- Do not expand this scope into a broader CEF/Chromium upgrade.
- Do not change diagram loading, persistence, or `BroadcastChannel("pm:diagram:sidecar-sync")` synchronization.

## Validation
- `npm run build:project-manager`
- standalone PM smoke:
  - open `Diagram Modules`, click `Detach`, verify the popup opens as a separate window with popup-like width;
  - close only the detached diagram window, verify the main PM window remains alive;
  - close the main PM window, verify the existing `1.2.52` shutdown path still exits the application cleanly.

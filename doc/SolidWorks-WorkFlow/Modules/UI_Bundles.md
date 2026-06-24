# UI Bundles (Webview + Project Manager) — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-05-05
**Owner:** Oleksandr + Codex
**Last metadata audit:** 2026-05-01 on `main` (`v1.2.121`; original validation: 2026-04-24)

## Назначение
UI бандлы, доставляемые как tarball’ы и устанавливаемые в `~/.codeai-hub/packages/ui/**`.

## Где живёт код
- Build: `scripts/build-webview.js`, `scripts/build-project-manager.js`, `scripts/build-ui-bundle.sh`
- Webview UI: `src/client/ui/`
- Project Manager UI: `src/client/project-manager/`
- Webview HTML bootstrap shell: `src/core/webview-module/webview-html-generator.ts`

## Startup Hydration
- `vscode-webview` и `project-manager` не должны ждать первый async `settings:loaded`, чтобы показать локализованный первый paint.
- Settings WebView получает persisted localization bootstrap snapshot инъекцией в HTML:
  - `window.__CODEAI_LOCALIZATION_BOOTSTRAP__`
- Project Manager получает тот же persisted snapshot через core HTTP endpoint:
  - `/api/v1/localization/bootstrap`
- Оба bundle'а стартуют из последнего persisted bootstrap snapshot, если он существует, а последующий settings/runtime refresh трактуют как background revalidation.
- Inline English fallback strings допустимы только как деградированный last-resort path для first-run или отсутствующего bootstrap snapshot.

## Settings Surface Ownership
- Shared `src/client/ui/src/components/settings-view.tsx` remains the common presentation surface, but the only live product host is Project Manager.
- Project Manager opens Settings from the bottom of the left sidebar as an in-shell takeover of the right panel; `src/client/project-manager/app.tsx`, `components/layout/sidebar.tsx`, `components/layout/main-area.tsx`, `components/layout/main-area-panel-content.tsx`, `components/settings/use-project-manager-settings.ts`, and `components/settings/use-project-manager-settings-state.ts` own that runtime. The sidebar trigger uses dedicated CSS class `pm-sidebar__settings-button` (accent-colored default/hover/active states plus focus-visible outline). The previous bottom footer/status bar is removed, so `Workflow Tree MVP` no longer renders and session/artifact panes reclaim that vertical space.
- Project Manager left sidebar is a projection of Core workflow-state, not a filesystem reader. Development Tree rows render the active Core snapshot as compact `Product Part -> Cluster -> Module` structure. Cluster/module workflow details (`Cluster Specification`, `Cluster Facade Contract`, `Facade Contract`, `Module Specification`, `Implementation TODO Plan`, worker progress, semantic integration) are right-panel surfaces for the selected node, not operation rows under cluster/module nodes in the left tree. Non-cluster/module operation rows may still route to the same session/artifact panes when Core explicitly includes them with `workflowPath` / `artifactWorkspacePath`.
- In Project Manager the shared `SettingsView` runs in `mode="project-manager"`: it keeps provider/general/localization flows, routes glossary opens through the PM host bridge, reuses shared `Core Controls` for `Restart Core`, and renders the blocking localization overlay only from actual `localizationSyncStatus` busy-state.
- Shared `SettingsView` owns the Settings shell scroll boundary: the outer settings container clips overflow, the tab body is the only vertical scroll container (`min-height: 0` inside the flex column), and the bottom action footer (`Reset to Defaults`, `Close`, `Save Changes`) remains anchored/reachable instead of becoming part of page-level overscroll.
- Provider `autoUpdate.enabled` toggles in Project Manager settings are not UI-only flags: the saved snapshot is read by Core startup through `SettingsProviderAutoUpdateService`, which runs enabled provider CLI/SDK update targets before provider registry initialization. Manual update buttons still use `settings:update-provider`; the checkbox controls startup policy.
- General Settings owns only the user-facing launcher for provider native request capture diagnostics. `src/client/ui/src/components/settings/native-request-capture-card.tsx` renders the bottom card with one description and `Open Capture Workbench`; it no longer renders scenario/model selectors, capture buttons, run status, or artifact paths in the Settings surface. Shared UI receives an optional `onOpenWorkbench` callback and must not import Project Manager services directly.
- The detached Capture Workbench is a Project Manager diagnostic surface at `?mode=detached-capture&workspaceSlug=...&workspacePath=...`. PM opens it through `src/client/project-manager/services/capture-workbench-launcher.ts` and wires the shared Settings launcher from `components/settings/use-project-manager-settings-state.ts`. The workbench uses the same PM websocket bridge for managed `settings:native-request-capture`, explicit reasoning override, Core-owned `workbench:state:*` persistence, and `workbench:artifact:read`; PM/CEF/browser code does not read or write `~/.codeai-hub` directly.
- Detached Capture Workbench selector controls (`Step`, `Provider`, `Model`, `Reasoning`) must be DOM-owned button/listbox surfaces through `src/client/project-manager/components/capture-workbench/dom-listbox-selector.tsx`, not native HTML `<select>`, for the same standalone CEF/macOS popup stability reason as Settings translation controls.
- Shared translation-engine controls inside `src/client/ui/src/components/settings/localization-translation-engine-selector.tsx` must remain DOM-owned button/listbox surfaces, not native HTML `<select>`, because standalone CEF/macOS 26.x can crash on the AppKit-native popup branch (`BUG-2026-04-22-08`). This constraint currently applies to both `UI Translation Engine` and `Reasoning Translation Engine`.
- `src/client/ui/src/app-host/settings-only-host.tsx` is a compatibility-only VS Code surface. It may show localized notice copy and bootstrap from persisted localization snapshot, but it is not allowed to expose live save/reset/provider-update/runtime-control UX.

## Установка
- `~/.codeai-hub/packages/ui/<bundleId>/<version>/` + symlink `current`

## Local File Link Behavior
- Shared session markdown supports an opt-in local-file interception path instead of hard-wiring editor behavior into every markdown surface.
- Project Manager uses that opt-in path only for agent dialog bubbles:
  - absolute local file links remain normal markdown links by default;
  - PM dialog supplies a file-link callback, decodes percent-encoded absolute filesystem paths before dispatch, and routes supported targets to the editor-aware open path;
  - artifact/help markdown stay on normal anchor behavior until a separate scope changes their contract.
- When a VS Code webview bridge exists, the UI bundle delegates PM dialog file opens to the extension host message channel; the extension host owns `showTextDocument`.
- Without a VS Code webview bridge, the UI bundle prefers the launcher bridge handoff for supported PM dialog file links.
- In standalone mode, the resulting Visual Studio Code external-open confirmation prompt may still appear; the UI contract only guarantees that the handoff target is a real path, not that the host suppresses the safeguard prompt.
- Raw `vscode://file/...` URI navigation remains only as a last-resort fallback when neither the webview bridge nor the launcher bridge exists.

## Project Manager Session UI Contracts
- `src/client/project-manager/services/project-manager-api-lifecycle.ts` owns Project Manager Core stream socket lifecycle: duplicate `connect()` calls while the socket is `OPEN`/`CONNECTING` are no-ops, and intentional `disconnect()` is the only cleanup path that closes the socket, clears reconnect timers, removes the window-message listener, and suppresses reconnect scheduling after unmount.
- Project Manager WebSocket ingestion is a typed boundary, not a raw `JSON.parse(...) as IncomingMessage` cast. `src/client/project-manager/services/core-stream-message-validator.ts` accepts only JSON objects with a non-empty string `type`, validates state-mutating payloads used by the PM API (`projects:update`, `core:state`, and settings status/cache messages), drops malformed known payloads with a sanitized warning, and still forwards unknown string-typed events for forward-compatible session/dialog listeners.
- `src/client/project-manager/components/sessions/session-message-dedupe.ts` owns optimistic user-message reconciliation for PM dialog history. When `Stop` + fast resend leaves a recent optimistic user bubble in the local snapshot, the first canonical user message with the same content arriving within the reconciliation window replaces that optimistic placeholder instead of being appended as a duplicate.
- The same dedupe helper also treats recent `role + createdAt + content` identity as replay-safe for PM session snapshots, so reconnect/history rebuild does not keep appending visually identical user/assistant entries with new ids.
- `src/client/ui/src/session/dialog-panel-scroll-anchor.ts` owns the bottom-lock autoscroll anchor for Session dialog. The anchor must be derived from the last rendered bubble display payload (`localizedContent ?? content`), not native `content` alone, so late Core translation overlay patches for the last visible bubble re-trigger bottom-lock scrolling when the translated text grows in place.
- `src/client/ui/src/session/dialog-panel-message-utils.ts` is responsible for display-time merge repair of already-split thinking fragments. When a previous thinking fragment ends with a marker-only markdown list line (`1.`, `2.`, `-`, `*`, `+`) and the next fragment starts with ordinary item text, the merge joiner must be a same-line repair (`2. Item`) instead of `2.\nItem`. When the next fragment starts with a standalone bold heading paragraph followed by body text, the merge helper must preserve a blank paragraph boundary before that heading block instead of compact-joining it with the previous body.
- The same thinking merge path is the UI surface for Codex paragraph-level reasoning streaming: Codex persists each reasoning summary paragraph/block as a separate append-only `assistant` + `tag="thinking"` message with its own stable `messageId`, Core translates each block independently, and the Session dialog visually merges consecutive thinking fragments into one growing thinking card.
- Assistant and thinking bubbles expose an always-visible semi-transparent `Speak` control beside the provider label. The button inherits the provider header color, uses the shared bubble chrome in `media/session-view.css`, and sends only the visible bubble text (`localizedContent ?? content`) to the Project Manager bridge.
- Project Manager owns speech command wiring for dialog sessions: clicking an idle bubble sends `session:speech:speak-message` with `sessionId`, `messageId`, provider id, visible text, and persisted `general.textToSpeech.rate`; clicking the currently active bubble sends `session:speech:stop`. `session:speech:state` from Core drives the active/pressed visual state, not local optimistic timers.
- `media/session-view.css` owns list-marker rendering, dialog bubble visual hierarchy, and heading/body spacing for PM Session dialog markdown. Ordered/unordered list markers render with `list-style-position: outside`; valid loose markdown lists from providers must keep the marker and the item paragraph on the same visual line, while standalone bold heading paragraphs keep the visual gap before themselves but suppress the extra gap only for the immediately following paragraph/list body. The shared dialog bubble contract also keeps every message card on a `1px` stroke and now applies one common muted chrome contract to both internal thinking paths across active provider surfaces: legacy `role="thinking"` and assistant-tagged reasoning (`role="assistant" + tag="thinking"`, for example `Codex · Thinking`) both use `rgba(44, 50, 48, 0.45)` fill, `rgba(71, 71, 74, 0.45)` stroke, and `0px 6px 14.1px 3px rgba(0, 0, 0, 0.5)` shadow. Main readable thinking body text on both paths now uses `rgba(173, 178, 186, 0.7)`, while provider-specific variation remains limited to the header hue and the timestamp stays on the more muted secondary value.
- `src/client/ui/src/session/session-id-bar.tsx` is display-only for `usageLimits`: it renders the current `status.usageLimits` / `usageLimitLabels` snapshot and no longer triggers provider refresh on mount or rebind.
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` and `project-manager-runtime-session-view.tsx` no longer wire `api.refreshUsageLimits(...)` into `SessionView`. Automatic usage refresh ownership is intentionally outside the bundle mount lifecycle; the PM/UI layer only displays telemetry already delivered by runtime snapshots or stream events.
- `src/client/ui/src/core-bridge/core-bridge-logger.ts` owns sanitized Core Bridge diagnostics for webview/standalone UI runtime failures. Server-message parsing, session history hydration, status snapshot, and supervisor request failures must log only short event names plus sanitized metadata, never raw provider payloads or full message bodies, and must not change the user-facing reconnect UX.
- Browser-side Core Bridge reconnect status is scheduler-owned. WebSocket `error` events log sanitized diagnostics and then delegate to `scheduleCoreBridgeReconnect(...)`; they must not emit an additional independent connection-status notification before the scheduler because `close`/`error` can arrive back-to-back. `notifyConnectionStatus(...)` also dedupes repeated `status + detail` pairs.

## Related Docs
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

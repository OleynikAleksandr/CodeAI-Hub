# UI Bundles (Webview + Project Manager) — Module (SSOT)

**Status:** Implemented on `main`
**Updated:** 2026-04-20
**Owner:** Oleksandr + Codex
**Validated on:** `main` (2026-04-20)

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
- `src/client/project-manager/components/sessions/session-message-dedupe.ts` owns optimistic user-message reconciliation for PM dialog history. When `Stop` + fast resend leaves a recent optimistic user bubble in the local snapshot, the first canonical user message with the same content arriving within the reconciliation window replaces that optimistic placeholder instead of being appended as a duplicate.
- The same dedupe helper also treats recent `role + createdAt + content` identity as replay-safe for PM session snapshots, so reconnect/history rebuild does not keep appending visually identical user/assistant entries with new ids.
- `src/client/ui/src/session/dialog-panel-message-utils.ts` is responsible for display-time merge repair of already-split thinking fragments. When a previous thinking fragment ends with a marker-only markdown list line (`1.`, `2.`, `-`, `*`, `+`) and the next fragment starts with ordinary item text, the merge joiner must be a same-line repair (`2. Item`) instead of `2.\nItem`. When the next fragment starts with a standalone bold heading paragraph followed by body text, the merge helper must preserve a blank paragraph boundary before that heading block instead of compact-joining it with the previous body.
- `media/session-view.css` owns list-marker rendering and heading/body spacing for PM Session dialog markdown. Ordered/unordered list markers render with `list-style-position: outside`; valid loose markdown lists from providers must keep the marker and the item paragraph on the same visual line, while standalone bold heading paragraphs keep the visual gap before themselves but suppress the extra gap only for the immediately following paragraph/list body.
- `src/client/ui/src/session/session-id-bar.tsx` is display-only for `usageLimits`: it renders the current `status.usageLimits` / `usageLimitLabels` snapshot and no longer triggers provider refresh on mount or rebind.
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx` and `project-manager-runtime-session-view.tsx` no longer wire `api.refreshUsageLimits(...)` into `SessionView`. Automatic usage refresh ownership is intentionally outside the bundle mount lifecycle; the PM/UI layer only displays telemetry already delivered by runtime snapshots or stream events.

## Related Docs
- `doc/SolidWorks-WorkFlow/Modules/Localization.md`
- `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`

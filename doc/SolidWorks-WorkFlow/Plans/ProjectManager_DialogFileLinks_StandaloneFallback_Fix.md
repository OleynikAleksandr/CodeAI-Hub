# Project Manager Dialog File Links Standalone Fallback Fix

**Status:** Draft for review (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Fix the failed standalone Project Manager file-link fallback so dialog links open in Visual Studio Code instead of triggering a second Chromium window with `ERR_UNKNOWN_URL_SCHEME`.

---

## 1. Problem

Release `1.1.901` shipped dialog file-link support for Project Manager agent replies. The VS Code-hosted path works by posting `pm:file-link:open` through the webview bridge, but the standalone fallback currently does this:

1. build a `vscode://file/...` URI in the PM UI;
2. click an `<a target="_blank">` element inside the standalone CEF window.

In standalone Project Manager that does not hand the URI to the external VS Code application. Instead, CEF tries to open the URI itself and spawns another Chromium window with:

- `Unable to load CodeAI Hub UI`
- `ERR_UNKNOWN_URL_SCHEME (-302)`

So the regression is not in link parsing. It is in the standalone fallback ownership.

---

## 2. Product Decision

### 2.1. VS Code-hosted path stays unchanged

When a VS Code webview bridge exists, PM dialog file links must continue to route through:

- `workspace.openTextDocument(...)`
- `window.showTextDocument(...)`

That path already matches the intended editor contract.

### 2.2. Standalone PM must use launcher-host handoff

Standalone Project Manager must no longer attempt to navigate its own Chromium surface to `vscode://file/...`.

Instead:

1. PM UI detects the launcher bridge;
2. PM UI requests a launcher-host handoff for the target file link;
3. the launcher host opens the `vscode://file/...` URI externally through the operating system;
4. Chromium navigation is cancelled before any extra launcher window is created.

### 2.3. Scope boundary

This fix is intentionally narrow:

- dialog file links only;
- standalone launcher fallback only;
- no change to normal HTTP/HTTPS links;
- no change to artifact/help markdown behavior.

---

## 3. Architecture Decisions

### 3.1. Launcher bridge needs a dedicated open-in-VSCode command

The existing launcher bridge already handles `pickFolder`, file-drop, and core-start via `codeai://...` interception. File-link fallback should use the same mechanism instead of raw anchor navigation.

The new bridge command should be file-link specific, not a generic arbitrary external URL opener. That keeps validation tighter and limits the launcher host surface.

### 3.2. PM opener priority

The PM dialog opener order must become:

1. VS Code webview bridge;
2. launcher bridge `openInVsCodeFile(...)`;
3. only if neither bridge exists, the previous raw `vscode://file/...` handoff may remain as a last-resort browser fallback.

This preserves compatibility for environments outside the launcher while fixing the known standalone regression.

### 3.3. Launcher host owns the external app launch

The standalone launcher must intercept the new bridge request in `OnBeforeBrowse`, validate/decode the payload, and invoke the OS-level external opener for the generated `vscode://file/...` URI.

On macOS this should open through the normal system application resolver so the installed VS Code app becomes the file target.

---

## 4. Implementation Boundary

### 4.1. PM runtime fallback

- `src/client/project-manager/services/pm-bridges.ts`
- `src/client/project-manager/services/project-manager-file-link-opener.ts`
- `src/client/project-manager/services/project-manager-file-link-opener.test.ts`

### 4.2. Launcher bridge and native handoff

- `packages/cef-launcher/src/launcher_handler_bridge_helpers.h`
- `packages/cef-launcher/src/launcher_handler.h`
- `packages/cef-launcher/src/launcher_handler.cc`

### 4.3. Documentation sync

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

---

## 5. Acceptance Criteria

1. Clicking a dialog file link in standalone Project Manager does not open another Chromium launcher window.
2. The clicked file opens in Visual Studio Code.
3. `:line` and `:line:column` metadata still reach the final `vscode://file/...` target.
4. VS Code-hosted PM behavior remains unchanged.
5. No new behavior is introduced for non-file links.

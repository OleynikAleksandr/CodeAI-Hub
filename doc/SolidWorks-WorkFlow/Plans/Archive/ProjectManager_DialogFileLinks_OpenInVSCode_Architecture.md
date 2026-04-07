# Project Manager Dialog File Links Open In VS Code Architecture

**Status:** Completed and archived after release 1.1.901 (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Make absolute local file links rendered in the Project Manager agent dialog open in the Visual Studio Code editor instead of falling back to the generic system text handler.

---

## 1. Problem

The Project Manager agent dialog already renders markdown links coming from assistant replies, and the links often point to canonical local files such as:

- workspace documents under the current repository;
- generated artifacts;
- session envelopes and JSONL logs under `~/.codeai-hub/sessions/...`.

Today those links are rendered as plain anchors inside shared markdown UI. As a result:

- the dialog shows the file as clickable;
- the path is already absolute and globally valid on the local machine;
- but the click is delegated to the generic host/system handler instead of the VS Code editor contract.

This creates a workflow mismatch. The assistant is effectively telling the user "open this local project document", but the product does not guarantee that the file opens in the editor surface where the user actually works with the repository.

---

## 2. Product Decision

### 2.1. Supported link class

The first implementation slice covers **explicit markdown links** in the Project Manager dialog whose target resolves to a local absolute filesystem path.

The target may include optional location metadata:

- `:line`
- `:line:column`
- `#Lline`
- `#LlineCcolumn`

The visible label may remain short (`virtual-simulation.md`, `Session005.md`, etc.). The open decision must be based on the link target, not on the link text.

### 2.2. Preferred open behavior

When the user clicks a supported file link in the PM dialog:

1. if a VS Code webview bridge is available, the file must open through the standard VS Code editor API:
   - `workspace.openTextDocument(...)`
   - `window.showTextDocument(...)`
2. if the PM runs without a VS Code webview bridge, the UI must fall back to a standard external handoff using a `vscode://file/...` URI so the installed VS Code app becomes the editor target.

The generic OS text editor must no longer be the primary path for supported PM dialog file links.

### 2.3. Scope boundary

This scope is intentionally limited to the **agent dialog surface** in Project Manager.

It does not automatically change all markdown renderers in the product:

- stage artifact viewers stay unchanged for now;
- Help markdown stays unchanged for now;
- non-file links keep their current behavior.

The implementation should therefore be **opt-in from the dialog path**, not a silent global behavior change for every consumer of shared `MarkdownContent`.

---

## 3. Non-Goals

This scope does not:

- auto-link plain text paths that are not already markdown links;
- change HTTP/HTTPS/external web link behavior;
- introduce a custom native launcher bridge just to open files in VS Code;
- restrict support only to files inside the active workspace root;
- redesign the PM dialog UI or artifact viewers;
- change how assistant messages are stored in JSONL/history.

---

## 4. Core Architecture Decisions

### 4.1. Local file link parsing must be explicit and reusable

The UI needs a small parser/helper that can:

- detect whether an `href` is a supported absolute local file target;
- extract the canonical file path;
- parse optional line/column metadata.

This parser should live close to shared session markdown UI so both parsing logic and tests stay isolated from Project Manager session controllers.

### 4.2. Markdown renderer must support opt-in interception

`MarkdownContent` currently renders anchors directly. That is acceptable for generic markdown, but insufficient for editor-aware file links.

The shared markdown renderer should gain an **optional interception callback**:

- if the link is not a supported local file target, normal anchor behavior stays unchanged;
- if the link is a supported local file target and the callback is provided, the click is intercepted and delegated to the caller.

This keeps artifact/help markdown stable while allowing the PM dialog to opt in.

### 4.3. PM dialog surfaces must own the open request

The Session UI path used by PM dialog/runtime views should pass the interception callback from the PM layer, because the open strategy depends on runtime environment:

- VS Code webview available;
- standalone CEF launcher without webview bridge.

The shared Session UI should not hardcode Project Manager-specific bridge assumptions.

### 4.4. VS Code-hosted PM should use the standard editor API

When the PM is running with `acquireVsCodeApi()`, the click must be forwarded through the existing webview message channel to the extension host.

The extension host becomes the source of truth for editor opening and is responsible for:

- validating the target payload;
- opening the document;
- revealing the requested line/column if present.

### 4.5. Standalone PM should use standard VS Code URI handoff

The standalone CEF launcher currently exposes only a small bridge (`pickFolder`, file-drop, core-start). This scope should not add a new native bridge just for editor opening.

Instead, the standalone PM should fall back to a standard external VS Code URI:

- `vscode://file/<absolute-path>`
- with optional line/column payload when supported by the generated URI form.

This keeps the fallback simple and avoids widening the native launcher scope.

### 4.6. Global local paths are valid targets

The supported file target must not be limited to the active workspace tree. Valid examples include:

- repository files;
- generated docs in sibling directories;
- session artifacts/logs under `~/.codeai-hub/sessions/...`.

The contract is "absolute local file path", not "workspace-relative source file only".

---

## 5. Implementation Boundary

### 5.1. UI / dialog interception

- `src/client/ui/src/session/file-link-target.ts` (new helper expected)
- `src/client/ui/src/session/markdown-content.tsx`
- `src/client/ui/src/session/dialog-panel.tsx`
- `src/client/ui/src/session/session-view.tsx`

### 5.2. PM runtime integration

- `src/client/project-manager/components/sessions/project-manager-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx`
- `src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx`
- `src/client/project-manager/services/pm-bridges.ts`
- `src/client/project-manager/services/project-manager-file-link-opener.ts` (new helper expected)

### 5.3. VS Code host handling

- `src/extension-module/home-view-message-router.ts`
- `src/extension-module/home-view-message-router/message-types.ts`
- `src/extension-module/message-handlers/project-manager-file-link-handler.ts` (new handler expected)

### 5.4. Documentation / regression area

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- targeted tests for parser, PM opener, and extension-host open handler

---

## 6. Acceptance Criteria

1. Clicking a supported file link in the PM agent dialog opens that file in Visual Studio Code, not in a generic text viewer/editor.
2. Absolute paths outside the active workspace root are supported if they point to a real local file.
3. If the link contains line/column metadata, the VS Code editor opens and reveals that location.
4. HTTP/HTTPS links and unsupported href formats keep normal external-link behavior.
5. PM artifact/help markdown does not silently change behavior unless explicitly wired later.
6. The standalone PM path does not require a new custom native launcher bridge.

---

## 7. Suggested Execution Streams

1. Add explicit local-file link parsing and dialog-only markdown interception.
2. Thread the new callback through PM session surfaces and add a PM-specific opener strategy.
3. Add the VS Code host message contract and `showTextDocument` handling.
4. Add targeted regression coverage and sync the PM/launcher/UI docs.
5. Cut a new test release for user validation.

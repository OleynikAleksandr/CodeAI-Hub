# Project Manager Dialog File Links Path Encoding Hotfix

**Status:** Draft for review (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Fix the remaining standalone PM file-link regression where the launcher handoff reaches Visual Studio Code with a percent-encoded broken path such as `/%2FUsers/...%2520...`, causing `Path does not exist`.

---

## 1. Problem

Release `1.1.902` fixed the Chromium-side `ERR_UNKNOWN_URL_SCHEME` regression by moving standalone file-link opens into the launcher host. That part works: CEF no longer opens a second launcher window.

But the final file target is still malformed:

- the path that reaches VS Code contains encoded slashes like `%2FUsers`;
- already encoded spaces become double-encoded as `%2520`;
- VS Code then shows a trust prompt for a broken path and finally reports `Path does not exist`.

This means the current path is corrupted in two places:

1. PM dialog links may still carry percent-encoded absolute paths (`%20`) as the logical file path;
2. launcher-side `vscode://file/...` construction currently percent-encodes path separators again.

---

## 2. Product Decision

### 2.1. The external-open security prompt is not the main bug

The Visual Studio Code prompt asking whether an external application may open a local path can remain as an acceptable platform-level confirmation for now.

This hotfix does **not** promise to remove that prompt universally.

The required fix is:

- the prompt, if shown, must display the real readable path;
- confirming the prompt must open the real file instead of ending with `Path does not exist`.

### 2.2. PM must normalize percent-encoded absolute file paths

If a dialog file link target is an absolute local path that contains URI escapes such as `%20`, PM must normalize it back to a filesystem path before it enters the opener pipeline.

This applies to:

- plain absolute local paths;
- absolute local paths with `:line` / `:line:column`;
- absolute local paths with `#Lline` / `#LlineCcolumn`.

### 2.3. Launcher must preserve path separators in the final VS Code URI

The launcher host must no longer percent-encode `/` and `:` when building the final `vscode://file/...` target.

The generated URI should follow the same shape as the already correct JS fallback contract:

- `vscode://file//Users/.../file.md`
- `vscode://file//Users/.../file.md:line:column`

---

## 3. Scope Boundary

This hotfix is intentionally narrow:

- standalone PM dialog file links only;
- no change to non-file links;
- no artifact/help markdown changes;
- no broad redesign of launcher external-open UX;
- no promise to suppress every VS Code trust prompt in this release.

---

## 4. Implementation Boundary

### 4.1. UI path normalization

- `src/client/ui/src/session/file-link-target.ts`
- `src/client/ui/src/session/file-link-target.test.ts`

### 4.2. Launcher URI construction

- `packages/cef-launcher/src/launcher_handler.cc`

### 4.3. Documentation sync

- `doc/SolidWorks-WorkFlow/Clusters/Project_Manager.md`
- `doc/SolidWorks-WorkFlow/Modules/Launcher_CEF.md`
- `doc/SolidWorks-WorkFlow/Modules/UI_Bundles.md`

---

## 5. Acceptance Criteria

1. Standalone PM dialog file-link handoff no longer shows `/%2FUsers/...%2520...` in Visual Studio Code.
2. Confirming the VS Code prompt opens the target file successfully instead of showing `Path does not exist`.
3. Absolute paths with escaped spaces (`%20`) open the real file.
4. `:line` and `:line:column` metadata still survive the standalone route.
5. VS Code-hosted PM behavior remains unchanged.

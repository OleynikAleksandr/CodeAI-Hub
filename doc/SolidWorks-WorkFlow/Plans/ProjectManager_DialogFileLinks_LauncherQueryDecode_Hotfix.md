# Project Manager Dialog File Links Launcher Query Decode Hotfix

**Status:** Approved for execution (2026-04-07)
**Created:** 2026-04-07
**Owner:** Oleksandr + Codex
**Scope:** Fix the remaining standalone PM file-link regression after `1.1.903`, where Visual Studio Code still receives a path shaped like `/%2FUsers%2F...` and shows `Path does not exist`.

---

## 1. Problem

Release `1.1.903` removed the extra Chromium window and repaired the `%2520` double-encoding layer, but the user still reproduced a broken final path in Visual Studio Code:

- the external-open confirmation prompt no longer appears;
- the final error still shows encoded path separators like `%2FUsers%2F...`;
- the opened target therefore still does not exist from VS Code's point of view.

That narrows the remaining fault to the launcher query decode boundary:

1. the PM bridge sends `path=${encodeURIComponent(payload.path)}`;
2. the launcher parses that query string;
3. the launcher currently decodes query values with rules that do not restore path separators for filesystem use.

So the launcher can still receive `/%2FUsers%2F...` as its logical path even before the final `vscode://file/...` URI is built.

---

## 2. Product Decision

### 2.1. The remaining bug is launcher-side query decoding

This scope is no longer about PM markdown parsing or `BuildVsCodeUri(...)` post-processing. The remaining fix must make the launcher interpret the query `path` parameter as a filesystem path, not as a URL fragment.

### 2.2. Fix only the `path` decode semantics

The launcher should keep generic query decoding unchanged for non-path fields such as `line` and `column`.

Only the `path` field should switch to a filesystem-oriented decode strategy that restores:

- path separators (`/`, and Windows `\\`-style separators if encoded);
- escaped spaces (`%20`);
- other encoded URL-special characters that belong to a literal filesystem path.

### 2.3. Broader knowledge documentation is deferred until user validation

Per the current user instruction, this cycle focuses on the code hotfix and a new test release first.

If the user confirms that the new release works, a follow-up documentation scope will record the wider method/knowledge learned from the multi-step file-link debugging sequence.

---

## 3. Scope Boundary

This hotfix is intentionally narrow:

- standalone PM dialog file links only;
- launcher query decode only;
- no new PM UI behavior changes;
- no new artifact/help markdown contract changes;
- no broad knowledge-base or SSOT retrofit in this cycle beyond planning/release bookkeeping.

---

## 4. Implementation Boundary

### 4.1. Launcher query decode

- `packages/cef-launcher/src/launcher_handler.cc`

### 4.2. Planning / release bookkeeping

- `doc/TODO/todo-plan.md`
- `README.md`
- `CHANGELOG.md`

---

## 5. Acceptance Criteria

1. Standalone PM dialog file-link open no longer reaches VS Code as `/%2FUsers%2F...`.
2. The final VS Code open target resolves to the real file path.
3. The fix remains compatible with line/column metadata.
4. Release `1.1.904` packages the hotfix for user validation.
5. Broader method/knowledge documentation is explicitly deferred until the user confirms the fix works.

# Session 006 — Project Manager Dialog File Links Open In VS Code Planning

**Date:** 2026-04-07 11:19 (CEST)
**Branch:** main
**Version:** 1.1.900
**Execution Scope Status:** ACTIVE

---

# 1. Work Done in This Session

## Work summary
- Re-read the completed `Session005` report, the base system SSOT, and the docs index before opening a new scope.
- Inspected the current PM dialog markdown rendering, PM bridge/runtime integration, and extension-host routing to confirm the actual gap: dialog file links still render as plain anchors, while the extension side already has a working `showTextDocument` precedent.
- Confirmed the standalone launcher currently exposes no native `open-file` bridge, so the new scope must prefer the standard VS Code editor API when a webview bridge exists and use `vscode://file` as the standalone fallback.
- Created the planning document later archived as `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_DialogFileLinks_OpenInVSCode_Architecture.md`.
- Created the active execution plan later archived as `doc/TODO/Archive/todo-plan-phase1-pm-dialog-file-links-open-in-vscode.md`, with implementation streams for dialog markdown interception, PM callback wiring, opener strategy, VS Code host handling, regression coverage, docs sync, and release packaging.
- Updated `doc/SolidWorks-WorkFlow/Docs_Index.md` so the new planning scope is discoverable from the canonical index.
- No tests or builds were run in this session because the work stopped at planning.

## Git commits
(IMPORTANT: when `Execution Scope Status: ACTIVE`, the next session must inspect every commit listed here via `git show --stat <hash>` and `git show <hash>`.)
- `fd76a063f docs(pm): plan dialog file links in vscode`

---

# 2. Instructions for Next Session

**Recovery Owner:** `doc/TODO/Archive/todo-plan-phase1-pm-dialog-file-links-open-in-vscode.md`

## Plans for next session
- Continue the active execution scope from `doc/TODO/Archive/todo-plan-phase1-pm-dialog-file-links-open-in-vscode.md`.
- Read the current cycle context pack listed in `doc/TODO/Archive/todo-plan-phase1-pm-dialog-file-links-open-in-vscode.md` before implementation.
- Start with `Phase 1 / Stream: Dialog Markdown File-Link Interception`.
- Keep the first execution slice dialog-only; do not widen behavior to artifact/help markdown unless the active TODO changes.
- Preserve support for absolute local paths outside the workspace root and keep the preferred open path aligned with the standard VS Code editor API plus standalone `vscode://file` fallback.

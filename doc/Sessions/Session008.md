# Session 008 — Standalone PM File-Link Hotfix Release

**Date:** 2026-04-07 12:09 (CEST)
**Branch:** main
**Version:** 1.1.902
**Execution Scope Status:** COMPLETED

---

# 1. Work Done in This Session

## Work summary
- Finalized the previous `Session007` report and opened a new hotfix scope after the user reproduced the standalone PM regression where dialog file links spawned a second Chromium window with `ERR_UNKNOWN_URL_SCHEME`.
- Kept the existing VS Code-hosted file-open path intact, updated the PM opener priority to prefer launcher bridge handoff in standalone mode, and preserved raw `vscode://file/...` navigation only as a last-resort fallback outside bridge environments.
- Added a dedicated standalone launcher bridge command `codeai://open-in-vscode?...`, intercepted it in the CEF launcher `OnBeforeBrowse`, generated the final `vscode://file/...` URI with optional line/column metadata, and delegated the external open through the OS instead of letting Chromium navigate the URI itself.
- Synced the PM/UI/launcher SSOT docs, prepared release docs for `1.1.902`, and validated the hotfix with `node --import tsx --test src/client/project-manager/services/project-manager-file-link-opener.test.ts`, `npm run build:project-manager`, `npm run typecheck:webview`, targeted `./scripts/build-cef-launcher.sh --launcher-version 1.1.901`, `./scripts/build-all.sh`, and `./scripts/build-release.sh --use-current-version`.
- Archived the completed TODO plan to `doc/TODO/Archive/todo-plan-phase1-standalone-pm-file-link-fallback-fix.md`, archived the planning source to `doc/SolidWorks-WorkFlow/Plans/Archive/ProjectManager_DialogFileLinks_StandaloneFallback_Fix.md`, and updated `doc/SolidWorks-WorkFlow/Docs_Index.md`.

## Git commits
(REFERENCE ONLY: this list is kept for historical traceability and regression investigation; the next session does not need to replay every commit by default.)
- `03fc3a93d docs(session): finalize session007 report`
- `3a2dbfeec docs(pm): plan standalone file link fallback fix`
- `c2c52036e fix(pm): route standalone file links through launcher bridge`
- `decf59ccb fix(launcher): hand off vscode file links externally`
- `562b9c277 docs(pm): sync standalone file link fallback`
- `d7300f60d docs(release): prep standalone file link hotfix release`
- `d07903323 build(release): cut standalone file link hotfix`
- `8fc4b41ab docs(closeout): archive standalone file link hotfix scope`

---

# 2. Instructions for Next Session

**Base SSOT:** `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
**Scope Discovery Index:** `doc/SolidWorks-WorkFlow/Docs_Index.md`

## Plans for next session
- Active execution scope is closed; there is no active `doc/TODO/todo-plan.md`.
- Start with `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` as the base SSOT.
- Discuss the next scope with the user before creating a new planning document.
- Use `doc/SolidWorks-WorkFlow/Docs_Index.md` to choose the relevant documents for the next planning cycle.

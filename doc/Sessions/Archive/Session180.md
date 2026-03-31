# Session 180 — PM Model Label Forced Refresh

**Date:** 2026-03-28 16:55 CET
**Branch:** main
**Version:** 1.1.828

---

# 1. Work Done in This Session

## Work summary
- Investigated the failed `1.1.827` attempt to refresh the lower Project Manager session model label after live model changes.
- Confirmed the real bug was not Gemini-specific runtime selection itself, but PM-side model-source handling: stale settings-derived labels were preserved as if they were runtime overrides, and the standard runtime session view did not subscribe to `session:model:update`.
- Added explicit `settings` vs `runtime` provenance to session `ModelInfo`, kept settings-built model labels marked as `settings`, and marked runtime `session:model:update` replacements as `runtime`.
- Updated shared settings-model sync so only true runtime overrides are preserved; stale settings-era mismatches now refresh correctly after `settings:loaded`.
- Connected the standard Project Manager runtime session view to the existing runtime model sync hook so it behaves like the dialog view.
- Verified the PM/webview surface with `npm run build:webview` and `npm run typecheck:webview`.
- Updated release docs for `1.1.828`, ran `./scripts/build-all.sh`, and then ran `./scripts/build-release.sh --use-current-version` successfully.
- Produced release artefacts `1.1.828` in `~/.codeai-hub/releases/`, `doc/tmp/releases/`, and `codeai-hub-1.1.828.vsix`.
- Left `doc/TODO/todo-plan.md` unchanged; this session was a targeted bugfix/release detour before returning to the active Phase 79 decomposition track.

## Git commits
- `8da081bc fix(pm): separate session model sources`
- `20f61641 docs: prepare 1.1.828 release notes`
- `ed4048b3 chore: release 1.1.828`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/TODO/todo-plan.md`
5. `doc/Sessions/Archive/Session180.md` (THIS REPORT)

> Then open the relevant docs from `doc/SolidWorks-WorkFlow/Clusters/`, `Modules/`, and `Contracts/` for the next active scope.

## Plans for next session
- Validate `1.1.828` against the live model-switch scenario in Project Manager without restarting Core or Project Manager.
- Check both workflow/runtime sessions and dialog sessions to confirm the lower status bar follows the selected provider model across Gemini, Claude, and Codex.
- If the PM model-label bug is closed, return to Phase 79 and continue the remaining `session-request-handler.ts` decomposition seams (`continuity-root` resolution, legacy description-root promotion, then thin-facade cleanup).

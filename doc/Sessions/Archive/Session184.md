# Session 184 — Runtime Model Label Sync Hotfix And Release 1.1.831

**Date:** 2026-03-28 18:50 CET
**Branch:** main
**Version:** 1.1.831

---

# 1. Work Done in This Session

## Work summary
- Investigated the post-`1.1.830` regression where the real provider runtime switched to the new model on the next turn, but the lower Project Manager label stayed on the old model.
- Confirmed the root cause on the Codex path: normal next-turn model changes were applied through the outbound Core turn-config contract, but PM label updates still depended on `session:model:update` arriving from provider-side runtime events that are not guaranteed for regular sends.
- Used the provider-native Codex rollout log under `~/.codeai-hub/providers/codex/home/sessions/...` to verify that the actual turn moved from `gpt-5.3-codex` to `gpt-5.4`, while the UI label lagged behind.
- Fixed the Core send path in `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts` so that regular outbound turns now emit `session:model:update` directly from the applied turn-config payload when the next-turn model is sourced from persisted Settings.
- Added a focused regression test in `packages/core/src/remote-bridge/handlers/session-request-handler.test.ts` to lock the contract: outbound `handleMessage()` must emit `session:model:update` from applied turn config even if the provider does not emit a separate runtime `model_info` or `system` event afterward.
- Synced `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` to reflect that PM runtime label sync now has a Core-owned fallback path from outbound applied turn config, not only provider-originated runtime events.
- Ran targeted verification for the hotfix:
  - `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
  - `npm run build --workspace=@codeai-hub/core`
- Prepared release notes for `1.1.831`, then completed the full release checklist:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- Produced the new verification release artifacts:
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.831.vsix`
  - tarballs: `/Users/oleksandroliinyk/.codeai-hub/releases`
  - mirrored tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases`
- Kept `Phase 81` untouched; the remaining `session-request-handler.ts` carry-over tail is still paused until the user validates `1.1.831`.

## Git commits
- `3a47f2f3 fix(core): broadcast applied runtime model sync`
- `f2e31d3b docs: prepare 1.1.831 release notes`
- `6544ed74 chore: release 1.1.831`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session184.md` (THIS REPORT)

> Then open the relevant Core/provider contracts from `doc/SolidWorks-WorkFlow/System/`, `Modules/`, and `Contracts/` only after the `1.1.831` verification results are known.

## Plans for next session
- First validate release `1.1.831` on the exact scenario that regressed in `1.1.830`: change the provider model in Settings, send the next regular turn, and confirm that the real provider runtime and the lower PM label now switch together.
- If `1.1.831` still exposes any remaining split-brain between UI labels and applied next-turn runtime config, fix that before reopening any `Phase 81` refactor work.
- Only after `1.1.831` is accepted, resume `Phase 81` carry-over work on `session-request-handler.ts`: continuity-root extraction, turn-arbitration extraction, and final thin-facade closure.

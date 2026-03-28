# Session 182 — Settings SSOT Planning And Codex Model Switch Investigation

**Date:** 2026-03-28 17:40 CET
**Branch:** main
**Version:** 1.1.829

---

# 1. Work Done in This Session

## Work summary
- Investigated a real Codex runtime/model-switch mismatch after the `1.1.829` PM label fixes: the Project Manager label could show the new model from Settings while the actual Codex provider session continued to run on the previous model.
- Verified the mismatch against a provider-native Codex JSONL session file at `/Users/oleksandroliinyk/.codeai-hub/providers/codex/home/sessions/2026/03/28/rollout-2026-03-28T17-18-38-019d353d-87c7-79d2-81c5-c6119941ce17.jsonl`, where the effective model remained unchanged across turns.
- Traced the current Codex runtime path and confirmed the main architectural problem: model/reasoning are currently derived in multiple places (`settings` UI snapshot, Core events, provider-local settings reads, cached provider defaults), which creates a split-brain between UI labels and actual runtime application.
- Confirmed that `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` still owns a provider-local `workspaceDefaults` cache and creates thread runtime options from it, while `packages/Codex_Module/src/messaging/message-processor.ts` keeps using the thread object captured for the session lifecycle.
- Reframed the architecture according to the user requirement: persisted Settings must be the single source of truth for `model` / `reasoning` for the next new turn, with Core owning effective config resolution and providers consuming explicit applied config rather than independently reading settings.
- Created a new planning document for this scope: `doc/SolidWorks-WorkFlow/Plans/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`.
- Rewrote `doc/TODO/todo-plan.md` so the work is now split into two ordered phases:
  - `Phase 80` — `Settings SSOT And Next-Turn Model Switching`
  - `Phase 81` — `SessionRequestHandler Carry-Over Tail`
- Moved the old unfinished tail from the previous plan into the new `Phase 81` as explicit carry-over tasks, removing the misleading `IN_PROGRESS` status from the old `Phase 79` tail.
- Added two dedicated release-build streams to the operational plan:
  - an interim release build immediately after `Phase 80` for isolated model-switch verification;
  - a final release build after `Phase 81` for separate full-plan regression testing.
- No code changes to runtime behavior were made yet in this session; the repository is currently in planning state before starting the first implementation stream of `Phase 80`.

## Git commits
- None yet in this session. Current work is planning/documentation only; the first implementation commit should start with `Phase 80` Stream `Core applied-config resolver`.

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Session182.md` (THIS REPORT)

> Then open the relevant Core/provider contracts from `doc/SolidWorks-WorkFlow/System/`, `Modules/`, and `Contracts/` for the active `Phase 80` stream.

## Plans for next session
- Start `Phase 80` with the first micro-task: introduce a single Core resolver for next-turn `model` / `reasoning` derived from persisted Settings and wire it into the Core config path.
- Keep the model-switch scope first; do not return to the `session-request-handler.ts` carry-over tail until `Phase 80` and its interim release build are complete.
- After the Core applied-config resolver lands, continue with explicit remote-bridge threading of applied config, Codex runtime application, removal of provider-local settings truth, PM applied-config sync, and provider parity.

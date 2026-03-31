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
- Created a new planning document for this scope: `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`.
- Rewrote `doc/TODO/todo-plan.md` so the work is now split into two ordered phases:
  - `Phase 80` — `Settings SSOT And Next-Turn Model Switching`
  - `Phase 81` — `SessionRequestHandler Carry-Over Tail`
- Moved the old unfinished tail from the previous plan into the new `Phase 81` as explicit carry-over tasks, removing the misleading `IN_PROGRESS` status from the old `Phase 79` tail.
- Added two dedicated release-build streams to the operational plan:
  - an interim release build immediately after `Phase 80` for isolated model-switch verification;
  - a final release build after `Phase 81` for separate full-plan regression testing.
- Started `Phase 80` and completed the first implementation stream: introduced `packages/core/src/config/provider-turn-config-resolver.ts` as a single Core-owned resolver for Codex/Gemini next-turn defaults from persisted Settings, simplified `packages/core/src/config/index.ts` to consume it, and synchronized `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md` plus `doc/TODO/todo-plan.md`.
- Completed `Phase 80` remote-bridge threading: Core now attaches explicit applied turn config to outbound send/switch paths via `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`, and remote-bridge contracts carry that payload to providers.
- Completed Codex next-turn runtime apply: `packages/Codex_Module/src/messaging/codex-applied-turn-config.ts` now mutates the active thread runtime from Core-applied config immediately before execution, and `packages/Codex_Module/src/messaging/message-processor.ts` strips internal transport metadata before SDK execution.
- Removed the Codex provider-local settings truth path for current model/reasoning: `packages/Codex_Module/src/sdk/codex-sdk-manager.ts` no longer re-reads `settings.json` to decide the current runtime model, and `packages/Codex_Module/src/types/index.ts` now exposes the internal applied-turn payload contract.
- Completed PM applied-config sync: ready session labels now wait for Core-confirmed runtime model events instead of guessing from changed settings, while same-model runtime events can still refresh reasoning labels.
- Aligned Gemini and Claude send paths with the same next-turn model contract: Gemini now consumes Core-applied model override on outbound send, and Claude derives the active turn model from applied turn config instead of re-reading the current model from its local settings snapshot.

## Git commits
- `e19bbdb7 docs(plan): add settings ssot execution scope`
- `9ef3dc2a refactor(core): add provider turn config resolver`
- `32bc0f7d refactor(core): thread applied turn config`
- `4d6226ad refactor(codex): apply next-turn model config`
- `a4ac21c7 refactor(codex): remove local settings truth path`
- `df23290d refactor(pm): sync applied turn config labels`
- `9f243183 refactor(providers): align next-turn config contract`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session182.md` (THIS REPORT)

> Then open the relevant Core/provider contracts from `doc/SolidWorks-WorkFlow/System/`, `Modules/`, and `Contracts/` for the active `Phase 80` stream.

## Plans for next session
- Finish the interim release-build stream for `Phase 80`: update release-facing docs, run `./scripts/build-all.sh`, then `./scripts/build-release.sh --use-current-version`, and capture the new artifacts plus session report.
- Keep the model-switch scope first; do not return to the `session-request-handler.ts` carry-over tail until the dedicated `Phase 80` verification release is built and tested.
- After the interim release is built and tested, resume `Phase 81` carry-over work on `session-request-handler.ts` (`continuity-root`, `turn-arbitration`, thin façade closure).

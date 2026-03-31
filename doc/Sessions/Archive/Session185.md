# Session 185 — Provider-Neutral Model Sync Generalization And Release 1.1.832

**Date:** 2026-03-28 19:57 CET
**Branch:** main
**Version:** 1.1.832

---

# 1. Work Done in This Session

## Work summary
- Closed `Phase 80A` in `doc/TODO/todo-plan.md` as the follow-up to the `1.1.831` Claude/Codex/Gemini split-brain investigation: the plan now explicitly records the provider-neutral generalization stream between `Phase 80` and `Phase 81`.
- Centralized Core provider turn-config resolution behind a shared registry in `packages/core/src/config/provider-turn-config-resolver.ts`, so applied next-turn config is resolved through `byProviderId` instead of growing new `if (providerId === ...)` branches in the remote bridge.
- Added provider model-sync capabilities to the provider registry (`acceptsAppliedTurnConfig`, `syncsLabelFromAppliedConfig`) and used them to gate the outbound bridge contract instead of hardcoded provider checks.
- Unified remote-bridge applied-config attachment and outbound `session:model:update` broadcast into one provider-neutral contract spanning:
  - `packages/core/src/remote-bridge/handlers/session-request-handler-applied-turn-config.ts`
  - `packages/core/src/remote-bridge/handlers/session-request-handler-message-dispatch.ts`
  - `packages/core/src/remote-bridge/types.ts`
- Finished provider-side parity by closing the remaining Gemini gap:
  - `packages/Gemini_Module/src/provider/gemini-applied-turn-config.ts` now stages both `modelId` and `thinkingLevel` from the shared applied envelope.
  - `packages/Gemini_Module/src/session/gemini-session-bootstrapper.ts` and `gemini-session-lifecycle.ts` now keep mutable runtime turn config so existing Gemini sessions can adopt Core-applied model/thinking changes on the next turn.
  - `packages/Gemini_Module/src/session/gemini-session-settings-resolver.ts` now treats Core-provided model/thinking defaults as authoritative over local snapshot values, leaving provider-local `settings.json` only as fallback for non-applied runtime defaults.
- Synced SSOT docs:
  - `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
  - `doc/TODO/todo-plan.md`
  - `README.md`
  - `CHANGELOG.md`
- Ran targeted verification during implementation:
  - `npm run build --workspace=@codeai-hub/core`
  - `node --import tsx --test packages/core/src/remote-bridge/handlers/session-request-handler.test.ts`
  - `npm run build --workspace packages/Gemini_Module`
  - `node --import tsx --test packages/Gemini_Module/src/provider/gemini-provider-adapter.test.ts packages/Gemini_Module/src/session/gemini-turn-runner.test.ts`
- Completed the release flow for `1.1.832`:
  - `./scripts/build-all.sh`
  - `./scripts/build-release.sh --use-current-version`
- Produced release artifacts:
  - VSIX: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/codeai-hub-1.1.832.vsix`
  - tarballs: `/Users/oleksandroliinyk/.codeai-hub/releases`
  - mirrored tarballs: `/Users/oleksandroliinyk/VSCODE/CodeAI-Hub/doc/tmp/releases`

## Git commits
- `8507fea2 refactor(core): centralize provider turn config registry`
- `498cfa62 refactor(core): register provider model sync capabilities`
- `16951a36 refactor(core): unify applied config bridge contract`
- `5b78ce2d refactor(providers): adopt shared applied config contract`
- `97a95e3b chore: release 1.1.832`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/SolidWorks-WorkFlow/Plans/Archive/Settings_SSOT_And_NextTurn_ModelSwitch_Architecture.md`
5. `doc/TODO/todo-plan.md`
6. `doc/Sessions/Archive/Session185.md` (THIS REPORT)

> Then open the relevant Core/provider contracts from `doc/SolidWorks-WorkFlow/System/`, `Modules/`, and `Contracts/` depending on whether the next session is still model-switch verification or the `Phase 81` decomposition tail.

## Plans for next session
- First validate release `1.1.832` against the full model-switch matrix for Claude/Codex/Gemini:
  - fresh session bootstrap path;
  - existing session next-turn path;
  - settings change -> next regular turn -> runtime/log/UI agreement.
- For each provider, confirm that the lower PM label, the real provider runtime/logs (for example JSONL / provider-native session logs), and the applied next-turn model all move together on the same turn.
- If `1.1.832` is accepted, reopen `Phase 81` and start with `Stream: Continuity root carry-over`.
- If any provider still shows split-brain after `1.1.832`, fix that before touching the remaining `session-request-handler.ts` decomposition tail.

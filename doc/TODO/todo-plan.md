# Development TODO Plan

## Execution Rules
- **Required reading (read before each fix):**
  - `doc/SolidWorks-WorkFlow/Contracts/FacadeClassDiagram_DesignAndMaintenance.md`
  - `doc/SolidWorks-WorkFlow/Modules/Codex.md`
  - `doc/SolidWorks-WorkFlow/Plans/Codex_RawRollout_DialogSourceOfTruth_Architecture.md`
- Scope of this plan: migrate Codex user-visible output parsing and replay to provider-native raw rollout JSONL so commentary, thinking, and final-answer semantics no longer depend on the semantically poorer SDK `item.*` stream.
- Each micro-task must stay within `<= 3 files`.
- Every implementation line must be followed by a separate `Git Commit:` line.
- Update docs and this plan in real time after every micro-task.
- Release stream is mandatory because the user validates packaged VSIX builds, not only local source changes.

## Phase 1 — Codex Raw Rollout Dialog Source Of Truth (owner: Codex, updated: 2026-04-05)

### Stream: Planning And Scope
1. [DONE] Create the Codex migration planning intake that formalizes raw rollout provider JSONL as the output source of truth and register it in `doc/SolidWorks-WorkFlow/Docs_Index.md`; scope: `doc/SolidWorks-WorkFlow/Plans/Codex_RawRollout_DialogSourceOfTruth_Architecture.md`, `doc/SolidWorks-WorkFlow/Docs_Index.md`; expected commit message: `docs(plans): define codex raw rollout source of truth`
2. [DONE] Git Commit: `docs(plans): define codex raw rollout source of truth` (hash: `b83f5ee70`)
3. [DONE] Replace the placeholder active `doc/TODO/todo-plan.md` with the sliced execution plan for the Codex raw rollout migration, including a dedicated release stream; scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): slice codex raw rollout migration plan`
4. [TODO] Git Commit: `docs(todo): slice codex raw rollout migration plan` (hash: TBD)

### Stream: Raw Rollout Reader Foundation
1. [DONE] Add a Codex rollout reader that resolves the active raw rollout file for a `providerSessionId` and yields appended JSONL entries without rereading older lines; scope: `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts`; expected commit message: `feat(codex-rollout): add rollout reader`
2. [TODO] Git Commit: `feat(codex-rollout): add rollout reader` (hash: TBD)
3. [TODO] Add session-local tail cursor state so live turns and replay share one dedupe-safe offset contract; scope: `packages/Codex_Module/src/rollout/codex-rollout-tail-state.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`, `packages/Codex_Module/src/session/types.ts`; expected commit message: `feat(codex-rollout): track rollout tail cursors`
4. [TODO] Git Commit: `feat(codex-rollout): track rollout tail cursors` (hash: TBD)

### Stream: Raw Rollout Message Semantics
1. [TODO] Parse provider-native `event_msg` semantics for `agent_reasoning`, `agent_message.phase`, and `task_complete` so commentary/thinking/final-answer boundaries come from rollout metadata rather than text inference; scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`, `packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts`; expected commit message: `feat(codex-rollout): parse rollout message phases`
2. [TODO] Git Commit: `feat(codex-rollout): parse rollout message phases` (hash: TBD)
3. [TODO] Add rollout-derived segment ids and dedupe keys so the same provider event cannot be re-emitted through reconnect or replay; scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`, `packages/Codex_Module/src/rollout/codex-rollout-dedupe.ts`, `packages/Codex_Module/src/rollout/codex-rollout-dedupe.test.ts`; expected commit message: `feat(codex-rollout): dedupe rollout segments`
4. [TODO] Git Commit: `feat(codex-rollout): dedupe rollout segments` (hash: TBD)

### Stream: Dialog Cutover
1. [TODO] Start and stop raw rollout tailing from the Codex messaging pipeline so live dialog segments are sourced from rollout while the SDK remains send/control-plane only; scope: `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/messaging/codex-event-stream-consumer.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`; expected commit message: `feat(codex-rollout): stream dialog from rollout`
2. [TODO] Git Commit: `feat(codex-rollout): stream dialog from rollout` (hash: TBD)
3. [TODO] Replace SDK `agent_message`-based commentary/thinking handling in the router with rollout-backed normalization so `commentary` can never again surface as `thinking`; scope: `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/messaging/codex-session-event-emitter.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit message: `fix(codex-rollout): preserve commentary and final answer semantics`
4. [TODO] Git Commit: `fix(codex-rollout): preserve commentary and final answer semantics` (hash: TBD)
5. [TODO] Retire redundant SDK feedback mirroring for dialog purposes and keep `sdk-codex-*.jsonl` diagnostics-only; scope: `packages/Codex_Module/src/logging/session-logger.ts`, `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit message: `refactor(codex-rollout): drop sdk dialog feedback duplication`
6. [TODO] Git Commit: `refactor(codex-rollout): drop sdk dialog feedback duplication` (hash: TBD)

### Stream: Regression And Replay
1. [TODO] Cover the reported Codex second-turn Description trace so commentary, thinking, and final answer remain separated under the rollout-backed parser; scope: `packages/Codex_Module/src/messaging/message-processor.commentary-phase.test.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit message: `test(codex-rollout): cover commentary phase routing`
2. [TODO] Git Commit: `test(codex-rollout): cover commentary phase routing` (hash: TBD)
3. [TODO] Cover replay/resume so rollout-derived segments restore without duplicates and the previous empty-terminal-answer regression remains green; scope: `packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts`, `packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts`, `packages/Codex_Module/src/messaging/message-processor.replay.test.ts`; expected commit message: `test(codex-rollout): guard replay and empty terminal recovery`
4. [TODO] Git Commit: `test(codex-rollout): guard replay and empty terminal recovery` (hash: TBD)
5. [TODO] Run targeted Codex verification and record the concrete results in this plan; scope: targeted `tsx` / `node:test` commands and `npm run build --workspace @codeai-hub/codex-module`; expected commit message: verification only

### Stream: Release Build
1. [TODO] Update release-facing docs for the next Codex raw rollout patch release from a clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare codex raw rollout migration notes`
2. [TODO] Git Commit: `docs(release): prepare codex raw rollout migration notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh` on a clean tree and prepare the next patch release artifacts for the Codex raw rollout migration; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): assemble codex raw rollout release`
4. [TODO] Git Commit: `build(release): assemble codex raw rollout release` (hash: TBD)
5. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed migration plan, restore a new placeholder active `todo-plan.md`, and record the release session report; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session048.md`; expected commit message: `docs(session): record codex raw rollout release`
6. [TODO] Git Commit: `docs(session): record codex raw rollout release` (hash: TBD)

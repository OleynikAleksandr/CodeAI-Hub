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
4. [DONE] Git Commit: `docs(todo): slice codex raw rollout migration plan` (hash: `97ce5514f`)

### Stream: Raw Rollout Reader Foundation
1. [DONE] Add a Codex rollout reader that resolves the active raw rollout file for a `providerSessionId` and yields appended JSONL entries without rereading older lines; scope: `packages/Codex_Module/src/rollout/codex-rollout-reader.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts`; expected commit message: `feat(codex-rollout): add rollout reader`
2. [DONE] Git Commit: `feat(codex-rollout): add rollout reader` (hash: `25bb247a2`)
3. [DONE] Add session-local tail cursor state so live turns and replay share one dedupe-safe offset contract; scope: `packages/Codex_Module/src/rollout/codex-rollout-tail-state.ts`, `packages/Codex_Module/src/session/types.ts`; expected commit message: `feat(codex-rollout): track rollout tail cursors`
4. [DONE] Git Commit: `feat(codex-rollout): track rollout tail cursors` (hash: `f0128530e`)

### Stream: Execution Reslice Maintenance
1. [DONE] Re-slice the remaining rollout migration streams so each subsequent micro-task stays within the `<= 3 files` rule, including real-time `todo-plan` updates; scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): reslice codex rollout execution streams`
2. [DONE] Git Commit: `docs(todo): reslice codex rollout execution streams` (hash: `ff083918c`)

### Stream: Raw Rollout Message Semantics
1. [DONE] Parse provider-native `event_msg` semantics for `agent_reasoning`, `agent_message.phase`, and `task_complete` so commentary/thinking/final-answer boundaries come from rollout metadata rather than text inference; scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`, `packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts`; expected commit message: `feat(codex-rollout): parse rollout message phases`
2. [DONE] Git Commit: `feat(codex-rollout): parse rollout message phases` (hash: `137758c54`)
3. [DONE] Add stable rollout segment ids and a session-local dedupe registry so live rollout sync can suppress repeated provider events without depending on SDK item ids; scope: `packages/Codex_Module/src/rollout/codex-rollout-event-parser.ts`, `packages/Codex_Module/src/rollout/codex-rollout-dedupe.ts`; expected commit message: `feat(codex-rollout): add rollout segment ids`
4. [DONE] Git Commit: `feat(codex-rollout): add rollout segment ids` (hash: `162ab7ab1`)
5. [TODO] Cover repeated rollout reads and repeated parsed segments so the dedupe contract stays stable under reconnect-style reprocessing; scope: `packages/Codex_Module/src/rollout/codex-rollout-dedupe.test.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts`; expected commit message: `test(codex-rollout): cover rollout dedupe`
6. [TODO] Git Commit: `test(codex-rollout): cover rollout dedupe` (hash: TBD)

### Stream: Dialog Cutover
1. [DONE] Add a rollout live-sync coordinator that reads appended raw rollout entries and normalizes them into the existing emitter / structured-output contract; scope: `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`; expected commit message: `feat(codex-rollout): add live rollout sync`
2. [DONE] Git Commit: `feat(codex-rollout): add live rollout sync` (hash: `88550b161`)
3. [DONE] Trigger rollout sync during SDK event consumption and terminal turn drain so final rollout segments are read before turn closure while SDK stays send/control-plane only; scope: `packages/Codex_Module/src/messaging/codex-event-stream-consumer.ts`, `packages/Codex_Module/src/messaging/message-processor.ts`, `packages/Codex_Module/src/rollout/codex-rollout-live-sync.ts`; expected commit message: `feat(codex-rollout): poll rollout during turn lifecycle`
4. [DONE] Git Commit: `feat(codex-rollout): poll rollout during turn lifecycle` (hash: `2531607ec`)
5. [DONE] Retire SDK `reasoning` and `agent_message` user-visible routing from the router so commentary/final-answer semantics come only from rollout-backed normalization; scope: `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit message: `fix(codex-rollout): prefer rollout dialog routing`
6. [DONE] Git Commit: `fix(codex-rollout): prefer rollout dialog routing` (hash: `b407e7ce7`)
7. [DONE] Fence `sdk-codex-*.jsonl` into diagnostics-only status and drop dialog-source assumptions from Codex runtime logging paths; scope: `packages/Codex_Module/src/logging/session-logger.ts`; expected commit message: `refactor(codex-rollout): keep sdk feedback diagnostics only`
8. [DONE] Git Commit: `refactor(codex-rollout): keep sdk feedback diagnostics only` (hash: `2577914a6`)

### Stream: Regression And Replay
1. [DONE] Cover the reported Codex second-turn Description trace so commentary, thinking, and final answer remain separated under the rollout-backed parser; scope: `packages/Codex_Module/src/messaging/message-processor.commentary-phase.test.ts`, `packages/Codex_Module/src/messaging/message-processor.test.ts`; expected commit message: `test(codex-rollout): cover commentary phase routing`
2. [DONE] Git Commit: `test(codex-rollout): cover commentary phase routing` (hash: `84151f9c5`)
3. [DONE] Cover replay/resume so rollout-derived segments restore without duplicates under the new live-sync path; scope: `packages/Codex_Module/src/messaging/message-processor.replay.test.ts`, `packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts`; expected commit message: `test(codex-rollout): guard rollout replay resume`
4. [DONE] Git Commit: `test(codex-rollout): guard rollout replay resume` (hash: `d456d7524`)
5. [DONE] Keep the previous empty-terminal-answer recovery green after the rollout cutover; scope: `packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts`; expected commit message: `test(codex-rollout): preserve empty terminal recovery`
6. [DONE] Git Commit: `test(codex-rollout): preserve empty terminal recovery` (hash: `5d8d096d8`)
7. [DONE] Restore the missing pending assistant typing in the SDK fallback router so targeted Codex compilation succeeds before release verification; scope: `packages/Codex_Module/src/messaging/codex-stream-event-router.ts`; expected commit message: `fix(codex-rollout): restore router compile typing`
8. [DONE] Git Commit: `fix(codex-rollout): restore router compile typing` (hash: `ccceb41d7`)
9. [DONE] Run targeted Codex verification and record the concrete results in this plan; scope: `doc/TODO/todo-plan.md`; expected commit message: `docs(todo): record codex rollout verification`
   Verification result: `npm exec -- tsx --test packages/Codex_Module/src/messaging/message-processor.commentary-phase.test.ts packages/Codex_Module/src/messaging/message-processor.replay.test.ts packages/Codex_Module/src/messaging/message-processor.empty-terminal.test.ts packages/Codex_Module/src/messaging/message-processor.test.ts packages/Codex_Module/src/rollout/codex-rollout-reader.test.ts packages/Codex_Module/src/rollout/codex-rollout-event-parser.test.ts` -> `21/21` tests passed.
   Verification result: `npm run build --workspace @codeai-hub/codex-module` -> passed.
10. [TODO] Git Commit: `docs(todo): record codex rollout verification` (hash: TBD)

### Stream: Release Build
1. [TODO] Update release-facing docs for the next Codex raw rollout patch release from a clean pre-build tree; scope: `README.md`, `CHANGELOG.md`, `doc/TODO/todo-plan.md`; expected commit message: `docs(release): prepare codex raw rollout migration notes`
2. [TODO] Git Commit: `docs(release): prepare codex raw rollout migration notes` (hash: TBD)
3. [TODO] Run `./scripts/build-all.sh` on a clean tree and prepare the next patch release artifacts for the Codex raw rollout migration; scope: versioned manifests, package versions, `package-lock.json`, release caches; expected commit message: `build(release): assemble codex raw rollout release`
4. [TODO] Git Commit: `build(release): assemble codex raw rollout release` (hash: TBD)
5. [TODO] Run `./scripts/build-release.sh --use-current-version`, archive the completed migration plan, restore a new placeholder active `todo-plan.md`, and record the release session report; scope: `doc/TODO/Archive/*`, `doc/TODO/todo-plan.md`, `doc/Sessions/Session048.md`; expected commit message: `docs(session): record codex raw rollout release`
6. [TODO] Git Commit: `docs(session): record codex raw rollout release` (hash: TBD)

# Session 62 — Claude `/context` token usage still shows 0/200k

**Date:** 2026-02-01 16:35 (CET)
**Branch:** main
**Version:** 1.1.485

---

# 1. Work Done in This Session

## Work summary
- Shipped Claude token usage implementation that targets parity with Claude Code CLI `/context` (used/limit), plus hotfixes (cwd resolution + PATH/node runner).
- Built and installed multiple releases during debugging: 1.1.483 → 1.1.484 → 1.1.485.
- Problem persists in UI Session panel after installing 1.1.485: tokens stay at `0 / 200,000 (100%)` and do not update after new messages.
- Verified that Claude Code CLI can return a correct snapshot for the same session when run manually from the correct project cwd:
  - `claude -p --verbose --output-format stream-json --resume <sessionId> "/context"`.
- Re-checked Core logs: the `/context` reader fails at runtime, so no `tokenUsage` snapshot reaches the UI.

## Observations (evidence)
- Core log shows repeated warnings for the same Claude provider session:
  - `Claude /context token read failed ...`.
  - Early attempts were executed as `~/.npm-global/bin/claude ... /context` and failed without useful stderr.
  - After the node-runner hotfix, Core log shows failure with `code=143`, which strongly suggests the process was terminated (SIGTERM), consistent with hitting a timeout.
- Current implementation in `packages/Claude_Module/src/sdk/claude-context-usage-reader.ts` uses `execFile` with `timeout: 15_000`.
  - Hypothesis: in the real Core environment `/context` sometimes takes >15s, so our call is killed before it can print the `Tokens: used/limit (...)` snapshot.
- Reviewer Agent file edits (used as a "poke" to generate activity) did not change the situation: UI still shows 0.

## Git commits
- `a2724c16 feat(claude-module): read context usage via /context`
- `f49c925d fix(ui): align claude tokens with /context`
- `c2f088bf chore(release): build next version`
- `51197299 fix(claude-module): resolve /context cwd via sessions-index`
- `dc67cab9 chore(release): build next version`
- `38c2e546 fix(claude-module): run claude via node to avoid PATH issues`
- `2d21d32d chore(release): build next version`
- `c7d6dac0 docs(todo): record Phase 84 hotfix2 release hash`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-Flow/System/SystemArchitecture.md`
2. `doc/SolidWorks-Flow/TokenUsage/ClaudeTokenUsage_Architecture.md`
3. `doc/TODO/todo-plan.md`
4. `doc/Sessions/Session062.md` (THIS REPORT)

## Debug / next steps
- Confirm from `~/.codeai-hub/logs/core/core.log` that `/context` failures correlate with `code=143` (SIGTERM) and measure the actual runtime.
- Increase `/context` reader robustness:
  - raise timeout substantially (e.g. 60–120s) OR switch to streaming `spawn` + early-exit as soon as `Tokens:` is observed.
  - add structured logging for start/end/duration/cwd + stderr on failure.
- Add a safe fallback when `/context` fails (avoid rendering `0`): show last known snapshot or display `N/A` until a snapshot is available.


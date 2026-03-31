# Session 187 — Stop Contract Replan After Gemini Stall

**Date:** 2026-03-29 10:10 CEST
**Branch:** main
**Version:** 1.1.833

---

# 1. Work Done in This Session

## Work summary
- Continued from the accepted `1.1.833` release baseline and investigated the fresh Gemini failure reported during manual release testing.
- No code implementation was started in this session; this was a diagnostics + architecture/planning handoff session.
- Confirmed the Gemini failure shape from runtime logs:
  - Gemini logical session: `1ddc259b-2f91-4ba8-b6c8-c7dcb25e141e`
  - Gemini provider session: `a213fe63-64f7-4f8a-bbcc-1fe82c583b28`
  - SDK log: `~/.codeai-hub/logs/gemini/sdk-gemini-a213fe63-64f7-4f8a-bbcc-1fe82c583b28.jsonl`
  - Unified session JSONL: `~/.codeai-hub/sessions/-Users-oleksandroliinyk-VSCODE-CodeAI-Hub-gemini/geminiCli/gemini-1ddc259b-2f91-4ba8-b6c8-c7dcb25e141e-description.jsonl`
  - Core log: `~/.codeai-hub/logs/core/core.log`
  - Launcher log: `~/.codeai-hub/logs/launcher/launcher.log`
- The confirmed runtime symptom:
  - the second Gemini test turn reached `model_info`;
  - no `finished` event followed;
  - no explicit provider `error` followed;
  - the unified session history stopped on the user message `Еще один точно такой же тест.`;
  - the dialog remained visually stuck in `Agent is working... Please wait.`.
- Important distinction confirmed from logs:
  - this incident was **not** captured as a Core crash trace for that turn;
  - `core.log` instead shows `Shutdown request received via API`;
  - therefore the Core process ended via shutdown path, not via an uncaught exception during that stuck Gemini turn.
- The user then clarified the intended product behavior and this was accepted as the design baseline for the next implementation session:
  - `Stop` in Session UI must **not** stop Core runtime;
  - `Stop` must only stop the current turn or force-unlock the current stuck session;
  - the logical session must survive;
  - if the underlying provider transcript is tainted after stop, MVP may create a fresh provider session and rebind it to the same logical session on the next send;
  - cleanup of old partial provider transcript / old raw JSONL is explicitly out of scope for the MVP fix.
- Registered the new bug:
  - `BUG-2026-03-29-01` in `doc/BugRegistry.md`
- Archived the completed previous implementation plan:
  - `doc/TODO/todo-plan.md` -> `doc/TODO/Archive/todo-plan-up-to-phase81-release-1.1.833-2026-03-29.md`
- Created a dedicated planning doc for the new scope:
  - `doc/SolidWorks-WorkFlow/Plans/Archive/SessionTurnStop_And_Core_Independence_Architecture.md`
- Created a new active execution plan:
  - `doc/TODO/todo-plan.md`
  - phases prepared:
    - `Phase 82` — Stop contract + UI/bridge reframing
    - `Phase 83` — Core session stop + rebind semantics
    - `Phase 84` — Gemini stalled-turn recovery
    - `Phase 85` — final release build after linked phases
- Left the worktree intentionally dirty with documentation/planning-only changes and no code changes:
  - `doc/BugRegistry.md`
  - `doc/TODO/todo-plan.md`
  - `doc/SolidWorks-WorkFlow/Plans/Archive/SessionTurnStop_And_Core_Independence_Architecture.md`
  - `doc/TODO/Archive/todo-plan-up-to-phase81-release-1.1.833-2026-03-29.md`
  - this session report file

## Git commits
- No new commits were created in this session. This session intentionally stopped at diagnostics and planning handoff.
- For context restoration before implementation, review the carried-forward baseline commits from the completed `1.1.833` release work:
  - `26ac832b chore: release post-plan verification build`
  - `18d28ee6 refactor(core): thin session request handler facade`
  - `c2e10c0a refactor(core): extract session request runtime graph`
  - `89000d13 refactor(core): extract session request turn arbitration`
  - `a6853cbb refactor(core): extract session request continuity root`

---

# 2. Instructions for Next Session

## Required documents to review before work
1. `doc/SolidWorks-WorkFlow/README.md`
2. `doc/SolidWorks-WorkFlow/Docs_Index.md`
3. `doc/SolidWorks-WorkFlow/System/SystemArchitecture.md`
4. `doc/BugRegistry.md`
5. `doc/SolidWorks-WorkFlow/Contracts/SessionUI_Behavior.md`
6. `doc/SolidWorks-WorkFlow/Plans/Archive/SessionTurnStop_And_Core_Independence_Architecture.md`
7. `doc/TODO/todo-plan.md`
8. `doc/TODO/Archive/todo-plan-up-to-phase81-release-1.1.833-2026-03-29.md`
9. `doc/Sessions/Archive/Session186.md`
10. `doc/Sessions/Archive/Session187.md` (THIS REPORT)

> After that, inspect the carry-forward baseline commits listed above with `git show --stat <hash>` and `git show <hash>`.

## Plans for next session
- Start implementation from `Phase 82 / Stream: Contract reset for Stop semantics`.
- Do not start coding before synchronizing the active SSOT/contract docs with the accepted product decision:
  - Session `Stop` means turn cancel / stuck unlock only.
  - Session `Stop` never means Core shutdown.
- Then implement the session-scoped stop bridge command (`session:stop`) before touching Gemini-specific recovery logic.
- Core implementation target for the first linked block:
  - keep the logical session alive;
  - invalidate/close only the current provider binding when stop is triggered;
  - on the next send, create a fresh provider session and rebind if the old binding is no longer trustworthy.
- Gemini-specific follow-up target:
  - recover silent stalled turns that emit `model_info` but never emit terminal events;
  - return the session to a recoverable/unlocked state instead of leaving it forever in `working`.
- Preserve the explicit MVP boundary accepted by the user:
  - do not attempt transcript cleanup of old provider JSONL / raw SDK logs;
  - it is acceptable for the old partial transcript to remain as historical noise if a fresh provider session is rebound for the next send.
- Keep `Phase 85` as a mandatory final release build phase after `Phase 82`–`Phase 84`; release-facing docs must be updated before the final build.
- Because this session produced no commits, the next session starts from a dirty docs-only tree; commit discipline must resume from the first micro-task of the new plan.

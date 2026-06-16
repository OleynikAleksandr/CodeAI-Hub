# DevelopmentOrderPlan Agent-Fill Validator Hotfix

**Status:** Accepted by user bug report on 2026-06-15.
**Scope type:** bugfix / managed workflow validation.

## Problem

Release `1.2.523` can trap a lead Product Part agent in repeated repair loops for `DevelopmentOrderPlan.draft.md`.

Observed in FinderWidget-Test01:

- Core rejected the same lead Product Part `DevelopmentOrderPlan` nine times.
- The only diagnostic was `DevelopmentOrderPlan.draft.md: draft content is incomplete.`
- The Markdown artifact contained filled `<!-- agent-fill -->` blocks and no sentinel text.
- Core's validator currently treats any `agent-fill` marker as incomplete because `SENTINEL_RE` matches both `CODEAI_AGENT_FILL_SENTINEL` and `agent-fill`.

This makes the diagnostic misleading and gives the agent no actionable repair instruction.

Follow-up user testing exposed a second deadlock in the same scenario:

- the user pressed `Stop` during the repeated managed repair loop;
- the provider stopped producing output;
- the Project Manager session input stayed locked as `Agent is working... Please wait`;
- the user could not type a manual correction to recover the session.

`Stop` must release the session input for the stopped logical session even when the active turn was a Core-managed repair continuation.

Release `1.2.524` user testing exposed a third Stop/input deadlock in the
Description step, but the underlying rule is provider/stage neutral:

- the user pressed `Stop` during a GLM-Claude-Code Description turn;
- provider output stopped;
- the visible session still showed the last `Thinking` bubble;
- Project Manager kept the input locked as `Agent is working... Please wait`.

Stop must unlock the input for every workflow step when Core has stopped the
turn and invalidated/rebound the provider binding; stale visible thinking text
must not be treated as an active turn forever.

## Scope

1. Keep rejecting actual sentinel residue.
2. Allow filled `agent-fill` wrapper comments in `DevelopmentOrderPlan.draft.md`.
3. Improve diagnostics so future repair prompts name the exact formal issue.
4. Add focused regression coverage for filled agent-fill wrappers versus real sentinel residue.
5. Fix Stop handling for managed repair sessions so a stopped turn cannot leave the input panel locked.
6. Add focused regression coverage for Stop-driven input release in the managed repair scenario.
7. Fix shared input-state derivation so a stopped non-ready binding with a stale thinking bubble does not keep any step input locked.
8. Add focused UI regression coverage for the stage-neutral Stop unlock scenario.

## Out of Scope

- Reworking the Development Order Plan schema.
- Changing provider-specific behavior for GLM/Kimi/Gemini/Claude/Codex.
- Changing the Development Tree downstream execution model.

## Verification

- Targeted Core test for Product Part Development Order Plan validation.
- Targeted Core test for Stop releasing managed repair session input.
- Targeted UI/session-state test for stale thinking after Stop.
- `npm run build --workspace=@codeai-hub/core`.
- `npm run typecheck:webview`.
- Plan validation and standard commit hooks.

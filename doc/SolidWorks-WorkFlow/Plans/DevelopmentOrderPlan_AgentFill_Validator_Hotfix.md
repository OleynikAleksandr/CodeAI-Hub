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

## Scope

1. Keep rejecting actual sentinel residue.
2. Allow filled `agent-fill` wrapper comments in `DevelopmentOrderPlan.draft.md`.
3. Improve diagnostics so future repair prompts name the exact formal issue.
4. Add focused regression coverage for filled agent-fill wrappers versus real sentinel residue.

## Out of Scope

- Reworking the Development Order Plan schema.
- Changing provider-specific behavior for GLM/Kimi/Gemini/Claude/Codex.
- Building a release before explicit user confirmation.

## Verification

- Targeted Core test for Product Part Development Order Plan validation.
- `npm run build --workspace=@codeai-hub/core`.
- Plan validation and standard commit hooks.

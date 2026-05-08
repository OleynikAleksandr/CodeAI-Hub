# Claude Core Feedback Lifecycle Fix

**Status:** Active planning source
**Created:** 2026-05-08
**Owner:** Codex

## Problem

Claude workflow sessions expose several Core lifecycle problems during managed
documentation stages:

- Core feedback reports aggregate Diagram Modules failure without the exact
  validator reason for each invalid Product Part.
- Managed Git dirty-state feedback is mixed with semantic artifact validation,
  so the agent treats a Core-owned commit gate as a file-format problem.
- Deferred Core feedback can appear in the UI after the next turn has already
  started streaming reasoning.
- The user input can briefly unlock between provider turn completion and the
  Core post-turn acceptance/feedback cycle.

The fix must be runtime-level. Prompt templates are useful as a second layer,
but Core must expose precise executable validation diagnostics and keep the UI
locked across Core-owned post-turn processing.

## Target Behavior

1. Diagram Modules progress keeps per-part validation diagnostics, including the
   missing file or exact validator error.
2. Acceptance feedback separates:
   - semantic artifact validation failures;
   - Core-owned pending commit / dirty-state gate;
   - out-of-owner dirty files.
3. Core feedback no longer tells agents to commit or clean Core-owned files.
4. Deferred Core user messages are visible before the next reasoning stream is
   rendered.
5. Session input remains locked while Core post-turn acceptance, commit, and
   feedback dispatch are pending.

## Implementation Notes

- Reuse `normalizeAndValidateWorkflowStageArtifact` as the executable contract.
- Do not add a second prompt-only validator.
- Keep managed plan sentinel tasks intact; acceptance must be derived from
  workflow progress and Git state, not from the presence of a final
  `IN_PROGRESS` recovery anchor.
- Prefer focused tests around the Core handler seams that already reproduce the
  current behavior.

## Verification Notes

- 2026-05-08: Targeted Core lifecycle tests passed for Diagram Modules
  diagnostics, managed acceptance feedback, deferred user-message ordering, and
  provider event routing:
  `npx tsx --test packages/core/src/remote-bridge/handlers/diagram-modules-progress.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.test.ts packages/core/src/remote-bridge/handlers/workflow-agent-acceptance-feedback.diagram-modules.test.ts packages/core/src/remote-bridge/handlers/session-request-handler-event-messages.test.ts packages/core/src/remote-bridge/handlers/session-provider-event-router.test.ts`.
- 2026-05-08: Affected Core build passed:
  `npm run build --workspace=@codeai-hub/core`.

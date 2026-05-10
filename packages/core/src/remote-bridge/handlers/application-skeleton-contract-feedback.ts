import type { ApplicationSkeletonGuardDecision } from "./application-skeleton-contract-guard";

// Pure prompt-builder for Phase 1A corrective feedback.
//
// Decision ownership stays in the post-turn arbitration contract; this module
// only produces the content-readiness wording the agent receives. It must not
// own state, must not dispatch messages, and must not ask the agent to run
// Git, staging, or plan commands (Core owns the managed commit boundary).

export const buildApplicationSkeletonRepairFeedbackMessage = (
  decision: ApplicationSkeletonGuardDecision
): string | null => {
  if (decision.kind === "repair_no_progress") {
    return [
      "Core gated Phase 1A: turn ended without owned diff in the Application Skeleton scope.",
      "",
      "Phase 1A is the Core-gated initial contract draft. Either:",
      "- produce both `application-skeleton.md` and `application-skeleton-map.json` as a complete draft, or",
      "- end the turn with a one-line blocker note that Core can surface to the user.",
      "",
      "Content-readiness only: do not run Git, staging, or plan commands. Core owns the managed commit boundary.",
    ].join("\n");
  }
  if (decision.kind === "repair_invalid_draft") {
    return [
      "Core gated the Phase 1A draft as structurally invalid.",
      "",
      "Issues to repair in the next turn:",
      ...decision.details.map((entry) => `- ${entry}`),
      "",
      "Re-emit a complete `application-skeleton.md` and a parseable `application-skeleton-map.json` mapping.",
      "Content-readiness only: do not run Git, staging, or plan commands. Core owns the managed commit boundary.",
    ].join("\n");
  }
  return null;
};

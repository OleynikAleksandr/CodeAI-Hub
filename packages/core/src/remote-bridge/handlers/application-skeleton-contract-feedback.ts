import type { ApplicationSkeletonGuardDecision } from "./application-skeleton-contract-guard";

// Pure prompt-builder for Phase 1A corrective feedback.
//
// Decision ownership stays in the post-turn arbitration contract; this module
// only produces the content-readiness wording the agent receives. It must not
// own state, must not dispatch messages, and must not ask the agent to run
// Git, staging, or plan commands while the orchestration rewrite boundary is active.

export const buildApplicationSkeletonRepairFeedbackMessage = (
  decision: ApplicationSkeletonGuardDecision
): string | null => {
  if (decision.kind === "repair_no_progress") {
    return [
      "Application Skeleton rewrite boundary: turn ended without owned diff in the Application Skeleton scope.",
      "",
      "Phase 1A is limited to the initial contract draft. Either:",
      "- produce both `application-skeleton.md` and `application-skeleton-map.json` as a complete draft, or",
      "- end the turn with a one-line blocker note for the user.",
      "",
      "Content-readiness only: do not run Git, staging, or plan commands. Report readiness or a blocker only.",
    ].join("\n");
  }
  if (decision.kind === "repair_invalid_draft") {
    return [
      "Application Skeleton rewrite boundary: the Phase 1A draft is structurally invalid.",
      "",
      "Issues to repair in the next turn:",
      ...decision.details.map((entry) => `- ${entry}`),
      "",
      "Re-emit a complete `application-skeleton.md` and a parseable `application-skeleton-map.json` mapping.",
      "Content-readiness only: do not run Git, staging, or plan commands. Report readiness or a blocker only.",
    ].join("\n");
  }
  return null;
};

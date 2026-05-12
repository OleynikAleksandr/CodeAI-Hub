import type { QualityGatesGuardDecision } from "./quality-gates-contract-guard";

export const buildQualityGatesRepairFeedbackMessage = (
  decision: QualityGatesGuardDecision
): string | null => {
  if (decision.kind === "repair_no_progress") {
    return [
      "Core gated Phase 1 Draft: turn ended without owned diff in the Quality Gates scope.",
      "",
      "Phase 1 is the Core-gated initial contract draft. Either:",
      "- produce both `quality-gates.md` and `quality-gates.json` as a complete draft, or",
      "- end the turn with a one-line blocker note that Core can surface to the user.",
      "",
      "Content-readiness only: do not run Git, staging, or plan commands. Core owns the managed commit boundary.",
    ].join("\n");
  }
  if (decision.kind === "repair_invalid_draft") {
    return [
      "Core gated the Phase 1 Draft as structurally invalid.",
      "",
      "Issues to repair in the next turn:",
      ...decision.details.map((entry) => `- ${entry}`),
      "",
      "Re-emit a complete `quality-gates.md` and a parseable `quality-gates.json` with a commands object keyed by gate id.",
      "Leave `accepted: false` and `integrated: false` in the draft phase.",
      "Content-readiness only: do not run Git, staging, or plan commands. Core owns the managed commit boundary.",
    ].join("\n");
  }
  if (decision.kind === "repair_premature_integration") {
    return [
      "Core gated Phase 1 Draft: integration-owned paths changed before the Quality Gates contract was accepted.",
      "",
      "Blocked paths:",
      ...decision.blockedPaths.map((entry) => `- ${entry}`),
      "",
      "Revert the integration changes and limit Phase 1 work to the canonical draft artifacts. Core injects the integration prompt only after the `docs: accept quality gates contract` commit.",
    ].join("\n");
  }
  return null;
};

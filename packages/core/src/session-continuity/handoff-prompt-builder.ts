import { normalizeContinuityStageId } from "./continuity-types";

export const buildHandoffPrompt = (options: {
  readonly agentId: string;
  readonly stageId: string | null | undefined;
  readonly reportPath: string;
}): string => {
  const stage = normalizeContinuityStageId(options.stageId);
  return [
    `You are preparing a handoff report for agent: ${options.agentId}.`,
    `Stage: ${stage}.`,
    "",
    "Output ONLY the markdown report body (no fences, no extra commentary).",
    "Use this exact structure:",
    "# Handoff Report — <agentId> / <stageId>",
    "## Current Objective",
    "## Work Summary",
    "## Decisions",
    "## Open Questions / Risks",
    "## Next Steps (ordered)",
    "## Key Files & Paths",
    "## Commands Run",
    "",
    `The report will be saved by the system to: ${options.reportPath}.`,
  ].join("\n");
};

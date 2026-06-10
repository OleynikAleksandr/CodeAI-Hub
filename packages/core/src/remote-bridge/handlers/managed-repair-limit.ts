const MANAGED_REPAIR_ATTEMPT_LIMIT = 3;

export const isRepairAttemptLimitReached = (attemptNumber: number): boolean =>
  attemptNumber > MANAGED_REPAIR_ATTEMPT_LIMIT;

export const buildRepairLimitReviewMessage = (
  stageLabel: string,
  diagnostics: readonly string[]
): { readonly content: string; readonly tag: string } => ({
  content: [
    `Core reached the repair attempt limit (${MANAGED_REPAIR_ATTEMPT_LIMIT}) for ${stageLabel}.`,
    "The artifact is opened for review as is. Confirm to accept it with the remaining warnings and continue, or describe the corrections you want the agent to make.",
    ...(diagnostics.length > 0
      ? ["", "Remaining diagnostics:", ...diagnostics.map((d) => `- ${d}`)]
      : []),
  ].join("\n"),
  tag: "managed-workflow-user-review",
});

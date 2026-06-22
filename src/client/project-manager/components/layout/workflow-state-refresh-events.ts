const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const shouldRefreshWorkflowStateForCoreEvent = (message: {
  readonly payload?: unknown;
  readonly type?: string;
}): boolean => {
  if (message.type !== "session:message" || !isRecord(message.payload)) {
    return false;
  }
  if (
    message.payload.stage === null &&
    message.payload.runSlug === null &&
    message.payload.initiativeSlug === null
  ) {
    return false;
  }
  return (
    message.payload.role === "user" ||
    message.payload.tag === "managed-workflow-user-review" ||
    message.payload.tag === "managed-workflow-complete"
  );
};

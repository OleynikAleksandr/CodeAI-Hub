const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readWorkflowControl = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | null => {
  if (!(turnOptions && isRecord(turnOptions.workflowControl))) {
    return null;
  }
  return turnOptions.workflowControl;
};

export const shouldHideUserMessage = (
  turnOptions?: Record<string, unknown>
): boolean => {
  const workflowControl = readWorkflowControl(turnOptions);
  return workflowControl?.visibility === "hidden";
};

export const stripInternalWorkflowTurnOptions = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | undefined => {
  if (!turnOptions) {
    return;
  }
  const {
    outputSchema: _ignoredOutputSchema,
    workflowControl: _ignoredWorkflowControl,
    ...rest
  } = turnOptions;
  return Object.keys(rest).length > 0 ? rest : undefined;
};

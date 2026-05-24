const PLANNED_REQUIRED_KEY = "plannedRequiredAfterIntegration";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readStringArray = (
  value: Record<string, unknown>,
  key: string
): readonly string[] =>
  Array.isArray(value[key])
    ? value[key].filter((item): item is string => typeof item === "string")
    : [];

const readDesiredStatus = (gate: Record<string, unknown>): string | null => {
  const status = gate.desiredStatus ?? gate.status;
  return typeof status === "string" ? status : null;
};

const hasPlannedIntegrationPaths = (gate: Record<string, unknown>): boolean =>
  Array.isArray(gate.plannedIntegrationPaths) &&
  gate.plannedIntegrationPaths.some((item) => typeof item === "string");

export const collectPlannedRequiredGateDiagnostics = (
  contract: Record<string, unknown>,
  commands: Record<string, unknown>
): readonly string[] => {
  const errors: string[] = [];
  for (const gateId of readStringArray(contract, PLANNED_REQUIRED_KEY)) {
    const gate = commands[gateId];
    if (!isRecord(gate)) {
      errors.push(`missing_required_command:${gateId}`);
      continue;
    }
    if (readDesiredStatus(gate) !== "active") {
      errors.push(`planned_required_gate_non_active:${gateId}`);
    }
    if (gate.integrationRequired !== true) {
      errors.push(`planned_required_gate_not_integration_required:${gateId}`);
    }
    if (gate.availability !== "not_integrated") {
      errors.push(`planned_required_gate_wrong_availability:${gateId}`);
    }
    if (!hasPlannedIntegrationPaths(gate)) {
      errors.push(`planned_required_gate_missing_paths:${gateId}`);
    }
  }
  return errors;
};

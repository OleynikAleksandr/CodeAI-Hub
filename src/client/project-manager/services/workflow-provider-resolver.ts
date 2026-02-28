import type { ProviderStackDescriptor, ProviderStackId } from "../../../types/provider";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" || value === "codexCli" || value === "geminiCli";

const resolveProviderIdFromDescription = (
  state: WorkflowStateSnapshot | null
): ProviderStackId | null => {
  const description = state?.description;
  const candidates: readonly unknown[] = [
    description?.session?.providerId,
    description?.collectorSession?.providerId,
    description?.reviewerSession?.providerId,
  ];
  for (const candidate of candidates) {
    if (isProviderStackId(candidate)) {
      return candidate;
    }
  }
  return null;
};

export const resolvePreferredWorkflowProviderId = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly providers: readonly ProviderStackDescriptor[];
}): ProviderStackId | null => {
  const providerIds = new Set(options.providers.map((provider) => provider.id));
  const fromState = resolveProviderIdFromDescription(options.workflowState);
  if (fromState && providerIds.has(fromState)) {
    return fromState;
  }
  return options.providers.at(0)?.id ?? null;
};

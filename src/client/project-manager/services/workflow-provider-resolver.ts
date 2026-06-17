import type { ProviderStackDescriptor, ProviderStackId } from "../../../types/provider";
import type { WorkflowStateSnapshot } from "./workflow-state-client";

type WorkflowProviderStageId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "application_skeleton"
  | "quality_gates";

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" ||
  value === "codexCli" ||
  value === "geminiCli" ||
  value === "kimiCode" ||
  value === "glmNative" ||
  value === "glmOpenCode" ||
  value === "localModels";

export const isResearchCapableProviderId = (
  providerId: ProviderStackId
): boolean =>
  providerId === "codexCli" ||
  providerId === "claudeCodeCli" ||
  providerId === "glmNative" ||
  providerId === "localModels";

const resolveProviderIdFromDescription = (
  state: WorkflowStateSnapshot | null
): ProviderStackId | null => {
  const providerId = state?.description?.primarySession?.providerId;
  if (isProviderStackId(providerId)) {
    return providerId;
  }
  return null;
};

const resolveProviderIdFromLatestStageSegment = (
  state: WorkflowStateSnapshot | null,
  stage: WorkflowProviderStageId
): ProviderStackId | null => {
  const chains = state?.continuity?.chains ?? [];
  let best:
    | {
        readonly updatedAt: string;
        readonly providerId: ProviderStackId;
      }
    | null = null;

  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    const providerId = chain.segments.at(-1)?.providerId;
    if (!isProviderStackId(providerId)) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { updatedAt: chain.updatedAt, providerId };
    }
  }

  return best?.providerId ?? null;
};

const resolveInheritedProviderId = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly stage?: WorkflowProviderStageId;
}): ProviderStackId | null => {
  const descriptionProviderId =
    resolveProviderIdFromDescription(options.workflowState) ??
    resolveProviderIdFromLatestStageSegment(
      options.workflowState,
      "description"
    );
  if (options.stage === "description") {
    return descriptionProviderId;
  }
  if (options.stage === "virtual_simulation") {
    return descriptionProviderId;
  }
  if (options.stage === "diagram_modules") {
    return (
      resolveProviderIdFromLatestStageSegment(
        options.workflowState,
        "virtual_simulation"
      ) ?? descriptionProviderId
    );
  }
  if (options.stage === "application_skeleton") {
    return (
      resolveProviderIdFromLatestStageSegment(options.workflowState, "diagram_modules") ??
      resolveProviderIdFromLatestStageSegment(
        options.workflowState,
        "virtual_simulation"
      ) ?? descriptionProviderId
    );
  }
  if (options.stage === "quality_gates") {
    return (
      resolveProviderIdFromLatestStageSegment(
        options.workflowState,
        "application_skeleton"
      ) ??
      resolveProviderIdFromLatestStageSegment(options.workflowState, "diagram_modules") ??
      resolveProviderIdFromLatestStageSegment(
        options.workflowState,
        "virtual_simulation"
      ) ?? descriptionProviderId
    );
  }
  return descriptionProviderId;
};

const resolveFirstConnectedProviderId = (
  providers: readonly ProviderStackDescriptor[]
): ProviderStackId | null =>
  providers.find((provider) => provider.connected)?.id ?? null;

export const resolvePreferredWorkflowProviderId = (options: {
  readonly workflowState: WorkflowStateSnapshot | null;
  readonly providers: readonly ProviderStackDescriptor[];
  readonly stage?: WorkflowProviderStageId;
}): ProviderStackId | null => {
  const providers =
    options.stage === "quality_gates"
      ? options.providers.filter((provider) =>
          isResearchCapableProviderId(provider.id)
        )
      : options.providers;
  const providerIds = new Set(providers.map((provider) => provider.id));
  const fromState = resolveInheritedProviderId(options);
  if (fromState && providerIds.has(fromState)) {
    const inheritedProvider = providers.find(
      (provider) => provider.id === fromState
    );
    if (inheritedProvider?.connected !== false) {
      return fromState;
    }
  }

  const firstConnectedProviderId = resolveFirstConnectedProviderId(
    providers
  );
  if (firstConnectedProviderId) {
    return firstConnectedProviderId;
  }

  return providers.at(0)?.id ?? null;
};

import { useMemo } from "react";
import type { ProviderStackId } from "../../../../types/provider";
import type {
  WorkflowStageId,
  WorkflowStateSnapshot,
} from "../../services/workflow-state-client";

export type SidebarProviderId = "claude" | "codex" | "gemini";

export const PROVIDER_STACK_TO_DESIGN_ID: Record<
  ProviderStackId,
  SidebarProviderId
> = {
  claudeCodeCli: "claude",
  codexCli: "codex",
  geminiCli: "gemini",
};

const isProviderStackId = (value: unknown): value is ProviderStackId =>
  value === "claudeCodeCli" || value === "codexCli" || value === "geminiCli";

const mapStackToDesignId = (
  providerId: ProviderStackId | null
): SidebarProviderId | null =>
  providerId ? PROVIDER_STACK_TO_DESIGN_ID[providerId] : null;

export const resolveSidebarProviderIdForStage = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId,
  fallbackProviderId: SidebarProviderId | null = null
): SidebarProviderId | null =>
  mapStackToDesignId(resolveStageProviderId(snapshot, stage)) ??
  fallbackProviderId;

const resolveLatestChainProviderId = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId
): ProviderStackId | null => {
  const chains = snapshot?.continuity?.chains ?? [];
  let best:
    | { readonly updatedAt: string; readonly providerId: ProviderStackId }
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

const resolveDescriptionProviderId = (
  snapshot: WorkflowStateSnapshot | null
): ProviderStackId | null => {
  const fromDescription = snapshot?.description?.primarySession?.providerId;
  return isProviderStackId(fromDescription) ? fromDescription : null;
};

// Resolution chain for trunk stages mirrors `resolveInheritedProviderId`
// in `workflow-provider-resolver.ts` — the same logic that
// `StageConfirmationCard` uses to preselect a provider for the next step.
// Idle stages without their own chain inherit upstream attribution so the
// sidebar tint stays consistent with the stage-confirmation card.
const resolveStageProviderId = (
  snapshot: WorkflowStateSnapshot | null,
  stage: WorkflowStageId
): ProviderStackId | null => {
  const own = resolveLatestChainProviderId(snapshot, stage);
  if (own) {
    return own;
  }
  if (stage === "description") {
    return resolveDescriptionProviderId(snapshot);
  }
  if (stage === "virtual_simulation") {
    return resolveDescriptionProviderId(snapshot);
  }
  if (stage === "diagram_modules") {
    return (
      resolveLatestChainProviderId(snapshot, "virtual_simulation") ??
      resolveDescriptionProviderId(snapshot)
    );
  }
  return null;
};

export interface UseStepProviderResolverParams {
  readonly snapshot: WorkflowStateSnapshot | null;
  readonly fallbackProviderId?: SidebarProviderId | null;
}

export interface StepProviderResolver {
  readonly forStage: (stage: WorkflowStageId) => SidebarProviderId | null;
  readonly forBranchPart: (partId: string) => SidebarProviderId | null;
  readonly forBranchCluster: (clusterId: string) => SidebarProviderId | null;
  readonly forBranchModule: (moduleId: string) => SidebarProviderId | null;
}

export const useStepProviderResolver = ({
  snapshot,
  fallbackProviderId = null,
}: UseStepProviderResolverParams): StepProviderResolver =>
  useMemo(() => {
    const stageCache = new Map<WorkflowStageId, SidebarProviderId | null>();
    const resolveStage = (
      stage: WorkflowStageId
    ): SidebarProviderId | null => {
      if (stageCache.has(stage)) {
        return stageCache.get(stage) ?? null;
      }
      const resolved = resolveSidebarProviderIdForStage(
        snapshot,
        stage,
        fallbackProviderId
      );
      stageCache.set(stage, resolved);
      return resolved;
    };
    // Branch nodes (P/C/M) stay neutral until a per-branch session
    // (Cluster Design / Module Design) materializes. Inheriting the
    // diagram_modules trunk provider would lie about attribution: the
    // tree skeleton is generated from that artifact, but the individual
    // P/C/M items have no provider of their own yet.
    return {
      forStage: resolveStage,
      forBranchPart: () => null,
      forBranchCluster: () => null,
      forBranchModule: () => null,
    };
  }, [snapshot, fallbackProviderId]);

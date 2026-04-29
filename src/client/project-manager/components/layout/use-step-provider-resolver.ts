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

const resolveStageProviderId = (
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
  if (best) {
    return best.providerId;
  }
  if (stage === "description") {
    const fromDescription = snapshot?.description?.primarySession?.providerId;
    if (isProviderStackId(fromDescription)) {
      return fromDescription;
    }
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
    const branchDefault = resolveSidebarProviderIdForStage(
      snapshot,
      "diagram_modules",
      fallbackProviderId
    );
    return {
      forStage: resolveStage,
      forBranchPart: () => branchDefault,
      forBranchCluster: () => branchDefault,
      forBranchModule: () => branchDefault,
    };
  }, [snapshot, fallbackProviderId]);

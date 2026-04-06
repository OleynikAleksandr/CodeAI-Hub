import {
  compareWorkflowStageOrder,
  resolvePreferredWorkflowLastActive,
  type WorkflowLastActiveSnapshot,
} from "../../workflow/state/workflow-last-active-store";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const DIAGRAM_MODULES_INDEX_FILE = "product-parts.index.md";

const normalizeArtifactPath = (value: string): string =>
  value.replace(/\\/g, "/").trim();

const stageHasArtifact = (params: {
  readonly state: WorkflowState;
  readonly stage: WorkflowStageId;
  readonly fileName: string;
}): boolean =>
  params.state.stages[params.stage].artifacts.some((artifact) =>
    normalizeArtifactPath(artifact.path).endsWith(`/${params.fileName}`)
  );

const resolveLatestContinuityUpdatedAt = (params: {
  readonly chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[];
  readonly stage: WorkflowStageId;
}): string | null => {
  let best: string | null = null;

  for (const chain of params.chains) {
    if (chain.stage !== params.stage || chain.segments.length === 0) {
      continue;
    }
    if (!best || chain.updatedAt > best) {
      best = chain.updatedAt;
    }
  }

  return best;
};

const resolveStageArtifactPath = (params: {
  readonly description: {
    readonly finalPath?: string;
  } | null;
  readonly stage: WorkflowStageId;
  readonly state: WorkflowState;
  readonly workspaceSlug: string;
}): string | undefined => {
  if (params.stage === "description") {
    return params.description?.finalPath;
  }

  if (
    params.stage === "virtual_simulation" &&
    stageHasArtifact({
      state: params.state,
      stage: "virtual_simulation",
      fileName: "virtual-simulation.md",
    })
  ) {
    return `.codeai-hub/${params.workspaceSlug}/virtual_simulation/virtual-simulation.md`;
  }

  if (
    params.stage === "diagram_modules" &&
    stageHasArtifact({
      state: params.state,
      stage: "diagram_modules",
      fileName: DIAGRAM_MODULES_INDEX_FILE,
    })
  ) {
    return `.codeai-hub/${params.workspaceSlug}/diagram_modules/${DIAGRAM_MODULES_INDEX_FILE}`;
  }

  if (
    params.stage === "foundation_envelope" &&
    stageHasArtifact({
      state: params.state,
      stage: "foundation_envelope",
      fileName: "foundation-envelope.md",
    })
  ) {
    return `.codeai-hub/${params.workspaceSlug}/foundation_envelope/foundation-envelope.md`;
  }

  return undefined;
};

const resolveLatestStageActivityTimestamp = (params: {
  readonly continuityUpdatedAt: string | null;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly stage: WorkflowStageId;
  readonly state: WorkflowState;
}): string | null => {
  const stageState = params.state.stages[params.stage];
  const persistedStageUpdatedAt =
    params.lastActive?.stage === params.stage
      ? params.lastActive.updatedAt
      : null;

  let updatedAt: string | null = null;
  for (const value of [
    persistedStageUpdatedAt,
    stageState.status === "idle" ? null : stageState.updatedAt,
    params.continuityUpdatedAt,
  ]) {
    if (value && (!updatedAt || value > updatedAt)) {
      updatedAt = value;
    }
  }

  return updatedAt;
};

const resolveStageCandidate = (params: {
  readonly chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[];
  readonly description: {
    readonly finalPath?: string;
  } | null;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly stage: WorkflowStageId;
  readonly state: WorkflowState;
  readonly workspaceSlug: string;
}): WorkflowLastActiveSnapshot | null => {
  const continuityUpdatedAt = resolveLatestContinuityUpdatedAt({
    chains: params.chains,
    stage: params.stage,
  });
  const artifactPath = resolveStageArtifactPath({
    description: params.description,
    stage: params.stage,
    state: params.state,
    workspaceSlug: params.workspaceSlug,
  });
  const updatedAt = resolveLatestStageActivityTimestamp({
    continuityUpdatedAt,
    lastActive: params.lastActive,
    stage: params.stage,
    state: params.state,
  });

  const hasSemanticActivity =
    Boolean(artifactPath) ||
    Boolean(continuityUpdatedAt) ||
    (params.stage === "description" &&
      params.lastActive?.stage === "description" &&
      Boolean(params.lastActive.artifactPath));

  if (!(updatedAt && hasSemanticActivity)) {
    return null;
  }

  return {
    stage: params.stage,
    updatedAt,
    artifactPath:
      artifactPath ??
      (params.lastActive?.stage === params.stage
        ? params.lastActive.artifactPath
        : undefined),
  };
};

export const resolveCanonicalLastActive = (params: {
  readonly chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[];
  readonly description: {
    readonly finalPath?: string;
  } | null;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly state: WorkflowState;
  readonly workspaceSlug: string;
}): WorkflowLastActiveSnapshot | null => {
  const stageCandidates = (
    Object.keys(params.state.stages) as WorkflowStageId[]
  )
    .map((stage) =>
      resolveStageCandidate({
        chains: params.chains,
        description: params.description,
        lastActive: params.lastActive,
        stage,
        state: params.state,
        workspaceSlug: params.workspaceSlug,
      })
    )
    .filter((candidate): candidate is WorkflowLastActiveSnapshot =>
      Boolean(candidate)
    );

  return resolvePreferredWorkflowLastActive([
    params.lastActive,
    ...stageCandidates.sort((left, right) => {
      if (left.updatedAt === right.updatedAt) {
        return compareWorkflowStageOrder(left.stage, right.stage);
      }
      return left.updatedAt.localeCompare(right.updatedAt);
    }),
  ]);
};

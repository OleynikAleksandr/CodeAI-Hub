import { promises as fs } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { Logger } from "../../telemetry/logger";
import {
  buildDescriptionBranchSnapshot,
  DescriptionStepStore,
} from "../../workflow/description/description-step-store";
import { resolveWorkflowArtifactPaths } from "../../workflow/paths/workflow-artifact-paths";
import {
  resolvePreferredWorkflowLastActive,
  type WorkflowLastActiveSnapshot,
  WorkflowLastActiveStore,
} from "../../workflow/state/workflow-last-active-store";
import type { SessionRequestHandler } from "./session-request-handler";

const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const WORKSPACE_ROOT_DIR = ".codeai-hub";

interface WorkspaceActivatePayload {
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}

const STAGE_ARTIFACT_FILE = {
  description: "Final_Description.md",
  virtual_simulation: "virtual-simulation.md",
  diagram_modules: "product-parts.index.md",
  foundation_envelope: "foundation-envelope.md",
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const parseWorkspaceActivatePayload = (
  payload: unknown
):
  | { readonly ok: true; readonly value: WorkspaceActivatePayload }
  | { readonly ok: false; readonly error: string } => {
  if (!isRecord(payload)) {
    return { ok: false, error: "Invalid payload" };
  }

  const workspacePath = readNonEmptyString(payload.workspacePath);
  if (!workspacePath) {
    return { ok: false, error: "Missing workspacePath" };
  }
  if (!path.isAbsolute(workspacePath)) {
    return { ok: false, error: "workspacePath must be absolute" };
  }

  const workspaceSlug = readNonEmptyString(payload.workspaceSlug);
  if (!workspaceSlug) {
    return { ok: false, error: "Missing workspaceSlug" };
  }

  return { ok: true, value: { workspacePath, workspaceSlug } };
};

const resolveStageBackfillCandidate = async (params: {
  readonly chains: readonly {
    readonly stage: string;
    readonly updatedAt: string;
    readonly segments: readonly unknown[];
  }[];
  readonly stage: keyof typeof STAGE_ARTIFACT_FILE;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowLastActiveSnapshot | null> => {
  let chainUpdatedAt: string | null = null;
  for (const chain of params.chains) {
    if (chain.stage !== params.stage || chain.segments.length === 0) {
      continue;
    }
    if (!chainUpdatedAt || chain.updatedAt > chainUpdatedAt) {
      chainUpdatedAt = chain.updatedAt;
    }
  }

  const artifactPath = resolveWorkflowArtifactPaths({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
    stage: params.stage,
    fileName: STAGE_ARTIFACT_FILE[params.stage],
  });
  if (!artifactPath.ok) {
    return null;
  }

  const artifactStat = await fs
    .stat(artifactPath.value.absolutePath)
    .catch(() => null);
  if (!artifactStat?.isFile()) {
    return null;
  }

  const updatedAtCandidates = [
    chainUpdatedAt,
    artifactStat.mtime.toISOString(),
  ].filter((value): value is string => Boolean(value));
  const updatedAt = updatedAtCandidates.sort().at(-1) ?? null;
  if (!updatedAt) {
    return null;
  }

  return {
    stage: params.stage,
    updatedAt,
    artifactPath: artifactPath.value.relativePath,
  };
};

const repairLastActiveSnapshot = async (params: {
  readonly descriptionSnapshot: Awaited<
    ReturnType<DescriptionStepStore["read"]>
  >;
  readonly lastActive: WorkflowLastActiveSnapshot | null;
  readonly lastActiveStore: WorkflowLastActiveStore;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowLastActiveSnapshot | null> => {
  const continuityChains = await SessionContinuityFacade.readWorkspaceChains({
    workspaceRoot: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  const descriptionCandidate = params.descriptionSnapshot?.finalPath
    ? await resolveStageBackfillCandidate({
        chains: continuityChains,
        stage: "description",
        workspacePath: params.workspacePath,
        workspaceSlug: params.workspaceSlug,
      })
    : null;
  const preferred = resolvePreferredWorkflowLastActive([
    params.lastActive,
    descriptionCandidate,
    await resolveStageBackfillCandidate({
      chains: continuityChains,
      stage: "virtual_simulation",
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    }),
    await resolveStageBackfillCandidate({
      chains: continuityChains,
      stage: "diagram_modules",
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    }),
    await resolveStageBackfillCandidate({
      chains: continuityChains,
      stage: "foundation_envelope",
      workspacePath: params.workspacePath,
      workspaceSlug: params.workspaceSlug,
    }),
  ]);

  if (!preferred) {
    return params.lastActive;
  }

  if (
    params.lastActive?.stage === preferred.stage &&
    params.lastActive.artifactPath === preferred.artifactPath &&
    params.lastActive.updatedAt === preferred.updatedAt
  ) {
    return params.lastActive;
  }

  return await params.lastActiveStore.upsert(
    params.workspacePath,
    params.workspaceSlug,
    preferred
  );
};

export const handleWorkspaceActivate = async (params: {
  readonly req: Request;
  readonly res: Response;
  readonly logger: Logger;
  readonly sessionHandler: SessionRequestHandler;
  readonly onWorkspaceActivated?: (
    workspacePath: string,
    workspaceSlug: string
  ) => Promise<void> | void;
}): Promise<void> => {
  const parsed = parseWorkspaceActivatePayload(params.req.body as unknown);
  if (!parsed.ok) {
    params.res.status(HTTP_BAD_REQUEST).json({ error: parsed.error });
    return;
  }

  const { workspacePath, workspaceSlug } = parsed.value;

  try {
    await fs.mkdir(
      path.join(workspacePath, WORKSPACE_ROOT_DIR, workspaceSlug),
      {
        recursive: true,
      }
    );
    await Promise.resolve(
      params.onWorkspaceActivated?.(workspacePath, workspaceSlug)
    );

    const lastActiveStore = new WorkflowLastActiveStore();
    const descriptionStepStore = new DescriptionStepStore();
    const descriptionSnapshot = await descriptionStepStore.read(
      workspacePath,
      workspaceSlug
    );
    const lastActive = await repairLastActiveSnapshot({
      descriptionSnapshot,
      lastActive: await lastActiveStore.read(workspacePath, workspaceSlug),
      lastActiveStore,
      workspacePath,
      workspaceSlug,
    });

    if (descriptionSnapshot) {
      // Description works in single-session collector mode.
      const collector = descriptionSnapshot.primarySession;

      if (collector) {
        await params.sessionHandler.handleCreate(
          collector.providerId,
          workspacePath,
          {
            initiativeSlug: workspaceSlug,
            stage: "description",
            runSlug: null,
            providerSessionId: collector.providerSessionId,
          }
        );
      }
    }

    params.res.json({
      workspaceSlug,
      lastActive,
      description: descriptionSnapshot
        ? buildDescriptionBranchSnapshot(descriptionSnapshot)
        : null,
    });
  } catch (error) {
    params.logger.error("Failed to activate workspace", error as Error, {
      workspacePath,
      workspaceSlug,
    });
    params.res
      .status(HTTP_INTERNAL_ERROR)
      .json({ error: "Unable to activate workspace" });
  }
};

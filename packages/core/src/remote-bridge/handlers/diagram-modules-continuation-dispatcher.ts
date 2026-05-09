import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const execFileAsync = promisify(execFile);
const DIAGRAM_MODULES_STAGE = "diagram_modules";
const sentSignatures = new Set<string>();

type TurnBoundaryAwareGateway = WorkflowAgentAcceptanceFeedbackGateway & {
  readonly waitForManagedContinuationTurnBoundary?: (
    sessionId: string
  ) => Promise<boolean>;
};

const readStringArray = (value: unknown): readonly string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const readManagedGitDirtyFiles = (progress: unknown): readonly string[] =>
  readStringArray(
    (progress as { readonly managedGitDirtyFiles?: unknown })
      .managedGitDirtyFiles
  );

const readManagedGitOutOfOwnerDirtyFiles = (
  progress: unknown
): readonly string[] =>
  readStringArray(
    (progress as { readonly managedGitOutOfOwnerDirtyFiles?: unknown })
      .managedGitOutOfOwnerDirtyFiles
  );

const readWorkspaceHead = async (workspaceRoot: string): Promise<string> => {
  try {
    const { stdout } = await execFileAsync("git", ["rev-parse", "HEAD"], {
      cwd: workspaceRoot,
    });
    return stdout.trim() || "unknown-head";
  } catch {
    return "unknown-head";
  }
};

const resolveLatestStageSessionId = (
  chains: readonly ContinuityChainSummary[]
): string | null => {
  let best: { readonly sessionId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== DIAGRAM_MODULES_STAGE) {
      continue;
    }
    const sessionId = chain.segments.at(-1)?.sessionId;
    if (!sessionId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { sessionId, updatedAt: chain.updatedAt };
    }
  }
  return best?.sessionId ?? null;
};

const buildContinuationPrompt = (
  progress: DiagramModulesProgressSnapshot
): string =>
  [
    "Core accepted the previous Diagram Modules artifact.",
    "This Core continuation message is the authoritative scope for the current turn.",
    "If any earlier Core message reported aggregate missing Product Part artifacts, treat that older aggregate scope as superseded by the target below.",
    "",
    "Next target artifact:",
    `\`${progress.expectedArtifactPath ?? "(unknown target artifact)"}\``,
    "",
    `Materialize only Product Part "${progress.currentPartId ?? "unknown"}".`,
    (progress.acceptedPartIds ?? []).length > 0
      ? `Already accepted Product Parts: ${(progress.acceptedPartIds ?? []).join(", ")}.`
      : "No Product Part artifacts have been accepted yet.",
    "Do not edit accepted Product Parts unless Core explicitly names them in this message.",
    "Existing sibling Product Part files do not expand this turn scope.",
    "Do not create or update any other Product Part file in this turn.",
    "Do not continue to the next Product Part by yourself.",
    "When ready, stop with a content-readiness note for Core acceptance.",
  ].join("\n");

const canContinueDiagramModules = (
  progress: DiagramModulesProgressSnapshot | null
): progress is DiagramModulesProgressSnapshot => {
  if (!progress) {
    return false;
  }
  if (
    progress.substep !== "generate_product_part" ||
    progress.activeSubturn?.kind !== "product_part" ||
    progress.activeSubturn.status !== "pending"
  ) {
    return false;
  }
  return Boolean(
    progress.currentPartId &&
      progress.expectedArtifactPath &&
      readManagedGitDirtyFiles(progress).length === 0 &&
      readManagedGitOutOfOwnerDirtyFiles(progress).length === 0
  );
};

export const sendDiagramModulesContinuationIfReady = async (params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: DiagramModulesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  if (!(params.gateway && canContinueDiagramModules(params.progress))) {
    return;
  }
  const sessionId = resolveLatestStageSessionId(params.chains);
  if (!sessionId) {
    return;
  }
  const turnBoundaryGateway = params.gateway as TurnBoundaryAwareGateway;
  const turnBoundarySettled =
    (await turnBoundaryGateway.waitForManagedContinuationTurnBoundary?.(
      sessionId
    )) ?? true;
  if (!turnBoundarySettled) {
    return;
  }
  const workspaceHead = await readWorkspaceHead(params.workspaceRoot);
  const signature = [
    params.workspaceSlug,
    DIAGRAM_MODULES_STAGE,
    sessionId,
    workspaceHead,
    params.progress.currentPartId,
    params.progress.expectedArtifactPath,
    (params.progress.acceptedPartIds ?? []).join(","),
  ].join("\0");
  if (sentSignatures.has(signature)) {
    return;
  }
  sentSignatures.add(signature);
  try {
    params.gateway.markFeedbackTurnStarted?.(sessionId);
    await params.gateway.handleMessage(
      sessionId,
      buildContinuationPrompt(params.progress)
    );
  } catch (error) {
    sentSignatures.delete(signature);
    throw error;
  }
};

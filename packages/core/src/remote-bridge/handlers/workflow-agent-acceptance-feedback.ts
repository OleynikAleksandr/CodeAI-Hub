import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export interface WorkflowAgentAcceptanceFeedbackGateway {
  readonly handleMessage: (sessionId: string, content: string) => Promise<void>;
}

const QUALITY_GATES_STAGE = "quality_gates";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const DIAGRAM_MODULES_STAGE = "diagram_modules";
const execFileAsync = promisify(execFile);

interface StageFeedbackRequest {
  readonly actionLines: readonly string[];
  readonly checkLines: readonly string[];
  readonly errors: readonly string[];
  readonly stage: string;
  readonly title: string;
}

const resolveLatestStageSessionId = (
  chains: readonly ContinuityChainSummary[],
  stage: string
): string | null => {
  let best: { readonly sessionId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== stage) {
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

const buildFeedbackMessage = (request: StageFeedbackRequest): string =>
  [
    `Core acceptance check failed for ${request.title}.`,
    "",
    "What Core checked:",
    ...request.checkLines.map((line) => `- ${line}`),
    "",
    "What needs to be fixed:",
    ...request.errors.map((error) => `- ${error}`),
    "",
    "Required action:",
    ...request.actionLines.map((action) => `- ${action}`),
  ].join("\n");

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

const formatList = (items: readonly string[]): string =>
  items.length > 0 ? items.join(", ") : "(none)";

const createDiagramModulesErrors = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => {
  if (progress.substep === "blocked_ambiguity") {
    return [
      "Diagram Modules index is marked blocked_ambiguity and must be resolved before downstream stages can trust the module map.",
    ];
  }
  if (progress.aggregateReady) {
    return [];
  }
  if (progress.plannedCount === 0) {
    return ["Diagram Modules index does not declare any Product Part ids."];
  }
  const missingPart = progress.currentPartId ?? "unknown";
  return [
    `Diagram Modules is not complete: ${progress.generatedCount}/${progress.plannedCount} Product Part artifacts are valid; next missing or invalid Product Part is "${missingPart}".`,
  ];
};

const createDiagramModulesCheckLines = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => [
  "Stage: Diagram Modules.",
  "Rule: every Product Part declared in product-parts.index.md must have a valid generated Product Part artifact.",
  `Observed valid Product Part artifacts: ${progress.generatedCount}/${progress.plannedCount}.`,
  `Planned Product Parts: ${formatList(progress.plannedPartIds)}.`,
  `Valid generated Product Parts: ${formatList(progress.generatedPartIds)}.`,
  `Next missing or invalid Product Part: ${progress.currentPartId ?? "(none)"}.`,
];

const createApplicationSkeletonCheckLines = (
  progress: ApplicationSkeletonProgressSnapshot
): readonly string[] => [
  "Stage: Application Skeleton.",
  "Rule: application-skeleton-map.json, application-skeleton.md, and every declared production path must agree on a materialized accepted skeleton.",
  `Observed map exists: ${progress.mapExists}; markdown exists: ${progress.markdownExists}; mapping ready: ${progress.mappingReady}.`,
  `Observed accepted: ${progress.accepted}; materialized: ${progress.materialized}; materializationState: ${progress.materializationState}; substep: ${progress.substep}.`,
  `Observed filesystem materialization signal: ${progress.observedMaterialization}.`,
];

const createQualityGatesCheckLines = (
  progress: QualityGatesProgressSnapshot
): readonly string[] => [
  "Stage: Quality Gates Baseline.",
  "Rule: accepted quality-gates.json must declare commands and every required gate must be wired into the managed lifecycle hooks.",
  `Observed quality-gates.json exists: ${progress.jsonExists}; quality-gates.md exists: ${progress.markdownExists}; command contract ready: ${progress.commandContractReady}.`,
  `Observed accepted: ${progress.accepted}; integrated: ${progress.integrated}; integrationState: ${progress.integrationState ?? "(missing)"}; substep: ${progress.substep}.`,
];

export class WorkflowAgentAcceptanceFeedback {
  private readonly logger: Logger;
  private readonly sentSignatures = new Set<string>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sendManagedStageFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly request: StageFeedbackRequest | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    if (
      !(params.gateway && params.request) ||
      params.request.errors.length === 0
    ) {
      return;
    }
    const sessionId = resolveLatestStageSessionId(
      params.chains,
      params.request.stage
    );
    if (!sessionId) {
      this.logger.warn("Managed stage acceptance feedback has no session", {
        stage: params.request.stage,
        workspaceSlug: params.workspaceSlug,
      });
      return;
    }
    const workspaceHead = await readWorkspaceHead(params.workspaceRoot);
    const signature = [
      params.workspaceSlug,
      params.request.stage,
      sessionId,
      workspaceHead,
      ...params.request.errors,
    ].join("\0");
    if (this.sentSignatures.has(signature)) {
      return;
    }
    this.sentSignatures.add(signature);
    try {
      await params.gateway.handleMessage(
        sessionId,
        buildFeedbackMessage(params.request)
      );
    } catch (error) {
      this.sentSignatures.delete(signature);
      throw error;
    }
  }

  async sendDiagramModulesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: DiagramModulesProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const progress = params.progress;
    const errors = progress ? createDiagramModulesErrors(progress) : [];
    const request =
      progress && errors.length > 0
        ? {
            actionLines: [
              "Update the Diagram Modules artifacts until every planned Product Part has a valid product-parts/<part-id>.md file.",
              "Commit the repair with the current managed plan command so Core can re-run acceptance before the next workflow stage.",
            ],
            checkLines: createDiagramModulesCheckLines(progress),
            errors,
            stage: DIAGRAM_MODULES_STAGE,
            title: "Diagram Modules",
          }
        : null;
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async sendApplicationSkeletonFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: ApplicationSkeletonProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress?.substep === "failed" &&
        params.progress.validationErrors.length > 0
          ? {
              actionLines: [
                "Update application-skeleton-map.json and the materialized filesystem projection until every declared path exists and matches the accepted skeleton.",
                "Commit the repair with the current managed plan command so Core can re-run acceptance before Quality Gates starts.",
              ],
              checkLines: createApplicationSkeletonCheckLines(params.progress),
              errors: params.progress.validationErrors,
              stage: APPLICATION_SKELETON_STAGE,
              title: "Application Skeleton",
            }
          : null,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async sendQualityGatesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: QualityGatesProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress?.substep === "failed" &&
        params.progress.validationErrors.length > 0
          ? {
              actionLines: [
                "Update the Quality Gates integration so every selected required gate is wired into the managed lifecycle hooks.",
                "Re-run the affected qg:* checks and the aggregate quality gate command.",
                "Commit the repair with the current managed plan command so Core can re-run acceptance and unlock the next workflow step.",
              ],
              checkLines: createQualityGatesCheckLines(params.progress),
              errors: params.progress.validationErrors,
              stage: QUALITY_GATES_STAGE,
              title: "Quality Gates Baseline",
            }
          : null,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }
}

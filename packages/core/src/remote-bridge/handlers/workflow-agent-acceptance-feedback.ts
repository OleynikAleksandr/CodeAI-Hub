import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type {
  DiagramModulesProgressSnapshot,
  ProductPartDiagnostic,
} from "./diagram-modules-progress";
import { createQualityGatesActionLines } from "./quality-gates-feedback-action-lines";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
export interface WorkflowAgentAcceptanceFeedbackGateway {
  readonly handleMessage: (
    sessionId: string,
    payload: string | WorkflowAgentAcceptanceFeedbackPayload
  ) => Promise<void>;
  readonly markFeedbackTurnStarted?: (sessionId: string) => void;
}
const QUALITY_GATES_STAGE = "quality_gates";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const DIAGRAM_MODULES_STAGE = "diagram_modules";
const execFileAsync = promisify(execFile);
interface WorkflowAgentAcceptanceFeedbackPayload {
  readonly content: string;
}
interface StageFeedbackRequest {
  readonly actionLines: readonly string[];
  readonly checkLines: readonly string[];
  readonly errors: readonly string[];
  readonly feedbackKind?: "acceptance" | "repair";
  readonly stage: string;
  readonly targetArtifactPath?: string | null;
  readonly title: string;
  readonly validator?: string | null;
}
interface FeedbackSnapshotMetadata {
  readonly checkedAt: string;
  readonly snapshotHead: string;
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
const buildFeedbackMessage = (
  request: StageFeedbackRequest,
  metadata: FeedbackSnapshotMetadata
): string => {
  if (request.feedbackKind === "repair") {
    return [
      `Core rejected the current ${request.title} artifact.`,
      "",
      "Target artifact to repair:",
      `\`${request.targetArtifactPath ?? "(unknown target artifact)"}\``,
      "",
      "Fresh validation snapshot:",
      `- snapshotHead: ${metadata.snapshotHead}`,
      `- checkedAt: ${metadata.checkedAt}`,
      `- validator: ${request.validator ?? "unknown"}`,
      "",
      "Errors:",
      ...request.errors.map((error) => `- ${error}`),
      "",
      "Required action:",
      ...request.actionLines.map((action) => `- ${action}`),
    ].join("\n");
  }
  return [
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
};
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
  const outOfOwnerDirtyFiles = readManagedGitOutOfOwnerDirtyFiles(progress);
  if (outOfOwnerDirtyFiles.length > 0) {
    return [
      createOutOfOwnerDirtyError("Diagram Modules", outOfOwnerDirtyFiles),
    ];
  }
  const dirtyFiles = readManagedGitDirtyFiles(progress);
  const dirtyGateErrors =
    dirtyFiles.length > 0
      ? [
          `Core-owned managed commit is pending for Diagram Modules-owned files: ${dirtyFiles.join(", ")}. Core owns this commit gate; respond with a content-readiness note once the artifacts are ready.`,
        ]
      : [];
  if (dirtyGateErrors.length > 0) {
    return dirtyGateErrors;
  }
  if (isDiagramModulesPendingSubturn(progress)) {
    return [];
  }
  const semanticErrors = createProductPartDiagnosticErrors(progress);
  if (isDiagramModulesRepairSubturn(progress)) {
    const repairErrors = createDiagramModulesRepairErrors(progress);
    return repairErrors.length > 0 ? repairErrors : semanticErrors;
  }
  if (semanticErrors.length > 0) {
    return semanticErrors;
  }
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
const createDiagramModulesActionLines = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => {
  const managedDirtyFiles = [
    ...readManagedGitOutOfOwnerDirtyFiles(progress),
    ...readManagedGitDirtyFiles(progress),
  ];
  if (managedDirtyFiles.length > 0) {
    return [
      "Do not create or update Product Part artifacts in response to this message.",
      "Wait for Core to finish or repair the managed commit boundary for the current target.",
    ];
  }
  if (isDiagramModulesRepairSubturn(progress)) {
    return [
      "Repair only this target artifact unless an error explicitly references another file.",
      "Do not create or update the next Product Part.",
      "When ready, stop with a content-readiness note for Core acceptance.",
    ];
  }
  return [
    "Update the Diagram Modules artifacts until every planned Product Part has a valid product-parts/<part-id>.md file.",
    "When the artifacts are ready, respond with a content-readiness note; Core owns the managed commit and downstream unlock.",
  ];
};
const readDiagramModulesSubturnStatus = (
  progress: DiagramModulesProgressSnapshot
): string | null => progress.activeSubturn?.status ?? null;
const isDiagramModulesPendingSubturn = (
  progress: DiagramModulesProgressSnapshot
): boolean => readDiagramModulesSubturnStatus(progress) === "pending";
const isDiagramModulesRepairSubturn = (
  progress: DiagramModulesProgressSnapshot
): boolean => readDiagramModulesSubturnStatus(progress) === "repair_pending";
const createDiagramModulesRepairErrors = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => {
  const validationErrors = progress.lastValidation?.diagnostics ?? [];
  if (validationErrors.length > 0) {
    return validationErrors;
  }
  const currentPartId = progress.currentPartId;
  const diagnostics = readProductPartDiagnostics(progress).filter(
    (diagnostic) => !diagnostic.valid && diagnostic.partId === currentPartId
  );
  return diagnostics.map(
    (diagnostic) => diagnostic.error ?? "unknown validation error"
  );
};
const createProductPartDiagnosticErrors = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => {
  const diagnostics = readProductPartDiagnostics(progress).filter(
    (diagnostic) => !diagnostic.valid
  );
  if (diagnostics.length > 0) {
    return diagnostics.map((diagnostic) => {
      const path = diagnostic.path ? ` (${diagnostic.path})` : "";
      return `Product Part "${diagnostic.partId}" failed validation${path}: ${diagnostic.error ?? "unknown validation error"}.`;
    });
  }
  if (progress.aggregateReady || progress.plannedCount === 0) {
    return [];
  }
  const missingPart = progress.currentPartId ?? "unknown";
  return [
    `Product Part "${missingPart}" is missing or invalid, but no validator diagnostic was captured.`,
  ];
};
const createOutOfOwnerDirtyError = (
  stageTitle: string,
  files: readonly string[]
): string =>
  `Core is blocked from finalizing the ${stageTitle} managed commit because dirty files are outside the active stage allowlist: ${files.join(", ")}. Resolution required before continuation. (User-facing notice; provider should not act on this.)`;
const isMisplacedApplicationSkeletonProductPart = (
  file: string,
  workspaceSlug: string
): boolean => file.startsWith(`.codeai-hub/${workspaceSlug}/product-parts/`);
const createMisplacedApplicationSkeletonProductPartsError = (
  files: readonly string[]
): string =>
  `Application Skeleton materialization wrote production product-parts inside the managed metadata root instead of root product-parts/**: ${files.join(", ")}.`;
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
const readProductPartDiagnostics = (
  progress: DiagramModulesProgressSnapshot
): readonly ProductPartDiagnostic[] =>
  Array.isArray(progress.productPartDiagnostics)
    ? progress.productPartDiagnostics
    : [];
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
  progress.accepted
    ? "Rule: application-skeleton-map.json, application-skeleton.md, and every declared production path must agree on a materialized accepted skeleton."
    : "Rule: draft application-skeleton-map.json and application-skeleton.md must be complete and committed before user review; filesystem materialization waits for explicit user acceptance.",
  `Observed map exists: ${progress.mapExists}; markdown exists: ${progress.markdownExists}; mapping ready: ${progress.mappingReady}.`,
  `Observed accepted: ${progress.accepted}; materialized: ${progress.materialized}; materializationState: ${progress.materializationState}; substep: ${progress.substep}.`,
  `Observed filesystem materialization signal: ${progress.observedMaterialization}.`,
];
const createApplicationSkeletonActionLines = (
  progress: ApplicationSkeletonProgressSnapshot
): readonly string[] =>
  progress.accepted
    ? [
        "Update application-skeleton-map.json and the materialized filesystem projection until every declared path exists and matches the accepted skeleton.",
        "When the artifacts are ready, respond with a content-readiness note; Core owns the managed commit and downstream unlock.",
      ]
    : [
        "Update only the draft Application Skeleton artifacts: application-skeleton-map.json and application-skeleton.md.",
        "Do not create product-parts/** or mark the skeleton accepted/materialized until explicit user acceptance advances the managed plan.",
        "When the draft artifacts are ready, respond with a content-readiness note; Core owns the managed commit and user review unlock.",
      ];
const createQualityGatesCheckLines = (
  progress: QualityGatesProgressSnapshot
): readonly string[] => [
  "Stage: Quality Gates Baseline.",
  "Rule: accepted quality-gates.json must declare commands and every required gate must be wired into the managed lifecycle hooks.",
  `Observed quality-gates.json exists: ${progress.jsonExists}; quality-gates.md exists: ${progress.markdownExists}; command contract ready: ${progress.commandContractReady}.`,
  `Observed accepted: ${progress.accepted}; acceptanceCommitted: ${progress.acceptanceCommitted === true}; integrated: ${progress.integrated}; integrationState: ${progress.integrationState ?? "(missing)"}; substep: ${progress.substep}.`,
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
      const checkedAt = new Date().toISOString();
      params.gateway.markFeedbackTurnStarted?.(sessionId);
      await params.gateway.handleMessage(
        sessionId,
        buildFeedbackMessage(params.request, {
          checkedAt,
          snapshotHead: workspaceHead,
        })
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
    const request: StageFeedbackRequest | null =
      progress && errors.length > 0
        ? {
            actionLines: [...createDiagramModulesActionLines(progress)],
            checkLines: createDiagramModulesCheckLines(progress),
            errors,
            feedbackKind: isDiagramModulesRepairSubturn(progress)
              ? "repair"
              : "acceptance",
            stage: DIAGRAM_MODULES_STAGE,
            targetArtifactPath:
              progress.lastValidation?.expectedArtifactPath ??
              progress.expectedArtifactPath,
            title: "Diagram Modules",
            validator: progress.lastValidation?.validator,
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
    const outOfOwnerDirtyFiles = params.progress
      ? readManagedGitOutOfOwnerDirtyFiles(params.progress)
      : [];
    const misplacedProductParts = outOfOwnerDirtyFiles.filter((file) =>
      isMisplacedApplicationSkeletonProductPart(file, params.workspaceSlug)
    );
    const otherOutOfOwnerDirtyFiles = outOfOwnerDirtyFiles.filter(
      (file) =>
        !isMisplacedApplicationSkeletonProductPart(file, params.workspaceSlug)
    );
    const errors = [
      ...otherOutOfOwnerDirtyFiles.map((file) =>
        createOutOfOwnerDirtyError("Application Skeleton", [file])
      ),
      ...(misplacedProductParts.length > 0
        ? [
            createMisplacedApplicationSkeletonProductPartsError(
              misplacedProductParts
            ),
          ]
        : []),
      ...(params.progress?.substep === "failed"
        ? params.progress.validationErrors
        : []),
    ];
    let actionLines: readonly string[] = [];
    if (misplacedProductParts.length > 0) {
      actionLines = [
        `Move the misplaced .codeai-hub/${params.workspaceSlug}/product-parts/** projection to root product-parts/** so every declared codePath and materializedPath exists from the workspace root.`,
        `Remove the misplaced .codeai-hub/${params.workspaceSlug}/product-parts/** projection after root product-parts/** contains the same tracked README placeholders.`,
        "When the repair is ready, respond with a content-readiness note; Core owns the managed commit and downstream unlock.",
      ];
    } else if (outOfOwnerDirtyFiles.length > 0) {
      actionLines =
        params.progress?.substep === "failed"
          ? [
              "Repair the reported Application Skeleton materialization boundary: either remove unintended files from the skeleton diff, or declare intended scaffold files in application-skeleton-map.json materializedPaths so artifacts and filesystem agree.",
              "When the repair is ready, respond with a content-readiness note; Core owns the managed commit and downstream unlock.",
            ]
          : [
              "Do not update Application Skeleton artifacts in response to this message.",
              "Wait for Core to finish or repair the managed lifecycle boundary for the current target.",
            ];
    } else if (params.progress) {
      actionLines = createApplicationSkeletonActionLines(params.progress);
    }
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress && errors.length > 0
          ? {
              actionLines: [...actionLines],
              checkLines: createApplicationSkeletonCheckLines(params.progress),
              errors,
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
    const outOfOwnerDirtyFiles = params.progress
      ? readManagedGitOutOfOwnerDirtyFiles(params.progress)
      : [];
    const errors = [
      ...outOfOwnerDirtyFiles.map((file) =>
        createOutOfOwnerDirtyError("Quality Gates Baseline", [file])
      ),
      ...(params.progress?.substep === "failed"
        ? params.progress.validationErrors
        : []),
    ];
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress && errors.length > 0
          ? {
              actionLines: createQualityGatesActionLines({
                outOfOwnerDirtyFiles,
                progress: params.progress,
              }),
              checkLines: createQualityGatesCheckLines(params.progress),
              errors,
              stage: QUALITY_GATES_STAGE,
              title: "Quality Gates Baseline",
            }
          : null,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }
}

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createClusterContractSummaryPath,
  LeadProductPartCoordinationService,
} from "../../development-tree/product-part-workflow/lead-product-part-coordination-service";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

type ClusterReviewIntent = "accept" | "none" | "revision";

interface ClusterReviewSessionLike {
  readonly initiativeSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

interface ClusterManagedReviewDecisionRequest {
  readonly eventMessages: {
    readonly appendCoreMessage: (
      sessionId: string,
      payload: { readonly content: string; readonly tag: string }
    ) => void;
    readonly appendDialogMessage: (
      sessionId: string,
      payload: { readonly content: string; readonly role: "user" }
    ) => void;
  };
  readonly intent: ClusterReviewIntent;
  readonly messageDispatch: {
    readonly sendInternalMessage: (
      sessionId: string,
      content: string
    ) => Promise<void>;
  };
  readonly options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly session: ClusterReviewSessionLike;
    readonly sessionId: string;
  };
}

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

export type ClusterContractReviewResult =
  | { readonly handled: false }
  | {
      readonly handled: true;
      readonly message: { readonly content: string; readonly tag: string };
      readonly nextInternalMessage?: string;
    };

const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const CLUSTER_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)\/clusters\/([^/]+)$/u;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTaskPrefix = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `development-tree.cluster-contract.${params.partId}.${params.clusterId}`;

const createReviewTaskId = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string => `${createTaskPrefix(params)}.phase2.contract-review.task1`;

const createMergeReadyTaskId = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string => `${createTaskPrefix(params)}.phase3.merge-ready.task1`;

const createPlanPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `doc/TODO/stages/development-tree/product-parts/${params.partId}/clusters/${params.clusterId}/todo-plan.md`;

const pathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  Boolean(await stat(path.join(workspaceRoot, relativePath)).catch(() => null));

const readText = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const parseStateBlock = (content: string): ManagedPlanState => {
  const rawBlock = content.split(PLAN_START)[1]?.split(PLAN_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error("Missing Cluster Contract managed plan state block.");
  }
  return JSON.parse(json) as ManagedPlanState;
};

const replaceStateBlock = (
  content: string,
  state: ManagedPlanState
): string => {
  const blockPattern = new RegExp(
    `${escapeRegExp(PLAN_START)}[\\s\\S]*?${escapeRegExp(PLAN_END)}`,
    "u"
  );
  return content.replace(
    blockPattern,
    `${PLAN_START}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${PLAN_END}`
  );
};

const markReviewAccepted = (params: {
  readonly clusterId: string;
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly partId: string;
}): string =>
  params.content
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(createReviewTaskId(params))}\` .*)$`,
        "mu"
      ),
      "$1DONE$2"
    )
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(params.commitMessage)}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
        "mu"
      ),
      `$1DONE$2${params.commitHash}$3`
    )
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(createMergeReadyTaskId(params))}\` .*)$`,
        "mu"
      ),
      "$1IN_PROGRESS$2"
    );

export class ClusterContractReviewController {
  private readonly git = new WorkflowBoundaryGit();
  private readonly leadCoordination = new LeadProductPartCoordinationService();

  async handleReviewDecision(params: {
    readonly content: string;
    readonly intent: ClusterReviewIntent;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ClusterContractReviewResult> {
    const match = params.stage.match(CLUSTER_STAGE_RE);
    const partId = match?.[1];
    const clusterId = match?.[2];
    if (!(partId && clusterId && params.intent !== "none")) {
      return { handled: false };
    }
    const planPath = createPlanPath({ clusterId, partId });
    if (!(await pathExists(params.workspaceRoot, planPath))) {
      return { handled: false };
    }
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock(planText);
    if (planState.currentTaskId !== createReviewTaskId({ clusterId, partId })) {
      return { handled: false };
    }
    return params.intent === "accept"
      ? await this.acceptReview({
          ...params,
          clusterId,
          partId,
          planPath,
          planState,
          planText,
        })
      : this.requestRevision({ clusterId, feedback: params.content, partId });
  }

  private requestRevision(params: {
    readonly clusterId: string;
    readonly feedback: string;
    readonly partId: string;
  }): ClusterContractReviewResult {
    return {
      handled: true,
      message: {
        content: `Core: requested revisions for Cluster Contract \`${params.clusterId}\`.`,
        tag: "managed-workflow-validation",
      },
      nextInternalMessage: [
        `Revise Cluster Contract for Product Part \`${params.partId}\`, Cluster \`${params.clusterId}\`.`,
        "User/lead feedback:",
        params.feedback,
        "Update the same ClusterSpecification and ClusterFacadeContract markdown/json artifacts.",
      ].join("\n"),
    };
  }

  private async acceptReview(params: {
    readonly clusterId: string;
    readonly partId: string;
    readonly planPath: string;
    readonly planState: ManagedPlanState;
    readonly planText: string;
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ClusterContractReviewResult> {
    if (!params.planState.expectedCommitMessage) {
      return { handled: false };
    }
    const resultPath = createClusterContractSummaryPath(params);
    const updatedAt = new Date().toISOString();
    await writeText(
      params.workspaceRoot,
      resultPath,
      `${JSON.stringify(
        this.leadCoordination.createClusterContractSummary({
          clusterId: params.clusterId,
          partId: params.partId,
          reviewCommitHash: params.planState.lastRecordedCommit ?? "",
          sessionId: params.sessionId,
          updatedAt,
        }),
        null,
        2
      )}\n`
    );
    const reviewCommit = await this.git.commit({
      commitMessage: params.planState.expectedCommitMessage,
      paths: [resultPath],
      workspaceRoot: params.workspaceRoot,
    });
    if (reviewCommit.noStagedChanges) {
      return { handled: false };
    }
    await writeText(
      params.workspaceRoot,
      params.planPath,
      replaceStateBlock(
        markReviewAccepted({
          clusterId: params.clusterId,
          commitHash: reviewCommit.hash,
          commitMessage: params.planState.expectedCommitMessage,
          content: params.planText,
          partId: params.partId,
        }),
        {
          ...params.planState,
          currentTaskId: createMergeReadyTaskId(params),
          expectedCommitMessage: null,
          lastRecordedCommit: reviewCommit.hash,
        }
      )
    );
    await this.git.commit({
      commitMessage: "chore: advance managed workflow ledger",
      paths: [params.planPath],
      workspaceRoot: params.workspaceRoot,
    });
    return {
      handled: true,
      message: {
        content: [
          `Core: Cluster Contract \`${params.clusterId}\` review accepted.`,
          `Commit: \`${reviewCommit.hash}\`.`,
          "Cluster Contract result is merge-ready for lead Product Part coordination.",
        ].join("\n"),
        tag: "managed-workflow-complete",
      },
    };
  }
}

export const handleClusterContractManagedReviewDecision = async (
  request: ClusterManagedReviewDecisionRequest
): Promise<boolean> => {
  const { options } = request;
  if (
    !(
      options.session.stage &&
      CLUSTER_STAGE_RE.test(options.session.stage) &&
      options.session.workspacePath &&
      options.session.initiativeSlug
    )
  ) {
    return false;
  }
  const result =
    await new ClusterContractReviewController().handleReviewDecision({
      content: options.content,
      intent: request.intent,
      sessionId: options.sessionId,
      stage: options.session.stage,
      workspaceRoot: options.session.workspacePath,
      workspaceSlug: options.session.initiativeSlug,
    });
  if (!result.handled) {
    return false;
  }
  if (!options.hiddenUserMessage) {
    request.eventMessages.appendDialogMessage(options.sessionId, {
      content: options.content,
      role: "user",
    });
  }
  request.eventMessages.appendCoreMessage(options.sessionId, result.message);
  if (result.nextInternalMessage) {
    await request.messageDispatch.sendInternalMessage(
      options.sessionId,
      result.nextInternalMessage
    );
  }
  return true;
};

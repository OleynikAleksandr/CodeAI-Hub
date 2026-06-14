import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  createDevelopmentOrderUnlockState,
  createDevelopmentOrderUnlockStatePath,
} from "../../development-tree/product-part-workflow/development-order-plan-unlock-state";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import { checkpointAcceptedProductPartOrderPlanFromLane } from "./product-part-brief-lane-checkpoint";
import { removeProductPartWorktrees } from "./product-part-worktree-cleanup";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

export type ProductPartOrderPlanReviewResult =
  | { readonly handled: false }
  | {
      readonly handled: true;
      readonly message: { readonly content: string; readonly tag: string };
    };

const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const ORDER_PLAN_JSON_FILE_NAME = "DevelopmentOrderPlan.draft.json";
const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)$/u;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const pathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  Boolean(await stat(path.join(workspaceRoot, relativePath)).catch(() => null));

const uniqueExistingPaths = async (
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> => {
  const existing: string[] = [];
  for (const relativePath of Array.from(new Set(paths))) {
    if (await pathExists(workspaceRoot, relativePath)) {
      existing.push(relativePath);
    }
  }
  return existing;
};

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

const createTaskPrefix = (partId: string): string =>
  `development-tree.product-part.${partId}`;

const createOrderPlanReviewTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase4.order-plan-review.task1`;

const createReturnTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase-return.user-return.task1`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createOrderPlanJsonPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${ORDER_PLAN_JSON_FILE_NAME}`;

const createContinuityIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/continuity/index.json`;

const parseStateBlock = (content: string): ManagedPlanState => {
  const rawBlock = content.split(PLAN_START)[1]?.split(PLAN_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error("Missing Product Part managed plan state block.");
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

const markOrderPlanReviewAccepted = (params: {
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly partId: string;
}): string => {
  const taskId = createOrderPlanReviewTaskId(params.partId);
  return params.content
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(taskId)}\` .*)$`,
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
    );
};

const markReturnInProgress = (params: {
  readonly content: string;
  readonly partId: string;
}): string =>
  params.content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(
        createReturnTaskId(params.partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1IN_PROGRESS$2"
  );

const nextItemNumber = (content: string): number => {
  const matches = [...content.matchAll(/^(\d+)\.\s+\[/gmu)];
  const last = Number(matches.at(-1)?.[1] ?? 0);
  return Number.isFinite(last) ? last + 1 : 1;
};

const appendReturnPhaseIfMissing = (params: {
  readonly content: string;
  readonly partId: string;
}): string => {
  if (params.content.includes(createReturnTaskId(params.partId))) {
    return params.content;
  }
  return [
    params.content.trimEnd(),
    "",
    "## Phase Return - User Return And Revisions",
    "",
    "### Stream: User Return And Revisions",
    "",
    `${nextItemNumber(params.content)}. [TODO] \`${createReturnTaskId(params.partId)}\` Product Part workflow is paused in an accepted state; user may return later with corrections or clarifications (scope: user workflow; expected commit: none).`,
    "",
  ].join("\n");
};

const readOrderPlanJson = async (params: {
  readonly partId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<Record<string, unknown> | null> => {
  const content = await readText(
    params.workspaceRoot,
    createOrderPlanJsonPath(params)
  ).catch(() => null);
  if (!content) {
    return null;
  }
  try {
    const parsed = JSON.parse(content) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const createBlockedMessage = (params: {
  readonly diagnostic: string;
  readonly partId: string;
}): ProductPartOrderPlanReviewResult => ({
  handled: true,
  message: {
    content: `Core: lead Product Part \`${params.partId}\` Development Order Plan acceptance blocked: ${params.diagnostic}`,
    tag: "managed-workflow-validation",
  },
});

export class ProductPartDevelopmentOrderPlanReviewController {
  private readonly git = new WorkflowBoundaryGit();

  async handleAccepted(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ProductPartOrderPlanReviewResult> {
    const partId = params.stage.match(PRODUCT_PART_STAGE_RE)?.[1] ?? null;
    if (!partId) {
      return { handled: false };
    }
    const planPath = createPlanPath(partId);
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock(planText);
    if (
      !(
        planState.currentTaskId === createOrderPlanReviewTaskId(partId) &&
        planState.expectedCommitMessage
      )
    ) {
      return { handled: false };
    }
    const managedDecisionPath = createManagedDecisionPath({
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    const unlockStatePath = createDevelopmentOrderUnlockStatePath({
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    const orderPlanJson = await readOrderPlanJson({
      partId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (!orderPlanJson) {
      return createBlockedMessage({
        diagnostic: `${ORDER_PLAN_JSON_FILE_NAME} is missing or invalid.`,
        partId,
      });
    }
    const updatedAt = new Date().toISOString();
    await writeText(
      params.workspaceRoot,
      unlockStatePath,
      `${JSON.stringify(
        createDevelopmentOrderUnlockState({
          acceptedOrderPlanCommitHash: planState.lastRecordedCommit ?? "",
          partId,
          plan: orderPlanJson,
          updatedAt,
          workspaceSlug: params.workspaceSlug,
        }),
        null,
        2
      )}\n`
    );
    await writeText(
      params.workspaceRoot,
      managedDecisionPath,
      `${JSON.stringify(
        {
          acceptedCommitHash: planState.lastRecordedCommit,
          acceptedCommitMessage: planState.expectedCommitMessage,
          orderPlanCommitHash: planState.lastRecordedCommit,
          partId,
          reviewState: "order_plan_accepted",
          schema: "codeai-development-order-plan-managed-v1",
          sessionId: params.sessionId,
          updatedAt,
        },
        null,
        2
      )}\n`
    );
    const commit = await this.git.commit({
      commitMessage: planState.expectedCommitMessage,
      paths: await uniqueExistingPaths(params.workspaceRoot, [
        managedDecisionPath,
        unlockStatePath,
        `.codeai-hub/${params.workspaceSlug}/continuity/${params.stage}/`,
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    if (commit.noStagedChanges) {
      return createBlockedMessage({
        diagnostic: `no staged changes for ${planState.expectedCommitMessage}.`,
        partId,
      });
    }
    await writeText(
      params.workspaceRoot,
      planPath,
      replaceStateBlock(
        markReturnInProgress({
          content: appendReturnPhaseIfMissing({
            content: markOrderPlanReviewAccepted({
              commitHash: commit.hash,
              commitMessage: planState.expectedCommitMessage,
              content: planText,
              partId,
            }),
            partId,
          }),
          partId,
        }),
        {
          ...planState,
          currentTaskId: createReturnTaskId(partId),
          expectedCommitMessage: null,
          lastRecordedCommit: commit.hash,
        }
      )
    );
    await this.git.commit({
      commitMessage: "chore: advance managed workflow ledger",
      paths: await uniqueExistingPaths(params.workspaceRoot, [
        planPath,
        managedDecisionPath,
        createContinuityIndexPath(params.workspaceSlug),
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    const checkpoint = await checkpointAcceptedProductPartOrderPlanFromLane({
      acceptedCommitHash: commit.hash,
      acceptedCommitMessage: planState.expectedCommitMessage,
      laneWorkspaceRoot: params.workspaceRoot,
      partId,
      sessionId: params.sessionId,
      workspaceSlug: params.workspaceSlug,
    });
    const removedWorktreePaths = await removeProductPartWorktrees({
      partId,
      workspacePath: checkpoint.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    return {
      handled: true,
      message: {
        content: [
          `Core: пользователь принял lead Product Part \`${partId}\` Development Order Plan.`,
          `Commit: \`${commit.hash}\`.`,
          checkpoint.checkpointed
            ? `Main checkpoint: \`${checkpoint.checkpointCommitHash}\`.`
            : "Main checkpoint: no staged changes.",
          removedWorktreePaths.length
            ? `Removed Product Part worktrees: ${removedWorktreePaths.map((value) => `\`${value}\``).join(", ")}.`
            : "Removed Product Part worktrees: none.",
          "Lead Product Part workflow завершён на accepted planning checkpoint; Cluster/Module sessions remain locked for a later verified-main phase.",
        ].join("\n"),
        tag: "managed-workflow-assignment",
      },
    };
  }
}

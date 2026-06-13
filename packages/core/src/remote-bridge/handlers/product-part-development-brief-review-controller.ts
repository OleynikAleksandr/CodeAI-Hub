import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import { checkpointAcceptedProductPartBriefFromLane } from "./product-part-brief-lane-checkpoint";
import { promoteDeferredLeadBriefReview } from "./product-part-brief-review-deferral";
import {
  prepareLeadOrderPlanDispatch,
  readLeadProductPartId,
  resolveLeadOrderPlanAssignment,
} from "./product-part-development-order-plan-assignment";
import { ProductPartDevelopmentOrderPlanReviewController } from "./product-part-development-order-plan-review-controller";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

export type ProductPartBriefReviewResult =
  | { readonly handled: false }
  | {
      readonly handled: true;
      readonly message: { readonly content: string; readonly tag: string };
      readonly nextInternalMessage?: string;
      readonly targetInternalMessage?: {
        readonly content: string;
        readonly sessionId: string;
      };
      readonly targetCoreMessage?: {
        readonly content: string;
        readonly sessionId: string;
        readonly tag: string;
      };
    };

const AGENT_TOUCHED_RE = /^agentTouched:\s*(?:false|true)\s*$/im;
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?/u;
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)$/u;
const STATUS_RE = /^status:\s*\S+\s*$/im;
const IS_LEAD_PLAN_RE = /^-\s+This Product Part is lead:\s+yes\.$/im;

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

const createReviewTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase2.brief-review.task1`;

const createReturnTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase-return.user-return.task1`;

const createOrderPlanTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase3.order-plan.task1`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createBriefPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/ProductPartDevelopmentBrief.draft.md`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

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

const markReviewTaskAccepted = (params: {
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly partId: string;
}): string => {
  const taskId = createReviewTaskId(params.partId);
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

const appendReturnPhaseIfMissing = (params: {
  readonly content: string;
  readonly partId: string;
}): string => {
  if (params.content.includes("User Return And Revisions")) {
    return params.content;
  }
  const taskId = createReturnTaskId(params.partId);
  return [
    params.content.trimEnd(),
    "",
    "## Phase Return - User Return And Revisions",
    "",
    "### Stream: User Return And Revisions",
    "",
    `${nextItemNumber(params.content)}. [IN_PROGRESS] \`${taskId}\` Product Part brief is accepted; user may return later with corrections or clarifications (scope: user workflow; expected commit: none).`,
    "",
  ].join("\n");
};

const markOrderPlanTaskInProgress = (content: string, partId: string): string =>
  content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(
        createOrderPlanTaskId(partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1IN_PROGRESS$2"
  );

const markOrderPlanTaskBlocked = (content: string, partId: string): string =>
  content.replace(
    new RegExp(
      `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS)(\\] \`${escapeRegExp(
        createOrderPlanTaskId(partId)
      )}\` .*)$`,
      "mu"
    ),
    "$1BLOCKED$2"
  );

const nextItemNumber = (content: string): number => {
  const matches = [...content.matchAll(/^(\d+)\.\s+\[/gmu)];
  const last = Number(matches.at(-1)?.[1] ?? 0);
  return Number.isFinite(last) ? last + 1 : 1;
};

const markBriefAccepted = (content: string): string => {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return `---\nstatus: accepted\nagentTouched: true\n---\n${content}`;
  }
  const frontmatter = match[1] ?? "";
  const withStatus = STATUS_RE.test(frontmatter)
    ? frontmatter.replace(STATUS_RE, "status: accepted")
    : `status: accepted\n${frontmatter}`;
  const nextFrontmatter = AGENT_TOUCHED_RE.test(withStatus)
    ? withStatus.replace(AGENT_TOUCHED_RE, "agentTouched: true")
    : `${withStatus}\nagentTouched: true`;
  return content.replace(FRONTMATTER_RE, `---\n${nextFrontmatter}\n---\n`);
};

export class ProductPartDevelopmentBriefReviewController {
  private readonly git = new WorkflowBoundaryGit();
  private readonly orderPlanReview =
    new ProductPartDevelopmentOrderPlanReviewController();

  async handleAccepted(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ProductPartBriefReviewResult> {
    const partId = params.stage.match(PRODUCT_PART_STAGE_RE)?.[1] ?? null;
    if (!partId) {
      return { handled: false };
    }
    const planPath = createPlanPath(partId);
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock(planText);
    if (
      !(
        planState.currentTaskId === createReviewTaskId(partId) &&
        planState.expectedCommitMessage
      )
    ) {
      return await this.orderPlanReview.handleAccepted(params);
    }
    const briefPath = createBriefPath({
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    await writeText(
      params.workspaceRoot,
      briefPath,
      markBriefAccepted(await readText(params.workspaceRoot, briefPath))
    );
    const commit = await this.git.commit({
      commitMessage: planState.expectedCommitMessage,
      paths: await uniqueExistingPaths(params.workspaceRoot, [
        briefPath,
        `.codeai-hub/${params.workspaceSlug}/continuity/${params.stage}/`,
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    if (commit.noStagedChanges) {
      return {
        handled: true,
        message: {
          content: `Core: Product Part \`${partId}\` acceptance blocked: no staged changes for ${planState.expectedCommitMessage}.`,
          tag: "managed-workflow-validation",
        },
      };
    }
    const managedDecisionPath = createManagedDecisionPath({
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    await writeText(
      params.workspaceRoot,
      managedDecisionPath,
      `${JSON.stringify(
        {
          acceptedCommitHash: commit.hash,
          acceptedCommitMessage: planState.expectedCommitMessage,
          partId,
          reviewState: "accepted",
          schema: "codeai-product-part-development-brief-managed-v1",
          sessionId: params.sessionId,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )}\n`
    );
    const checkpoint = await checkpointAcceptedProductPartBriefFromLane({
      acceptedCommitHash: commit.hash,
      acceptedCommitMessage: planState.expectedCommitMessage,
      laneWorkspaceRoot: params.workspaceRoot,
      partId,
      sessionId: params.sessionId,
      workspaceSlug: params.workspaceSlug,
    });
    const coordinationWorkspaceRoot = checkpoint.workspaceRoot;
    const isLeadPart = IS_LEAD_PLAN_RE.test(planText);
    const leadPartId = isLeadPart
      ? partId
      : await readLeadProductPartId({
          workspaceRoot: coordinationWorkspaceRoot,
          workspaceSlug: params.workspaceSlug,
        });
    const leadAssignment = leadPartId
      ? await resolveLeadOrderPlanAssignment({
          leadPartId,
          workspaceRoot: coordinationWorkspaceRoot,
          workspaceSlug: params.workspaceSlug,
        })
      : null;
    const startOrderPlan = isLeadPart && leadAssignment?.ready === true;
    const leadReviewPromotion =
      !isLeadPart && leadPartId
        ? await promoteDeferredLeadBriefReview({
            leadPartId,
            workspaceRoot: coordinationWorkspaceRoot,
            workspaceSlug: params.workspaceSlug,
          })
        : null;
    const leadDispatch =
      !(leadReviewPromotion || isLeadPart) &&
      leadAssignment?.ready === true &&
      leadPartId
        ? await prepareLeadOrderPlanDispatch({
            content: leadAssignment.prompt,
            leadPartId,
            workspaceRoot: coordinationWorkspaceRoot,
            workspaceSlug: params.workspaceSlug,
          })
        : null;
    await writeText(
      params.workspaceRoot,
      planPath,
      replaceStateBlock(
        createAcceptedPlanText({
          commitHash: commit.hash,
          content: planText,
          expectedCommitMessage: planState.expectedCommitMessage,
          partId,
          startOrderPlan,
        }),
        createNextPlanState({
          commitHash: commit.hash,
          partId,
          planState,
          planText,
        })
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
    const messageTag = createAcceptedMessageTag({
      isLeadPart,
      startOrderPlan,
    });
    return {
      handled: true,
      message: {
        content: createAcceptedMessage({
          commitHash: commit.hash,
          isLeadPart,
          leadBriefReviewDispatchMessage: leadReviewPromotion
            ? `Core: все secondary Product Part briefs приняты; lead Product Part \`${leadReviewPromotion.leadPartId}\` теперь открыт для пользовательской проверки.`
            : null,
          leadOrderPlanBlockedMessage:
            leadAssignment?.ready === false
              ? leadAssignment.blockedMessage
              : null,
          leadOrderPlanDispatchMessage: leadDispatch
            ? `Core: all Product Part briefs are accepted; lead Development Order Plan assignment was dispatched to lead Product Part \`${leadPartId}\`.`
            : null,
          partId,
        }),
        tag: messageTag,
      },
      nextInternalMessage: startOrderPlan ? leadAssignment?.prompt : undefined,
      targetInternalMessage: leadDispatch
        ? {
            content: leadDispatch.content,
            sessionId: leadDispatch.sessionId,
          }
        : undefined,
      targetCoreMessage: leadReviewPromotion
        ? {
            content: leadReviewPromotion.content,
            sessionId: leadReviewPromotion.sessionId,
            tag: "managed-workflow-user-review",
          }
        : undefined,
    };
  }
}

const createAcceptedMessageTag = (params: {
  readonly isLeadPart: boolean;
  readonly startOrderPlan: boolean;
}): string => {
  if (!params.isLeadPart) {
    return "managed-workflow-complete";
  }
  return params.startOrderPlan
    ? "managed-workflow-assignment"
    : "managed-workflow-validation";
};

const createAcceptedMessage = (params: {
  readonly commitHash: string;
  readonly isLeadPart: boolean;
  readonly leadBriefReviewDispatchMessage?: string | null;
  readonly leadOrderPlanDispatchMessage?: string | null;
  readonly leadOrderPlanBlockedMessage?: string | null;
  readonly partId: string;
}): string =>
  [
    `Core: пользователь принял Product Part \`${params.partId}\` Development Brief.`,
    `Commit: \`${params.commitHash}\`.`,
    params.leadBriefReviewDispatchMessage ??
      params.leadOrderPlanBlockedMessage ??
      params.leadOrderPlanDispatchMessage ??
      (params.isLeadPart
        ? "Lead Product Part review закрыт; Core запускает следующий managed assignment: Development Order Plan draft."
        : "Product Part review закрыт; сессия остаётся доступной для будущих правок."),
  ].join("\n");

const createAcceptedPlanText = (params: {
  readonly commitHash: string;
  readonly content: string;
  readonly expectedCommitMessage: string;
  readonly partId: string;
  readonly startOrderPlan: boolean;
}): string => {
  const accepted = markReviewTaskAccepted({
    commitHash: params.commitHash,
    commitMessage: params.expectedCommitMessage,
    content: params.content,
    partId: params.partId,
  });
  if (IS_LEAD_PLAN_RE.test(params.content)) {
    return params.startOrderPlan
      ? markOrderPlanTaskInProgress(accepted, params.partId)
      : markOrderPlanTaskBlocked(accepted, params.partId);
  }
  return appendReturnPhaseIfMissing({
    content: accepted,
    partId: params.partId,
  });
};

const createNextPlanState = (params: {
  readonly commitHash: string;
  readonly partId: string;
  readonly planState: ManagedPlanState;
  readonly planText: string;
}): ManagedPlanState =>
  IS_LEAD_PLAN_RE.test(params.planText)
    ? {
        ...params.planState,
        currentTaskId: createOrderPlanTaskId(params.partId),
        expectedCommitMessage: "docs: update lead development order plan",
        lastRecordedCommit: params.commitHash,
      }
    : {
        ...params.planState,
        currentTaskId: createReturnTaskId(params.partId),
        expectedCommitMessage: null,
        lastRecordedCommit: params.commitHash,
      };

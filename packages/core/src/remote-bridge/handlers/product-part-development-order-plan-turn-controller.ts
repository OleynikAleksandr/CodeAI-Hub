import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateDevelopmentOrderPlanV2 } from "../../development-tree/product-part-workflow/development-order-plan-v2-contract";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

type OrderPlanTurnResult =
  | { readonly handled: false }
  | {
      readonly handled: true;
      readonly message: { readonly content: string; readonly tag: string };
      readonly nextInternalMessage?: string;
    };

interface OrderPlanGitBoundary {
  readonly commitManagedChanges: (params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }) => Promise<{
    readonly hash: string | null;
    readonly noStagedChanges: boolean;
  }>;
}

const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const ORDER_PLAN_FILE_NAME = "DevelopmentOrderPlan.draft.md";
const ORDER_PLAN_JSON_FILE_NAME = "DevelopmentOrderPlan.draft.json";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)$/u;
const SENTINEL_RE = /CODEAI_AGENT_FILL_SENTINEL/u;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createTaskPrefix = (partId: string): string =>
  `development-tree.product-part.${partId}`;

const createOrderPlanTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase3.order-plan.task1`;

const createOrderPlanReviewTaskId = (partId: string): string =>
  `${createTaskPrefix(partId)}.phase4.order-plan-review.task1`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createOrderPlanPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${ORDER_PLAN_FILE_NAME}`;

const createOrderPlanJsonPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${ORDER_PLAN_JSON_FILE_NAME}`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createContinuityIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/continuity/index.json`;

const parseProductPartStage = (stage: string): string | null =>
  stage.match(PRODUCT_PART_STAGE_RE)?.[1] ?? null;

const fileExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  (
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null)
  )?.isFile() ?? false;

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

const markOrderPlanTaskReadyForReview = (params: {
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly partId: string;
}): string => {
  const taskId = createOrderPlanTaskId(params.partId);
  const reviewTaskId = createOrderPlanReviewTaskId(params.partId);
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
    )
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(reviewTaskId)}\` .*)$`,
        "mu"
      ),
      "$1IN_PROGRESS$2"
    );
};

const parseOrderPlanJson = (
  content: string
): Record<string, unknown> | null => {
  const parsed = JSON.parse(content) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : null;
};

const createBlockedMessage = (params: {
  readonly diagnostics: readonly string[];
  readonly nextInternalMessage?: string;
  readonly partId: string;
}): OrderPlanTurnResult => ({
  handled: true,
  message: {
    content: [
      `Core: lead Product Part \`${params.partId}\` Development Order Plan пока не готов к фиксации.`,
      "Проблемы:",
      ...params.diagnostics.map((diagnostic) => `- ${diagnostic}`),
    ].join("\n"),
    tag: "managed-workflow-validation",
  },
  nextInternalMessage: params.nextInternalMessage,
});

const createRepairPrompt = (params: {
  readonly diagnostics: readonly string[];
  readonly orderPlanJsonPath: string;
  readonly orderPlanPath: string;
  readonly partId: string;
}): string =>
  [
    `Core managed repair: lead Product Part \`${params.partId}\` Development Order Plan was rejected by the Core validator.`,
    "",
    "Continue in this same session. Repair both artifacts in place:",
    `- \`${params.orderPlanPath}\``,
    `- \`${params.orderPlanJsonPath}\``,
    "",
    "Diagnostics to fix:",
    ...params.diagnostics.map((diagnostic) => `- ${diagnostic}`),
    "",
    "Use only node ids that exist in the materialized Development Tree and match the validator shapes:",
    `- Cluster node: \`cluster:${params.partId}/<clusterId>\` with \`kind: "cluster"\` and \`clusterId\`.`,
    `- Module inside a cluster: \`module:${params.partId}/<clusterId>/<moduleId>\` with \`kind: "module"\`, \`clusterId\`, and \`moduleId\`.`,
    `- Standalone module: \`standalone-module:${params.partId}/<moduleId>\` with \`kind: "standalone_module"\` and \`moduleId\`; do not encode it as \`module:${params.partId}/<moduleId>\`.`,
    "",
    "The first wave may unlock only dependency-free `cluster` or `standalone_module` nodes. Keep module nodes inside clusters locked until their cluster contract exists.",
    "After editing, respond briefly that the repaired Development Order Plan artifacts are ready for Core validation.",
  ].join("\n");

export class ProductPartDevelopmentOrderPlanTurnController {
  private readonly gitBoundary: OrderPlanGitBoundary;

  constructor(gitBoundary: OrderPlanGitBoundary = new OrderPlanWorkflowGit()) {
    this.gitBoundary = gitBoundary;
  }

  async handleTurnCompleted(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<OrderPlanTurnResult> {
    const partId = parseProductPartStage(params.stage);
    if (!partId) {
      return { handled: false };
    }
    const planPath = createPlanPath(partId);
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock(planText);
    if (planState.currentTaskId !== createOrderPlanTaskId(partId)) {
      return { handled: false };
    }
    if (!planState.expectedCommitMessage) {
      return createBlockedMessage({
        diagnostics: ["Lead order-plan task has no expected commit message."],
        partId,
      });
    }
    return await this.commitOrderPlan({
      partId,
      planPath,
      planState,
      planText,
      sessionId: params.sessionId,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  private async commitOrderPlan(params: {
    readonly partId: string;
    readonly planPath: string;
    readonly planState: ManagedPlanState;
    readonly planText: string;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<OrderPlanTurnResult> {
    const orderPlanPath = createOrderPlanPath(params);
    const orderPlanJsonPath = createOrderPlanJsonPath(params);
    const diagnostics = await this.validateOrderPlanArtifacts({
      partId: params.partId,
      orderPlanJsonPath,
      orderPlanPath,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    if (diagnostics.length > 0) {
      return createBlockedMessage({
        diagnostics,
        nextInternalMessage: createRepairPrompt({
          diagnostics,
          orderPlanJsonPath,
          orderPlanPath,
          partId: params.partId,
        }),
        partId: params.partId,
      });
    }
    const gitCommit = await this.gitBoundary.commitManagedChanges({
      commitMessage: params.planState.expectedCommitMessage ?? "",
      managedPaths: await uniqueExistingPaths(params.workspaceRoot, [
        orderPlanPath,
        orderPlanJsonPath,
        `.codeai-hub/${params.workspaceSlug}/continuity/${params.stage}/`,
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    if (gitCommit.noStagedChanges || !gitCommit.hash) {
      return createBlockedMessage({
        diagnostics: [
          `No staged lead order-plan changes for commit "${params.planState.expectedCommitMessage}".`,
        ],
        partId: params.partId,
      });
    }
    await this.advancePlanAndLedger({
      ...params,
      commitHash: gitCommit.hash,
      orderPlanJsonPath,
      orderPlanPath,
    });
    return {
      handled: true,
      message: {
        content: [
          `Core: lead Product Part \`${params.partId}\` Development Order Plan принят и зафиксирован.`,
          `Commit: \`${gitCommit.hash}\`.`,
          "Теперь Development Order Plan открыт для пользовательской проверки.",
        ].join("\n"),
        tag: "managed-workflow-user-review",
      },
    };
  }

  private async validateOrderPlanArtifacts(params: {
    readonly orderPlanJsonPath: string;
    readonly orderPlanPath: string;
    readonly partId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly string[]> {
    const diagnostics: string[] = [];
    if (!(await fileExists(params.workspaceRoot, params.orderPlanPath))) {
      diagnostics.push(`Missing required artifact: ${params.orderPlanPath}`);
    }
    if (!(await fileExists(params.workspaceRoot, params.orderPlanJsonPath))) {
      diagnostics.push(
        `Missing required artifact: ${params.orderPlanJsonPath}`
      );
    }
    if (diagnostics.length > 0) {
      return diagnostics;
    }
    const markdown = await readText(params.workspaceRoot, params.orderPlanPath);
    if (markdown.trim().length < 20) {
      diagnostics.push(`${ORDER_PLAN_FILE_NAME}: draft content is too short.`);
    }
    if (SENTINEL_RE.test(markdown)) {
      diagnostics.push(
        `${ORDER_PLAN_FILE_NAME}: replace remaining CODEAI_AGENT_FILL_SENTINEL text before validation.`
      );
    }
    try {
      const json = parseOrderPlanJson(
        await readText(params.workspaceRoot, params.orderPlanJsonPath)
      );
      if (json) {
        diagnostics.push(
          ...(
            await validateDevelopmentOrderPlanV2({
              leadProductPartId: params.partId,
              plan: json,
              workspaceRoot: params.workspaceRoot,
              workspaceSlug: params.workspaceSlug,
            })
          ).diagnostics.map(
            (diagnostic) => `${ORDER_PLAN_JSON_FILE_NAME}: ${diagnostic}`
          )
        );
      } else {
        diagnostics.push(
          `${ORDER_PLAN_JSON_FILE_NAME}: root must be an object.`
        );
      }
    } catch (error) {
      diagnostics.push(
        `${ORDER_PLAN_JSON_FILE_NAME}: invalid JSON (${error instanceof Error ? error.message : String(error)}).`
      );
    }
    return diagnostics;
  }

  private async advancePlanAndLedger(params: {
    readonly commitHash: string;
    readonly orderPlanJsonPath: string;
    readonly orderPlanPath: string;
    readonly partId: string;
    readonly planPath: string;
    readonly planState: ManagedPlanState;
    readonly planText: string;
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const managedDecisionPath = createManagedDecisionPath(params);
    await writeText(
      params.workspaceRoot,
      managedDecisionPath,
      `${JSON.stringify(
        {
          acceptedCommitHash: params.commitHash,
          acceptedCommitMessage: params.planState.expectedCommitMessage,
          files: [params.orderPlanPath, params.orderPlanJsonPath],
          partId: params.partId,
          reviewState: "order_plan_ready_for_review",
          schema: "codeai-development-order-plan-managed-v1",
          sessionId: params.sessionId,
          updatedAt: new Date().toISOString(),
        },
        null,
        2
      )}\n`
    );
    await writeText(
      params.workspaceRoot,
      params.planPath,
      replaceStateBlock(
        markOrderPlanTaskReadyForReview({
          commitHash: params.commitHash,
          commitMessage: params.planState.expectedCommitMessage ?? "",
          content: params.planText,
          partId: params.partId,
        }),
        {
          ...params.planState,
          currentTaskId: createOrderPlanReviewTaskId(params.partId),
          expectedCommitMessage: "docs: accept lead development order plan",
          lastRecordedCommit: params.commitHash,
        }
      )
    );
    await this.gitBoundary.commitManagedChanges({
      commitMessage: "chore: advance managed workflow ledger",
      managedPaths: await uniqueExistingPaths(params.workspaceRoot, [
        params.planPath,
        managedDecisionPath,
        createContinuityIndexPath(params.workspaceSlug),
      ]),
      workspaceRoot: params.workspaceRoot,
    });
  }
}

class OrderPlanWorkflowGit implements OrderPlanGitBoundary {
  private readonly git = new WorkflowBoundaryGit();

  async commitManagedChanges(params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<{
    readonly hash: string | null;
    readonly noStagedChanges: boolean;
  }> {
    const commit = await this.git.commit({
      commitMessage: params.commitMessage,
      paths: params.managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
    return {
      hash: commit.noStagedChanges ? null : commit.hash,
      noStagedChanges: commit.noStagedChanges,
    };
  }
}

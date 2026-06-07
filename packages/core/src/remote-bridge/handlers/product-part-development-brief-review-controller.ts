import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

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
      return { handled: false };
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
        `.codeai-hub/${params.workspaceSlug}/runtime/sessions/`,
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
    await writeText(
      params.workspaceRoot,
      planPath,
      replaceStateBlock(
        markReviewTaskAccepted({
          commitHash: commit.hash,
          commitMessage: planState.expectedCommitMessage,
          content: planText,
          partId,
        }),
        {
          ...planState,
          currentTaskId: null,
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
    return {
      handled: true,
      message: {
        content: [
          `Core: пользователь принял Product Part \`${partId}\` Development Brief.`,
          `Commit: \`${commit.hash}\`.`,
          "Product Part review закрыт; сессия остаётся доступной для будущих правок.",
        ].join("\n"),
        tag: "managed-workflow-complete",
      },
    };
  }
}

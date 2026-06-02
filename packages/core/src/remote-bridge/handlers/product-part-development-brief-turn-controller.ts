import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DraftReadinessClassifier } from "../../development-tree/node-bootstrap/draft-readiness-classifier";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

export interface ProductPartBriefMessage {
  readonly content: string;
  readonly tag: string;
}

export type ProductPartBriefTurnResult =
  | {
      readonly handled: false;
    }
  | {
      readonly handled: true;
      readonly message: ProductPartBriefMessage;
    };

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

interface ProductPartBriefTurnControllerOptions {
  readonly gitBoundary?: ProductPartManagedGitBoundary;
}

interface ProductPartManagedGitBoundary {
  readonly commitManagedChanges: (params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }) => Promise<{
    readonly hash: string | null;
    readonly noStagedChanges: boolean;
  }>;
}

const BRIEF_FILE_NAME = "ProductPartDevelopmentBrief.draft.md";
const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;
const PLAN_END = "<!-- codeai-plan-state:end -->";
const PLAN_START = "<!-- codeai-plan-state:start -->";
const PRODUCT_PART_STAGE_RE =
  /^development_tree\/materialized\/product-parts\/([^/]+)$/u;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const readText = async (
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

const parseProductPartStage = (stage: string): string | null =>
  stage.match(PRODUCT_PART_STAGE_RE)?.[1] ?? null;

const createBriefPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/${BRIEF_FILE_NAME}`;

const createPlanPath = (partId: string): string =>
  `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;

const createManagedDecisionPath = (params: {
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/workflow/managed/development-tree-product-parts/${params.partId}.json`;

const createTaskPrefix = (partId: string): string =>
  `development-tree.product-part.${partId}`;

const parseStateBlock = <TState>(content: string): TState => {
  const rawBlock = content.split(PLAN_START)[1]?.split(PLAN_END)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error("Missing Product Part managed plan state block.");
  }
  return JSON.parse(json) as TState;
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

const markBriefTaskAccepted = (params: {
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly currentTaskId: string;
  readonly partId: string;
}): string => {
  const reviewTaskId = `${createTaskPrefix(params.partId)}.phase2.brief-review.task1`;
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      params.currentTaskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(
      params.commitMessage
    )}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
    "mu"
  );
  const reviewPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(reviewTaskId)}\` .*)$`,
    "mu"
  );
  return params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, `$1DONE$2${params.commitHash}$3`)
    .replace(reviewPattern, "$1IN_PROGRESS$2");
};

const buildReadyDecision = (params: {
  readonly classification: ReturnType<DraftReadinessClassifier["classify"]>;
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly partId: string;
  readonly sessionId: string;
}): string =>
  `${JSON.stringify(
    {
      acceptedCommitHash: params.commitHash,
      acceptedCommitMessage: params.commitMessage,
      files: params.classification.files,
      partId: params.partId,
      readiness: params.classification.readiness,
      schema: "codeai-product-part-development-brief-managed-v1",
      sessionId: params.sessionId,
      updatedAt: new Date().toISOString(),
    },
    null,
    2
  )}\n`;

const createReadyMessage = (params: {
  readonly commitHash: string;
  readonly partId: string;
}): ProductPartBriefMessage => ({
  content: [
    `Core: Product Part \`${params.partId}\` Development Brief принят и зафиксирован.`,
    `Commit: \`${params.commitHash}\`.`,
    "Теперь этот brief открыт для пользовательской проверки в Product Part todo-plan.",
  ].join("\n"),
  tag: "managed-workflow-user-review",
});

const createBlockedMessage = (params: {
  readonly diagnostics: readonly string[];
  readonly partId: string;
}): ProductPartBriefMessage => ({
  content: [
    `Core: Product Part \`${params.partId}\` Development Brief пока не готов к фиксации.`,
    "Проблемы:",
    ...params.diagnostics.map((diagnostic) => `- ${diagnostic}`),
  ].join("\n"),
  tag: "managed-workflow-validation",
});

export class ProductPartDevelopmentBriefTurnController {
  private readonly classifier = new DraftReadinessClassifier();
  private readonly gitBoundary: ProductPartManagedGitBoundary;

  constructor(options: ProductPartBriefTurnControllerOptions = {}) {
    this.gitBoundary =
      options.gitBoundary ?? new ProductPartWorkflowGitBoundary();
  }

  async handleTurnCompleted(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ProductPartBriefTurnResult> {
    const partId = parseProductPartStage(params.stage);
    if (!partId) {
      return { handled: false };
    }

    const briefPath = createBriefPath({
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    if (!(await fileExists(params.workspaceRoot, briefPath))) {
      return {
        handled: true,
        message: createBlockedMessage({
          diagnostics: [`Missing required artifact: ${briefPath}`],
          partId,
        }),
      };
    }

    const briefContent = await readText(params.workspaceRoot, briefPath);
    const classification = this.classifier.classify({
      files: [{ content: briefContent, fileName: BRIEF_FILE_NAME }],
      kind: "product_part",
    });
    if (classification.readiness !== "ready") {
      return {
        handled: true,
        message: createBlockedMessage({
          diagnostics: classification.files.map(
            (file) =>
              `${file.fileName}: ${file.readiness}, filled ${file.filledAgentFillSections}/${file.requiredAgentFillSections} agent-fill sections`
          ),
          partId,
        }),
      };
    }

    return await this.commitAcceptedBrief({
      classification,
      partId,
      sessionId: params.sessionId,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  private async commitAcceptedBrief(params: {
    readonly classification: ReturnType<DraftReadinessClassifier["classify"]>;
    readonly partId: string;
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ProductPartBriefTurnResult> {
    const planPath = createPlanPath(params.partId);
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock<ManagedPlanState>(planText);
    if (!(planState.currentTaskId && planState.expectedCommitMessage)) {
      return {
        handled: true,
        message: createBlockedMessage({
          diagnostics: [
            "Product Part todo-plan does not point to an active commit-backed task.",
          ],
          partId: params.partId,
        }),
      };
    }

    const managedDecisionPath = createManagedDecisionPath(params);
    const briefPath = createBriefPath(params);
    const gitCommit = await this.gitBoundary.commitManagedChanges({
      commitMessage: planState.expectedCommitMessage,
      managedPaths: await uniqueExistingPaths(params.workspaceRoot, [
        briefPath,
        `.codeai-hub/${params.workspaceSlug}/continuity/${params.stage}/`,
      ]),
      workspaceRoot: params.workspaceRoot,
    });
    if (gitCommit.noStagedChanges || !gitCommit.hash) {
      return {
        handled: true,
        message: createBlockedMessage({
          diagnostics: [
            `No staged Product Part brief changes for commit "${planState.expectedCommitMessage}".`,
          ],
          partId: params.partId,
        }),
      };
    }

    await writeText(
      params.workspaceRoot,
      managedDecisionPath,
      buildReadyDecision({
        classification: params.classification,
        commitHash: gitCommit.hash,
        commitMessage: planState.expectedCommitMessage,
        partId: params.partId,
        sessionId: params.sessionId,
      })
    );
    await writeText(
      params.workspaceRoot,
      planPath,
      replaceStateBlock(
        markBriefTaskAccepted({
          commitHash: gitCommit.hash,
          commitMessage: planState.expectedCommitMessage,
          content: planText,
          currentTaskId: planState.currentTaskId,
          partId: params.partId,
        }),
        {
          ...planState,
          currentTaskId: `${createTaskPrefix(
            params.partId
          )}.phase2.brief-review.task1`,
          expectedCommitMessage: `docs: accept ${params.partId} product part development brief`,
          lastRecordedCommit: gitCommit.hash,
        }
      )
    );
    await this.gitBoundary.commitManagedChanges({
      commitMessage: "chore: advance managed workflow ledger",
      managedPaths: [planPath, managedDecisionPath],
      workspaceRoot: params.workspaceRoot,
    });
    return {
      handled: true,
      message: createReadyMessage({
        commitHash: gitCommit.hash,
        partId: params.partId,
      }),
    };
  }
}

class ProductPartWorkflowGitBoundary implements ProductPartManagedGitBoundary {
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

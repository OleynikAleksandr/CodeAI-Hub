import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";

interface ManagedPlanState {
  readonly currentTaskId: string | null;
  readonly expectedCommitMessage: string | null;
  readonly lastRecordedCommit: string | null;
  readonly [key: string]: unknown;
}

export type ClusterContractTurnResult =
  | { readonly handled: false }
  | {
      readonly handled: true;
      readonly message: { readonly content: string; readonly tag: string };
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

const createDraftTaskId = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string => `${createTaskPrefix(params)}.phase1.contract-draft.task1`;

const createReviewTaskId = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string => `${createTaskPrefix(params)}.phase2.contract-review.task1`;

const createPlanPath = (params: {
  readonly clusterId: string;
  readonly partId: string;
}): string =>
  `doc/TODO/stages/development-tree/product-parts/${params.partId}/clusters/${params.clusterId}/todo-plan.md`;

const createContinuityLedgerPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/continuity`;

const createArtifactPath = (params: {
  readonly clusterId: string;
  readonly fileName: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): string =>
  `.codeai-hub/${params.workspaceSlug}/development_tree/materialized/product-parts/${params.partId}/clusters/${params.clusterId}/${params.fileName}`;

const requiredArtifactPaths = (params: {
  readonly clusterId: string;
  readonly partId: string;
  readonly workspaceSlug: string;
}): readonly string[] =>
  [
    "ClusterSpecification.draft.md",
    "ClusterSpecification.draft.json",
    "ClusterFacadeContract.draft.md",
    "ClusterFacadeContract.draft.json",
  ].map((fileName) => createArtifactPath({ ...params, fileName }));

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

const markDraftReadyForReview = (params: {
  readonly clusterId: string;
  readonly commitHash: string;
  readonly commitMessage: string;
  readonly content: string;
  readonly partId: string;
}): string =>
  params.content
    .replace(
      new RegExp(
        `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(createDraftTaskId(params))}\` .*)$`,
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
        `^(\\d+\\. \\[)(?:TODO|BLOCKED)(\\] \`${escapeRegExp(createReviewTaskId(params))}\` .*)$`,
        "mu"
      ),
      "$1IN_PROGRESS$2"
    );

const fileExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  (
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null)
  )?.isFile() ?? false;

const validateArtifacts = async (params: {
  readonly artifactPaths: readonly string[];
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const diagnostics: string[] = [];
  for (const artifactPath of params.artifactPaths) {
    if (!(await fileExists(params.workspaceRoot, artifactPath))) {
      diagnostics.push(`Missing required artifact: ${artifactPath}`);
      continue;
    }
    const content = await readText(params.workspaceRoot, artifactPath);
    if (artifactPath.endsWith(".md") && content.trim().length < 20) {
      diagnostics.push(`${artifactPath}: markdown content is incomplete.`);
    }
    if (artifactPath.endsWith(".json")) {
      const parsed = JSON.parse(content) as unknown;
      if (!(parsed && typeof parsed === "object" && !Array.isArray(parsed))) {
        diagnostics.push(`${artifactPath}: JSON root must be an object.`);
      }
    }
  }
  return diagnostics;
};

const blocked = (
  diagnostics: readonly string[]
): ClusterContractTurnResult => ({
  handled: true,
  message: {
    content: [
      "Core: Cluster Contract artifacts are not ready for review.",
      "Diagnostics:",
      ...diagnostics.map((diagnostic) => `- ${diagnostic}`),
    ].join("\n"),
    tag: "managed-workflow-validation",
  },
});

export class ClusterContractTurnController {
  private readonly git = new WorkflowBoundaryGit();

  async handleTurnCompleted(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ClusterContractTurnResult> {
    const match = params.stage.match(CLUSTER_STAGE_RE);
    const partId = match?.[1];
    const clusterId = match?.[2];
    if (!(partId && clusterId)) {
      return { handled: false };
    }
    const planPath = createPlanPath({ clusterId, partId });
    const planText = await readText(params.workspaceRoot, planPath);
    const planState = parseStateBlock(planText);
    if (planState.currentTaskId !== createDraftTaskId({ clusterId, partId })) {
      return { handled: false };
    }
    if (!planState.expectedCommitMessage) {
      return blocked(["Cluster Contract draft task has no expected commit."]);
    }
    const artifactPaths = requiredArtifactPaths({
      clusterId,
      partId,
      workspaceSlug: params.workspaceSlug,
    });
    const diagnostics = await validateArtifacts({
      artifactPaths,
      workspaceRoot: params.workspaceRoot,
    }).catch((error: unknown) => [
      error instanceof Error ? error.message : String(error),
    ]);
    if (diagnostics.length > 0) {
      return blocked(diagnostics);
    }
    const draftCommit = await this.git.commit({
      commitMessage: planState.expectedCommitMessage,
      paths: artifactPaths,
      workspaceRoot: params.workspaceRoot,
    });
    if (draftCommit.noStagedChanges) {
      return blocked(["No staged Cluster Contract artifact changes."]);
    }
    await writeText(
      params.workspaceRoot,
      planPath,
      replaceStateBlock(
        markDraftReadyForReview({
          clusterId,
          commitHash: draftCommit.hash,
          commitMessage: planState.expectedCommitMessage,
          content: planText,
          partId,
        }),
        {
          ...planState,
          currentTaskId: createReviewTaskId({ clusterId, partId }),
          expectedCommitMessage: `docs: accept ${clusterId} cluster contract`,
          lastRecordedCommit: draftCommit.hash,
        }
      )
    );
    await this.git.commit({
      commitMessage: "chore: advance managed workflow ledger",
      paths: [planPath, createContinuityLedgerPath(params.workspaceSlug)],
      workspaceRoot: params.workspaceRoot,
    });
    return {
      handled: true,
      message: {
        content: [
          `Core: Cluster Contract \`${clusterId}\` draft accepted for review.`,
          `Commit: \`${draftCommit.hash}\`.`,
          "Cluster Contract artifacts are ready for user or lead Product Part review.",
        ].join("\n"),
        tag: "managed-workflow-user-review",
      },
    };
  }
}

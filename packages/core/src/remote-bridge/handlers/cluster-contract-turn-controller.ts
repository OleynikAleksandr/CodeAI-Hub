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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

const hasNonEmptyArray = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0;

const hasConcreteMethod = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.some((item) => {
    const method = asRecord(item);
    return Boolean(
      asString(method?.name) &&
        asString(method?.signature) &&
        asString(method?.inputType) &&
        asString(method?.outputType)
    );
  });

const hasConcreteModuleBoundary = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.some((item) => {
    const boundary = asRecord(item);
    return Boolean(
      asString(boundary?.moduleId) &&
        hasNonEmptyArray(boundary?.inputs) &&
        hasNonEmptyArray(boundary?.outputs)
    );
  });

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

const validateConcreteFacadeContract = (
  artifactPath: string,
  parsed: unknown
): readonly string[] => {
  const diagnostics: string[] = [];
  const root = asRecord(parsed);
  const facade = asRecord(root?.facade);
  if (!asString(facade?.className)) {
    diagnostics.push(`${artifactPath}: facade.className is required.`);
  }
  if (!asString(facade?.filePath)) {
    diagnostics.push(`${artifactPath}: facade.filePath is required.`);
  }
  if (!hasConcreteMethod(facade?.methods)) {
    diagnostics.push(
      `${artifactPath}: facade.methods must include name, signature, inputType, and outputType.`
    );
  }
  if (!hasNonEmptyArray(root?.inputTypes)) {
    diagnostics.push(`${artifactPath}: inputTypes must be non-empty.`);
  }
  if (!hasNonEmptyArray(root?.outputTypes)) {
    diagnostics.push(`${artifactPath}: outputTypes must be non-empty.`);
  }
  if (!asRecord(root?.resultUnion)) {
    diagnostics.push(`${artifactPath}: resultUnion object is required.`);
  }
  if (!hasConcreteModuleBoundary(root?.moduleBoundaries)) {
    diagnostics.push(
      `${artifactPath}: moduleBoundaries must include moduleId, inputs, and outputs.`
    );
  }
  return diagnostics;
};

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
        continue;
      }
      if (artifactPath.endsWith("ClusterFacadeContract.draft.json")) {
        diagnostics.push(
          ...validateConcreteFacadeContract(artifactPath, parsed)
        );
      }
    }
  }
  return diagnostics;
};

const blocked = (
  diagnostics: readonly string[],
  nextInternalMessage?: string
): ClusterContractTurnResult => ({
  handled: true,
  message: {
    content: [
      "Core: Cluster Contract artifacts are not ready for review.",
      "Diagnostics:",
      ...diagnostics.map((diagnostic) => `- ${diagnostic}`),
      ...(nextInternalMessage
        ? ["", "Полный repair prompt отправлен агенту внутренним сообщением."]
        : [
            "",
            "The input is released. Send any message and Core will re-validate the cluster contract from the current state.",
          ]),
    ].join("\n"),
    tag: "managed-workflow-validation",
  },
  nextInternalMessage,
});

const createRepairPrompt = (params: {
  readonly artifactPaths: readonly string[];
  readonly clusterId: string;
  readonly diagnostics: readonly string[];
  readonly partId: string;
}): string =>
  [
    `Core managed repair: Cluster Contract artifacts for \`${params.partId}/${params.clusterId}\` were rejected by the Core validator.`,
    "",
    "Continue in this same cluster-contract session. Repair the draft artifacts in place:",
    ...params.artifactPaths.map((artifactPath) => `- \`${artifactPath}\``),
    "",
    "Diagnostics to fix:",
    ...params.diagnostics.map((diagnostic) => `- ${diagnostic}`),
    "",
    "The Cluster Facade Contract is a concrete pre-code API contract, not a narrative architecture note.",
    "The JSON must define the future facade class/file, public method signatures, named input DTOs, named output DTOs, a discriminated result union, and module boundary inputs/outputs.",
    "Use the Product Part Contract Seed as the parent-owned source of required inputs, outputs, statuses/errors, consumers, and owned modules; only refine it where the cluster boundary requires more precision.",
    "If a required boundary is genuinely ambiguous, add a blocking question in the markdown and JSON instead of inventing an implementation detail.",
    "",
    "After editing, respond briefly that the repaired Cluster Contract artifacts are ready for Core validation.",
  ].join("\n");

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
      return blocked(
        diagnostics,
        createRepairPrompt({ artifactPaths, clusterId, diagnostics, partId })
      );
    }
    const draftCommit = await this.git.commit({
      commitMessage: planState.expectedCommitMessage,
      paths: artifactPaths,
      workspaceRoot: params.workspaceRoot,
    });
    if (!draftCommit.hash) {
      return blocked(["No reachable Git commit for the cluster contract."]);
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

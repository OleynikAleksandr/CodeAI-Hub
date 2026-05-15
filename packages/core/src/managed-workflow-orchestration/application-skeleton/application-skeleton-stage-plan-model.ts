import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

export const PLAN_START = "<!-- codeai-plan-state:start -->";
export const PLAN_END = "<!-- codeai-plan-state:end -->";
export const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
export const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";

export const APPLICATION_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
export const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
export const DRAFT_TASK_ID = "application-skeleton.phase1.draft.task1";
export const DRAFT_COMMIT_MESSAGE = "docs: draft application skeleton contract";
export const REVIEW_TASK_PREFIX = "application-skeleton.phase2.review.task";
const MATERIALIZE_TASK_PREFIX = "application-skeleton.phase3.materialize.task";
export const MATERIALIZE_COMMIT_MESSAGE =
  "feat: materialize application skeleton attempt 1";
export const PHASE4_TASK_ID = "application-skeleton.phase4.user-return.task1";

const NO_REVISION_DISPOSITION =
  "not-created-user-accepted-without-review-revision";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;
const TSCONFIG_RE = /^tsconfig(?:\..+)?\.json$/u;

export interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}

export interface ManagedWorkspaceState {
  acceptedCommits?: unknown[];
  activePlanPath?: string | null;
  activeStage?: string | null;
  completedStages?: unknown[];
  lastAcceptedCommitHash?: string | null;
  lastAcceptedCommitMessage?: string | null;
  unlockedStages?: unknown[];
  [key: string]: unknown;
}

export interface NextPlanStep {
  readonly expectedCommitMessage: string | null;
  readonly taskId: string | null;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const readText = async (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

export const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const pathExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  Boolean(await stat(path.join(workspaceRoot, relativePath)).catch(() => null));

export const parseStateBlock = <TState>(
  content: string,
  startMarker: string,
  endMarker: string
): TState => {
  const rawBlock = content.split(startMarker)[1]?.split(endMarker)[0];
  const json = rawBlock
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    throw new Error(`Missing managed state block: ${startMarker}`);
  }
  return JSON.parse(json) as TState;
};

export const replaceStateBlock = (
  content: string,
  startMarker: string,
  endMarker: string,
  state: unknown
): string => {
  const blockPattern = new RegExp(
    `${escapeRegExp(startMarker)}[\\s\\S]*?${escapeRegExp(endMarker)}`,
    "u"
  );
  return content.replace(
    blockPattern,
    `${startMarker}\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n${endMarker}`
  );
};

const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};

export const addUnique = <TValue>(
  values: readonly unknown[] | undefined,
  value: TValue
): unknown[] => {
  const existing = Array.isArray(values) ? values : [];
  return existing.includes(value) ? [...existing] : [...existing, value];
};

export const buildContractArtifactPaths = (
  workspaceSlug: string
): readonly string[] => [
  `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
  `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
];

const buildReviewCommitMessage = (reviewNumber: number): string =>
  `docs: revise application skeleton review revision ${reviewNumber}`;

const buildReviewTaskId = (reviewNumber: number): string =>
  `${REVIEW_TASK_PREFIX}${reviewNumber}`;

export const buildMaterializeTaskId = (attemptNumber: number): string =>
  `${MATERIALIZE_TASK_PREFIX}${attemptNumber}`;

const parseReviewTaskNumber = (taskId: string): number | null => {
  if (!taskId.startsWith(REVIEW_TASK_PREFIX)) {
    return null;
  }
  const value = Number(taskId.slice(REVIEW_TASK_PREFIX.length));
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const resolveNextAfterCommit = (params: {
  readonly currentTaskId: string;
  readonly decision: ApplicationSkeletonManagedValidationResult;
}): NextPlanStep => {
  if (params.currentTaskId === DRAFT_TASK_ID) {
    return {
      expectedCommitMessage: buildReviewCommitMessage(1),
      taskId: buildReviewTaskId(1),
    };
  }
  const reviewNumber = parseReviewTaskNumber(params.currentTaskId);
  if (reviewNumber !== null) {
    const nextReviewNumber = reviewNumber + 1;
    return {
      expectedCommitMessage: buildReviewCommitMessage(nextReviewNumber),
      taskId: buildReviewTaskId(nextReviewNumber),
    };
  }
  if (params.decision.nextAction === "open_persistent_return") {
    return { expectedCommitMessage: null, taskId: PHASE4_TASK_ID };
  }
  return { expectedCommitMessage: null, taskId: null };
};

const appendReviewStep = (content: string, reviewNumber: number): string => {
  const taskId = buildReviewTaskId(reviewNumber);
  if (content.includes(`\`${taskId}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  const phaseHeader =
    reviewNumber === 1
      ? [
          "",
          "## Phase 2 — Application Skeleton Contract Review",
          "",
          "### Stream: User-Led Review",
          "",
        ]
      : [""];
  return [
    content.trimEnd(),
    ...phaseHeader,
    `${nextNumber}. [IN_PROGRESS] \`${taskId}\` User reviews the Application Skeleton contract and either accepts it or requests revision (scope: user decision + \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${buildReviewCommitMessage(reviewNumber)}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${buildReviewCommitMessage(reviewNumber)}\` (hash: TBD)`,
    "",
  ].join("\n");
};

export const appendMaterializationStep = (content: string): string => {
  const taskId = buildMaterializeTaskId(1);
  if (content.includes(`\`${taskId}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return [
    content.trimEnd(),
    "",
    "## Phase 3 — Application Skeleton Materialization",
    "",
    "### Stream: Filesystem Projection",
    "",
    `${nextNumber}. [IN_PROGRESS] \`${taskId}\` Materialize the user-accepted Application Skeleton contract into the workspace filesystem and stop for Core validation (scope: \`product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${MATERIALIZE_COMMIT_MESSAGE}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${MATERIALIZE_COMMIT_MESSAGE}\` (hash: TBD)`,
    "",
  ].join("\n");
};

const appendPersistentReturnStep = (content: string): string => {
  if (content.includes(`\`${PHASE4_TASK_ID}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return [
    content.trimEnd(),
    "",
    "## Phase 4 — Persistent Application Skeleton User Return",
    "",
    "### Stream: User Return And Revisions",
    "",
    `${nextNumber}. [IN_PROGRESS] \`${PHASE4_TASK_ID}\` Persistent Application Skeleton return phase is open for future user revisions after accepted materialization (scope: user workflow; expected commit: none).`,
    `${nextNumber + 1}. [DONE] Git Commit: \`not-created-persistent-user-return-open\` (hash: not-created-persistent-user-return-open)`,
    "",
  ].join("\n");
};

export const updateStagePlanAfterCommit = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly next: NextPlanStep;
}): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      params.currentTaskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(
      params.expectedCommitMessage
    )}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
    "mu"
  );
  const markedDone = params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, `$1DONE$2${params.hash}$3`);
  if (params.next.taskId?.startsWith(REVIEW_TASK_PREFIX)) {
    return appendReviewStep(
      markedDone,
      Number(params.next.taskId.slice(REVIEW_TASK_PREFIX.length))
    );
  }
  if (params.next.taskId === PHASE4_TASK_ID) {
    return appendPersistentReturnStep(markedDone);
  }
  return markedDone;
};

export const markReviewAcceptedWithoutRevision = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
}): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      params.currentTaskId
    )}\` .*)$`,
    "mu"
  );
  const commitPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|PENDING|IN_PROGRESS|BLOCKED)(\\] Git Commit: \`${escapeRegExp(
      params.expectedCommitMessage
    )}\` \\(hash: )(?:TBD|[^)]+)(\\))$`,
    "mu"
  );
  return params.content
    .replace(taskPattern, "$1DONE$2")
    .replace(commitPattern, `$1DONE$2${NO_REVISION_DISPOSITION}$3`);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectCodePathsFromNode = (node: Record<string, unknown>): string[] => {
  const paths: string[] = [];
  if (typeof node.codePath === "string") {
    paths.push(node.codePath);
  }
  for (const key of ["clusters", "modules", "standaloneModules"]) {
    const children = node[key];
    if (!Array.isArray(children)) {
      continue;
    }
    for (const child of children) {
      if (isRecord(child)) {
        paths.push(...collectCodePathsFromNode(child));
      }
    }
  }
  return paths;
};

export const collectMaterializedPaths = (
  mapJson: Record<string, unknown> | null
): readonly string[] => {
  if (!mapJson) {
    return [];
  }
  const direct = Array.isArray(mapJson.materializedPaths)
    ? mapJson.materializedPaths.filter(
        (entry): entry is string => typeof entry === "string"
      )
    : [];
  const codePaths = Array.isArray(mapJson.productParts)
    ? mapJson.productParts.flatMap((part) =>
        isRecord(part) ? collectCodePathsFromNode(part) : []
      )
    : [];
  const sourceRoot =
    typeof mapJson.sourceRoot === "string" && mapJson.sourceRoot.trim()
      ? [mapJson.sourceRoot.trim()]
      : [];
  return Array.from(new Set([...direct, ...codePaths, ...sourceRoot]));
};

export const collectRootConfigPaths = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const entries = await readdir(workspaceRoot).catch(() => []);
  return entries.filter(
    (entry) =>
      entry === "package.json" ||
      entry === "package-lock.json" ||
      entry === "npm-shrinkwrap.json" ||
      TSCONFIG_RE.test(entry)
  );
};

export const uniqueExistingPaths = async (
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

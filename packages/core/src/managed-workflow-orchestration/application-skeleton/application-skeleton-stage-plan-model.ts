import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  appendDraftRepairStep,
  appendMaterializationRepairStep,
  DRAFT_TASK_ID,
  parseDraftRepairTaskNumber,
  parseMaterializationRepairTaskNumber,
} from "./application-skeleton-stage-plan-repair-model";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

export {
  DRAFT_COMMIT_MESSAGE,
  DRAFT_TASK_ID,
  openDraftStagePlan,
  resolveNextAfterRejectedCommit,
} from "./application-skeleton-stage-plan-repair-model";

export const PLAN_START = "<!-- codeai-plan-state:start -->";
export const PLAN_END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";

export const APPLICATION_STAGE_PLAN_PATH =
  "doc/TODO/stages/application-skeleton/todo-plan.md";
export const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
export const REVIEW_TASK_PREFIX = "application-skeleton.phase2.review.task";
const MATERIALIZE_TASK_PREFIX = "application-skeleton.phase3.materialize.task";
export const MATERIALIZE_COMMIT_MESSAGE =
  "feat: materialize application skeleton attempt 1";
export const PHASE4_TASK_ID = "application-skeleton.phase4.final-review.task1";
export const PERSISTENT_RETURN_TASK_ID =
  "application-skeleton.phase5.user-return.task1";

const NO_REVISION_DISPOSITION =
  "not-created-user-accepted-without-review-revision";
const PERSISTENT_RETURN_DISPOSITION = "not-created-persistent-user-return-open";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;
const LOCKFILES_BY_PACKAGE_MANAGER: Record<string, readonly string[]> = {
  bun: ["bun.lock", "bun.lockb"],
  npm: ["package-lock.json", "npm-shrinkwrap.json"],
  pnpm: ["pnpm-lock.yaml"],
  yarn: ["yarn.lock"],
};
const TSCONFIG_RE = /^tsconfig(?:\..+)?\.json$/u;

export interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}

export interface ManagedWorkspaceState {
  acceptedCommits?: unknown[];
  completedStages?: unknown[];
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

const addUnique = <TValue>(
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
  const value = taskId.startsWith(REVIEW_TASK_PREFIX)
    ? Number(taskId.slice(REVIEW_TASK_PREFIX.length))
    : Number.NaN;
  return Number.isInteger(value) && value > 0 ? value : null;
};

export const resolveNextAfterCommit = (params: {
  readonly currentTaskId: string;
  readonly decision: ApplicationSkeletonManagedValidationResult;
}): NextPlanStep => {
  if (
    params.currentTaskId === DRAFT_TASK_ID ||
    parseDraftRepairTaskNumber(params.currentTaskId) !== null
  ) {
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
      ? "\n\n## Phase 2 — Application Skeleton Contract Review\n\n### Stream: User-Led Review"
      : "";
  return `${content.trimEnd()}${phaseHeader}
${nextNumber}. [IN_PROGRESS] \`${taskId}\` User reviews the Application Skeleton contract and either accepts it or requests revision (scope: user decision + \`.codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${buildReviewCommitMessage(reviewNumber)}\`).
${nextNumber + 1}. [TODO] Git Commit: \`${buildReviewCommitMessage(reviewNumber)}\` (hash: TBD)
`;
};

export const appendMaterializationStep = (content: string): string => {
  const taskId = buildMaterializeTaskId(1);
  if (content.includes(`\`${taskId}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return `${content.trimEnd()}

## Phase 3 — Application Skeleton Materialization

### Stream: Filesystem Projection

${nextNumber}. [IN_PROGRESS] \`${taskId}\` Materialize the user-accepted Application Skeleton contract into the workspace filesystem and stop for Core validation (scope: \`product-parts/**, package.json, package-lock.json, tsconfig*.json, .codeai-hub/**/application_skeleton/application-skeleton.md, .codeai-hub/**/application_skeleton/application-skeleton-map.json\`; expected commit: \`${MATERIALIZE_COMMIT_MESSAGE}\`).
${nextNumber + 1}. [TODO] Git Commit: \`${MATERIALIZE_COMMIT_MESSAGE}\` (hash: TBD)
`;
};

const appendFinalReviewStep = (content: string): string => {
  if (content.includes(`\`${PHASE4_TASK_ID}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return `${content.trimEnd()}

## Phase 4 — Application Skeleton Final User Review

### Stream: Post-Materialization Review

${nextNumber}. [IN_PROGRESS] \`${PHASE4_TASK_ID}\` User reviews the materialized Application Skeleton and either accepts it to unlock Quality Gates or requests revision (scope: user decision + Application Skeleton materialized workspace; expected commit: none).
`;
};

const appendPersistentReturnStep = (content: string): string => {
  if (content.includes(`\`${PERSISTENT_RETURN_TASK_ID}\``)) {
    return content;
  }
  const nextNumber = maxListNumber(content) + 1;
  return `${content.trimEnd()}

## Phase 5 — Persistent Application Skeleton User Return

### Stream: User Return And Revisions

${nextNumber}. [IN_PROGRESS] \`${PERSISTENT_RETURN_TASK_ID}\` Persistent Application Skeleton return phase is open for future user revisions after accepted materialization (scope: user workflow; expected commit: none).
${nextNumber + 1}. [DONE] Git Commit: \`${PERSISTENT_RETURN_DISPOSITION}\` (hash: ${PERSISTENT_RETURN_DISPOSITION})
`;
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
  const draftRepairNumber = params.next.taskId
    ? parseDraftRepairTaskNumber(params.next.taskId)
    : null;
  if (draftRepairNumber !== null) {
    return appendDraftRepairStep(markedDone, draftRepairNumber);
  }
  const materializationRepairNumber = params.next.taskId
    ? parseMaterializationRepairTaskNumber(params.next.taskId)
    : null;
  if (materializationRepairNumber !== null) {
    return appendMaterializationRepairStep(
      markedDone,
      materializationRepairNumber
    );
  }
  if (params.next.taskId === PHASE4_TASK_ID) {
    return appendFinalReviewStep(markedDone);
  }
  return markedDone;
};

export const markFinalReviewAccepted = (content: string): string => {
  const taskPattern = new RegExp(
    `^(\\d+\\. \\[)(?:TODO|IN_PROGRESS|BLOCKED)(\\] \`${escapeRegExp(
      PHASE4_TASK_ID
    )}\` .*)$`,
    "mu"
  );
  return appendPersistentReturnStep(content.replace(taskPattern, "$1DONE$2"));
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
    for (const child of Array.isArray(children) ? children : []) {
      if (isRecord(child)) {
        paths.push(...collectCodePathsFromNode(child));
      }
    }
  }
  return paths;
};

const readStringArray = (
  value: Record<string, unknown> | null,
  key: string
): readonly string[] => {
  const raw = value?.[key];
  return Array.isArray(raw)
    ? raw.filter((entry): entry is string => typeof entry === "string")
    : [];
};

export const collectMaterializedPaths = (
  mapJson: Record<string, unknown> | null
): readonly string[] => {
  if (!mapJson) {
    return [];
  }
  const direct = readStringArray(mapJson, "materializedPaths");
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

export const updateApplicationSkeletonWorkspaceState = async (
  workspaceRoot: string,
  acceptedCommit: {
    readonly completed: boolean;
    readonly hash: string;
    readonly message: string;
    readonly sessionId: string;
    readonly taskId: string | null;
  } | null
): Promise<void> => {
  const workspacePlanText = await readText(workspaceRoot, WORKSPACE_PLAN_PATH);
  const workspaceState = parseStateBlock<ManagedWorkspaceState>(
    workspacePlanText,
    WORKSPACE_START,
    WORKSPACE_END
  );
  const acceptedCommits = Array.isArray(workspaceState.acceptedCommits)
    ? workspaceState.acceptedCommits
    : [];
  const nextWorkspaceState: ManagedWorkspaceState = {
    ...workspaceState,
    activePlanPath: APPLICATION_STAGE_PLAN_PATH,
    activeStage: acceptedCommit?.completed
      ? "quality_gates"
      : "application_skeleton",
    unlockedStages: addUnique(
      workspaceState.unlockedStages,
      "application_skeleton"
    ),
  };
  if (acceptedCommit) {
    nextWorkspaceState.acceptedCommits = [
      ...acceptedCommits,
      {
        hash: acceptedCommit.hash,
        message: acceptedCommit.message,
        sessionId: acceptedCommit.sessionId,
        stage: "application_skeleton",
        taskId: acceptedCommit.taskId,
      },
    ];
    nextWorkspaceState.lastAcceptedCommitHash = acceptedCommit.hash;
    nextWorkspaceState.lastAcceptedCommitMessage = acceptedCommit.message;
  }
  if (acceptedCommit?.completed) {
    nextWorkspaceState.completedStages = addUnique(
      workspaceState.completedStages,
      "application_skeleton"
    );
    nextWorkspaceState.unlockedStages = addUnique(
      nextWorkspaceState.unlockedStages,
      "quality_gates"
    );
  }
  await writeText(
    workspaceRoot,
    WORKSPACE_PLAN_PATH,
    replaceStateBlock(
      workspacePlanText,
      WORKSPACE_START,
      WORKSPACE_END,
      nextWorkspaceState
    )
  );
};

export const collectFoundationPaths = async (
  workspaceRoot: string,
  mapJson: Record<string, unknown> | null
): Promise<readonly string[]> => {
  const foundation = isRecord(mapJson?.projectFoundation)
    ? mapJson.projectFoundation
    : null;
  const packageManager =
    typeof mapJson?.packageManager === "string"
      ? mapJson.packageManager.toLowerCase()
      : "";
  return Array.from(
    new Set([
      "package.json",
      ...(LOCKFILES_BY_PACKAGE_MANAGER[packageManager] ?? []),
      ...readStringArray(foundation, "configFiles"),
      ...readStringArray(foundation, "firstWaveEntrypoints"),
      ...(await collectRootConfigPaths(workspaceRoot)),
    ])
  );
};

const collectRootConfigPaths = async (
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

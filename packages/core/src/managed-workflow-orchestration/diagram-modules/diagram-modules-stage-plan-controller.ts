import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules-managed-git-boundary";
import {
  appendDiagramModulesRepairStep,
  parseDiagramModulesRepairTaskNumber,
} from "./diagram-modules-stage-plan-repair-model";
import type { DiagramModulesManagedValidationResult } from "./diagram-modules-validator";

const PLAN_START = "<!-- codeai-plan-state:start -->";
const PLAN_END = "<!-- codeai-plan-state:end -->";
const WORKSPACE_START = "<!-- codeai-workspace-plan-state:start -->";
const WORKSPACE_END = "<!-- codeai-workspace-plan-state:end -->";

const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const WORKSPACE_PLAN_PATH = "doc/TODO/workspace.plan.md";
const DIAGRAM_MODULES_REVIEW_TASK_ID = "diagram-modules.phase2.review.task1";
const DIAGRAM_MODULES_REVIEW_COMMIT_MESSAGE =
  "docs: open diagram modules user review";
const FENCED_JSON_START_RE = /^```json\s*/u;
const FENCED_JSON_END_RE = /\s*```$/u;

interface ManagedPlanState {
  currentTaskId: string | null;
  expectedCommitMessage: string | null;
  lastRecordedCommit: string | null;
  [key: string]: unknown;
}

interface ManagedWorkspaceState {
  acceptedCommits?: unknown[];
  lastAcceptedCommitHash?: string | null;
  lastAcceptedCommitMessage?: string | null;
  [key: string]: unknown;
}

interface AcceptedTarget {
  readonly partId: string | null;
  readonly relativePath: string;
}

export interface NextPlanStep {
  readonly expectedCommitMessage: string | null;
  readonly taskId: string | null;
}

export interface DiagramModulesStagePlanCommit {
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly nextTaskId: string | null;
}

export interface DiagramModulesStagePlanBlocked {
  readonly message: string;
  readonly reason: "commit_failed" | "invalid_decision" | "plan_mismatch";
}

export type DiagramModulesStagePlanAdvanceResult =
  | {
      readonly blocked: null;
      readonly commit: DiagramModulesStagePlanCommit;
    }
  | {
      readonly blocked: DiagramModulesStagePlanBlocked;
      readonly commit: null;
    };

export interface DiagramModulesStagePlanControllerOptions {
  readonly gitBoundary?: DiagramModulesManagedGitBoundary;
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

const fileExists = async (
  workspaceRoot: string,
  relativePath: string
): Promise<boolean> =>
  (
    await stat(path.join(workspaceRoot, relativePath)).catch(() => null)
  )?.isFile() ?? false;

const parseStateBlock = <TState>(
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

const replaceStateBlock = (
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

const resolveAcceptedTarget = (params: {
  readonly decision: DiagramModulesManagedValidationResult;
  readonly workspaceSlug: string;
}): AcceptedTarget | null => {
  if (!params.decision.valid) {
    return null;
  }
  if (
    params.decision.nextAction === "dispatch_next_product_part" &&
    params.decision.generatedPartIds.length === 0
  ) {
    return {
      partId: null,
      relativePath: buildProductPartsIndexPath(params.workspaceSlug),
    };
  }
  const partId = params.decision.generatedPartIds.at(-1);
  return partId
    ? {
        partId,
        relativePath: `.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${partId}.md`,
      }
    : null;
};

const buildProductPartCommitMessage = (partId: string): string =>
  `docs: update diagram modules ${partId} product part`;

const buildProductPartTaskId = (partId: string): string =>
  `diagram-modules.phase1.product-part.${partId}.task1`;

const buildProductPartsIndexPath = (workspaceSlug: string): string =>
  `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;

const resolveNextStep = (
  decision: DiagramModulesManagedValidationResult
): NextPlanStep => {
  if (
    decision.nextAction === "dispatch_next_product_part" &&
    decision.currentPartId
  ) {
    return {
      expectedCommitMessage: buildProductPartCommitMessage(
        decision.currentPartId
      ),
      taskId: buildProductPartTaskId(decision.currentPartId),
    };
  }
  if (decision.nextAction === "open_user_review") {
    return {
      expectedCommitMessage: DIAGRAM_MODULES_REVIEW_COMMIT_MESSAGE,
      taskId: DIAGRAM_MODULES_REVIEW_TASK_ID,
    };
  }
  return { expectedCommitMessage: null, taskId: null };
};

const maxListNumber = (content: string): number => {
  let max = 0;
  for (const match of content.matchAll(/^(\d+)\.\s+\[/gmu)) {
    max = Math.max(max, Number(match[1]));
  }
  return max;
};

const appendNextStep = (params: {
  readonly content: string;
  readonly next: NextPlanStep;
  readonly workspaceSlug: string;
}): string => {
  if (
    !params.next.taskId ||
    params.content.includes(`\`${params.next.taskId}\``)
  ) {
    return params.content;
  }
  const nextNumber = maxListNumber(params.content) + 1;
  if (params.next.taskId === DIAGRAM_MODULES_REVIEW_TASK_ID) {
    return [
      params.content.trimEnd(),
      "",
      "## Phase 2 — Diagram Modules User Review",
      "",
      "### Stream: User-Led Review",
      "",
      `${nextNumber}. [IN_PROGRESS] \`${params.next.taskId}\` User reviews the accepted Diagram Modules Product Part artifacts before the stage can be completed (scope: user workflow; expected commit: \`${params.next.expectedCommitMessage}\`).`,
      `${nextNumber + 1}. [TODO] Git Commit: \`${params.next.expectedCommitMessage}\` (hash: TBD)`,
      "",
    ].join("\n");
  }
  if (params.next.expectedCommitMessage === null) {
    return params.content;
  }
  const partId = params.next.taskId
    .replace("diagram-modules.phase1.product-part.", "")
    .replace(".task1", "");
  return [
    params.content.trimEnd(),
    "",
    `${nextNumber}. [IN_PROGRESS] \`${params.next.taskId}\` Materialize Diagram Modules Product Part \`${partId}\` from the accepted index (scope: \`.codeai-hub/${params.workspaceSlug}/diagram_modules/product-parts/${partId}.md\`; expected commit: \`${params.next.expectedCommitMessage}\`).`,
    `${nextNumber + 1}. [TODO] Git Commit: \`${params.next.expectedCommitMessage}\` (hash: TBD)`,
    "",
  ].join("\n");
};

const updateStagePlanAfterCommit = (params: {
  readonly content: string;
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly next: NextPlanStep;
  readonly workspaceSlug: string;
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
  const repairAttemptNumber = params.next.taskId
    ? parseDiagramModulesRepairTaskNumber(params.next.taskId)
    : null;
  if (repairAttemptNumber !== null) {
    return appendDiagramModulesRepairStep({
      attemptNumber: repairAttemptNumber,
      content: markedDone,
      workspaceSlug: params.workspaceSlug,
    });
  }
  return appendNextStep({
    content: markedDone,
    next: params.next,
    workspaceSlug: params.workspaceSlug,
  });
};

const uniqueExistingPaths = async (
  workspaceRoot: string,
  paths: readonly string[]
): Promise<readonly string[]> => {
  const existing: string[] = [];
  for (const relativePath of Array.from(new Set(paths))) {
    if (await fileExists(workspaceRoot, relativePath)) {
      existing.push(relativePath);
    }
  }
  return existing;
};

export class DiagramModulesStagePlanController {
  private readonly gitBoundary: DiagramModulesManagedGitBoundary;

  constructor(options: DiagramModulesStagePlanControllerOptions = {}) {
    this.gitBoundary =
      options.gitBoundary ?? new DiagramModulesManagedGitBoundary();
  }

  async commitAcceptedTurn(params: {
    readonly decision: DiagramModulesManagedValidationResult;
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<DiagramModulesStagePlanAdvanceResult> {
    const target = resolveAcceptedTarget({
      decision: params.decision,
      workspaceSlug: params.workspaceSlug,
    });
    if (!target) {
      return {
        blocked: {
          message:
            "Diagram Modules validation did not identify an accepted artifact to commit.",
          reason: "invalid_decision",
        },
        commit: null,
      };
    }

    const stagePlanText = await readText(
      params.workspaceRoot,
      DIAGRAM_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
      return {
        blocked: {
          message:
            "Diagram Modules stage plan does not point to an active commit-backed microtask.",
          reason: "plan_mismatch",
        },
        commit: null,
      };
    }

    const commitMessage = stageState.expectedCommitMessage;
    const next = resolveNextStep(params.decision);
    const managedPaths = await uniqueExistingPaths(params.workspaceRoot, [
      WORKSPACE_PLAN_PATH,
      DIAGRAM_STAGE_PLAN_PATH,
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "doc/TODO/stages/quality-gates/todo-plan.md",
      "scripts/plan-orchestrator/plan-cli.mjs",
      ".husky/pre-commit",
      ".husky/pre-push",
      "package.json",
      `.codeai-hub/${params.workspaceSlug}/workflow/managed/diagram_modules.json`,
      buildProductPartsIndexPath(params.workspaceSlug),
      target.relativePath,
    ]);

    try {
      const gitCommit = await this.gitBoundary.commitManagedChanges({
        commitMessage,
        managedPaths,
        workspaceRoot: params.workspaceRoot,
      });
      if (gitCommit.noStagedChanges || !gitCommit.hash) {
        return {
          blocked: {
            message: `No staged managed changes for commit "${commitMessage}".`,
            reason: "commit_failed",
          },
          commit: null,
        };
      }
      await this.recordCommit({
        commitMessage,
        hash: gitCommit.hash,
        next,
        sessionId: params.sessionId,
        stagePlanText,
        stageState,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      });
      return {
        blocked: null,
        commit: {
          expectedCommitMessage: commitMessage,
          hash: gitCommit.hash,
          nextTaskId: next.taskId,
        },
      };
    } catch (error) {
      return {
        blocked: {
          message:
            error instanceof Error
              ? error.message
              : `Managed commit failed: ${String(error)}`,
          reason: "commit_failed",
        },
        commit: null,
      };
    }
  }

  private async recordCommit(params: {
    readonly commitMessage: string;
    readonly hash: string;
    readonly next: NextPlanStep;
    readonly sessionId: string;
    readonly stagePlanText: string;
    readonly stageState: ManagedPlanState;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const nextStageState: ManagedPlanState = {
      ...params.stageState,
      currentTaskId: params.next.taskId,
      expectedCommitMessage: params.next.expectedCommitMessage,
      lastRecordedCommit: params.hash,
    };
    const nextStagePlanText = replaceStateBlock(
      updateStagePlanAfterCommit({
        content: params.stagePlanText,
        currentTaskId: params.stageState.currentTaskId ?? "",
        expectedCommitMessage: params.commitMessage,
        hash: params.hash,
        next: params.next,
        workspaceSlug: params.workspaceSlug,
      }),
      PLAN_START,
      PLAN_END,
      nextStageState
    );
    await writeText(
      params.workspaceRoot,
      DIAGRAM_STAGE_PLAN_PATH,
      nextStagePlanText
    );

    const workspacePlanText = await readText(
      params.workspaceRoot,
      WORKSPACE_PLAN_PATH
    );
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
      acceptedCommits: [
        ...acceptedCommits,
        {
          hash: params.hash,
          message: params.commitMessage,
          sessionId: params.sessionId,
          stage: "diagram_modules",
          taskId: params.stageState.currentTaskId,
        },
      ],
      lastAcceptedCommitHash: params.hash,
      lastAcceptedCommitMessage: params.commitMessage,
    };
    await writeText(
      params.workspaceRoot,
      WORKSPACE_PLAN_PATH,
      replaceStateBlock(
        workspacePlanText,
        WORKSPACE_START,
        WORKSPACE_END,
        nextWorkspaceState
      )
    );
  }
}

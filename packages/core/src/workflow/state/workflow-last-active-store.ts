import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";

const ROOT_DIR = ".codeai-hub";
const WORKFLOW_DIR = "workflow";
const STATE_FILE_NAME = "state.json";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isWorkflowStageId = (value: unknown): value is WorkflowStageId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "foundation_envelope";

const WORKFLOW_LAST_ACTIVE_STAGE_ORDER: readonly WorkflowStageId[] = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "foundation_envelope",
] as const;

const STAGE_RANK = WORKFLOW_LAST_ACTIVE_STAGE_ORDER.reduce<
  Record<WorkflowStageId, number>
>(
  (accumulator, stage, index) => {
    accumulator[stage] = index;
    return accumulator;
  },
  {} as Record<WorkflowStageId, number>
);

export interface WorkflowLastActiveSnapshot {
  readonly artifactPath?: string;
  readonly stage: WorkflowStageId;
  readonly updatedAt: string;
}

const compareWorkflowStageOrder = (
  left: WorkflowStageId,
  right: WorkflowStageId
): number => STAGE_RANK[left] - STAGE_RANK[right];

export const resolvePreferredWorkflowLastActive = (
  candidates: readonly (WorkflowLastActiveSnapshot | null | undefined)[]
): WorkflowLastActiveSnapshot | null => {
  let best: WorkflowLastActiveSnapshot | null = null;

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (!best) {
      best = candidate;
      continue;
    }

    if (candidate.updatedAt > best.updatedAt) {
      best = candidate;
      continue;
    }

    if (candidate.updatedAt < best.updatedAt) {
      continue;
    }

    const orderDiff = compareWorkflowStageOrder(candidate.stage, best.stage);
    if (orderDiff > 0) {
      best = candidate;
      continue;
    }

    if (orderDiff === 0 && candidate.artifactPath && !best.artifactPath) {
      best = candidate;
    }
  }

  return best;
};

interface WorkflowStateDiskSnapshot {
  readonly lastActive?: WorkflowLastActiveSnapshot;
  readonly updatedAt: string;
  readonly workspaceSlug: string;
}

const buildStatePath = (workspaceRoot: string, workspaceSlug: string): string =>
  path.join(
    workspaceRoot,
    ROOT_DIR,
    workspaceSlug,
    WORKFLOW_DIR,
    STATE_FILE_NAME
  );

const readJson = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
};

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const parseLastActive = (value: unknown): WorkflowLastActiveSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const stage = value.stage;
  const updatedAt = readNonEmptyString(value.updatedAt);
  if (!(isWorkflowStageId(stage) && updatedAt)) {
    return null;
  }
  const artifactPath = readNonEmptyString(value.artifactPath) ?? undefined;
  return { stage, updatedAt, artifactPath };
};

const parseSnapshot = (value: unknown): WorkflowStateDiskSnapshot | null => {
  if (!isRecord(value)) {
    return null;
  }
  const workspaceSlug = readNonEmptyString(value.workspaceSlug);
  const updatedAt = readNonEmptyString(value.updatedAt);
  if (!(workspaceSlug && updatedAt)) {
    return null;
  }
  const lastActive = parseLastActive(value.lastActive) ?? undefined;
  return { workspaceSlug, updatedAt, lastActive };
};

export class WorkflowLastActiveStore {
  private readonly clock: () => string;

  constructor(options?: { readonly clock?: () => string }) {
    this.clock = options?.clock ?? (() => new Date().toISOString());
  }

  async read(
    workspaceRoot: string,
    workspaceSlug: string
  ): Promise<WorkflowLastActiveSnapshot | null> {
    const snapshot = await readJson<WorkflowStateDiskSnapshot>(
      buildStatePath(workspaceRoot, workspaceSlug)
    );
    const parsed = snapshot ? parseSnapshot(snapshot) : null;
    if (!parsed || parsed.workspaceSlug !== workspaceSlug) {
      return null;
    }
    return parsed.lastActive ?? null;
  }

  async upsert(
    workspaceRoot: string,
    workspaceSlug: string,
    next: Omit<WorkflowLastActiveSnapshot, "updatedAt"> & {
      readonly updatedAt?: string;
    }
  ): Promise<WorkflowLastActiveSnapshot> {
    const now = next.updatedAt ?? this.clock();
    const current = await readJson<WorkflowStateDiskSnapshot>(
      buildStatePath(workspaceRoot, workspaceSlug)
    );
    const parsed = current ? parseSnapshot(current) : null;
    const lastActive: WorkflowLastActiveSnapshot = {
      stage: next.stage,
      updatedAt: now,
      artifactPath: next.artifactPath,
    };
    const snapshot: WorkflowStateDiskSnapshot = {
      workspaceSlug,
      updatedAt: now,
      lastActive,
    };

    if (parsed && parsed.workspaceSlug === workspaceSlug) {
      await writeJson(buildStatePath(workspaceRoot, workspaceSlug), {
        ...parsed,
        updatedAt: now,
        lastActive,
      });
      return lastActive;
    }

    await writeJson(buildStatePath(workspaceRoot, workspaceSlug), snapshot);
    return lastActive;
  }
}

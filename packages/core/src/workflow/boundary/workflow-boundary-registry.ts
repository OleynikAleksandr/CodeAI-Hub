import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import {
  compareWorkflowBoundaryStages,
  getWorkflowBoundaryStageLabel,
  isStageAtOrAfter,
  isWorkflowBoundaryStage,
  WORKFLOW_BOUNDARY_REGISTRY_VERSION,
  type WorkflowBoundaryEntry,
  type WorkflowBoundaryRegistry,
} from "./workflow-boundary-model";

const REGISTRY_RELATIVE_PATH = "workflow/boundaries.json";

interface RegistryFileRecord {
  readonly entries?: unknown;
  readonly registryVersion?: unknown;
  readonly updatedAt?: unknown;
  readonly workspaceSlug?: unknown;
}

const isBoundaryEntry = (
  value: unknown,
  workspaceSlug: string
): value is WorkflowBoundaryEntry => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.registryVersion === WORKFLOW_BOUNDARY_REGISTRY_VERSION &&
    record.workspaceSlug === workspaceSlug &&
    typeof record.boundaryHash === "string" &&
    typeof record.commitMessage === "string" &&
    typeof record.createdAt === "string" &&
    typeof record.stage === "string" &&
    isWorkflowBoundaryStage(record.stage) &&
    record.stageLabel === getWorkflowBoundaryStageLabel(record.stage)
  );
};

const emptyRegistry = (workspaceSlug: string): WorkflowBoundaryRegistry => ({
  entries: [],
  registryVersion: WORKFLOW_BOUNDARY_REGISTRY_VERSION,
  updatedAt: new Date(0).toISOString(),
  workspaceSlug,
});

const sortEntries = (
  entries: readonly WorkflowBoundaryEntry[]
): readonly WorkflowBoundaryEntry[] =>
  [...entries].sort((left, right) =>
    compareWorkflowBoundaryStages(left.stage, right.stage)
  );

export class WorkflowBoundaryRegistryStore {
  getRegistryPath(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): string {
    return path.join(
      params.workspaceRoot,
      ".codeai-hub",
      params.workspaceSlug,
      REGISTRY_RELATIVE_PATH
    );
  }

  async read(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<WorkflowBoundaryRegistry> {
    const registryPath = this.getRegistryPath(params);
    let parsed: RegistryFileRecord;
    try {
      parsed = JSON.parse(await readFile(registryPath, "utf8"));
    } catch {
      return emptyRegistry(params.workspaceSlug);
    }
    const entries = Array.isArray(parsed.entries)
      ? parsed.entries.filter((entry): entry is WorkflowBoundaryEntry =>
          isBoundaryEntry(entry, params.workspaceSlug)
        )
      : [];
    return {
      entries: sortEntries(entries),
      registryVersion: WORKFLOW_BOUNDARY_REGISTRY_VERSION,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date(0).toISOString(),
      workspaceSlug: params.workspaceSlug,
    };
  }

  async write(params: {
    readonly registry: WorkflowBoundaryRegistry;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<string> {
    const registryPath = this.getRegistryPath(params);
    await mkdir(path.dirname(registryPath), { recursive: true });
    const registry: WorkflowBoundaryRegistry = {
      entries: sortEntries(params.registry.entries),
      registryVersion: WORKFLOW_BOUNDARY_REGISTRY_VERSION,
      updatedAt: new Date().toISOString(),
      workspaceSlug: params.workspaceSlug,
    };
    await writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    return registryPath;
  }

  async recordBoundary(params: {
    readonly boundaryHash: string;
    readonly commitMessage: string;
    readonly createdAt: string;
    readonly stage: WorkflowStageId;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<WorkflowBoundaryRegistry> {
    const current = await this.read(params);
    const entry: WorkflowBoundaryEntry = {
      boundaryHash: params.boundaryHash,
      commitMessage: params.commitMessage,
      createdAt: params.createdAt,
      registryVersion: WORKFLOW_BOUNDARY_REGISTRY_VERSION,
      stage: params.stage,
      stageLabel: getWorkflowBoundaryStageLabel(params.stage),
      workspaceSlug: params.workspaceSlug,
    };
    const entries = current.entries.filter(
      (existing) => existing.stage !== params.stage
    );
    const registry = {
      ...current,
      entries: sortEntries([...entries, entry]),
    };
    await this.write({ ...params, registry });
    return registry;
  }

  async pruneFromStage(params: {
    readonly stage: WorkflowStageId;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<WorkflowBoundaryRegistry> {
    const current = await this.read(params);
    const entries = current.entries.filter(
      (entry) => !isStageAtOrAfter(entry.stage, params.stage)
    );
    if (entries.length === current.entries.length) {
      return current;
    }
    const registry = {
      ...current,
      entries,
    };
    await this.write({ ...params, registry });
    return registry;
  }
}

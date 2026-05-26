import { readFile } from "node:fs/promises";
import type { CoreConfig } from "../../config";
import { ProjectRegistry } from "../../services/project-registry/project-registry";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import {
  buildDefaultSettingsSnapshot,
  normalizeLoadedSettingsSnapshotWithDefaults,
  type WorkspaceSettingsScope,
} from "./settings-persistence-snapshot";

export interface WorkspaceSettingsSeedCandidate extends WorkspaceSettingsScope {
  readonly lastUsed?: string;
}

export type WorkspaceSettingsSeedCandidateProvider =
  () => readonly WorkspaceSettingsSeedCandidate[];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSortTime = (candidate: WorkspaceSettingsSeedCandidate): number => {
  const timestamp = Date.parse(candidate.lastUsed ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const isSameWorkspace = (
  candidate: WorkspaceSettingsSeedCandidate,
  target: WorkspaceSettingsScope
): boolean =>
  candidate.workspaceRoot === target.workspaceRoot ||
  candidate.workspaceSlug === target.workspaceSlug;

export const listRegisteredWorkspaceSettingsSeeds =
  (): readonly WorkspaceSettingsSeedCandidate[] => {
    const registry = new ProjectRegistry();
    return registry.listWorkspaces().map((workspace) => ({
      lastUsed: workspace.lastUsed,
      workspaceRoot: workspace.path,
      workspaceSlug: workspace.slug,
    }));
  };

export const resolveWorkspaceSettingsSeed = async (options: {
  readonly config: CoreConfig;
  readonly listCandidates: WorkspaceSettingsSeedCandidateProvider;
  readonly targetWorkspace: WorkspaceSettingsScope;
}): Promise<Record<string, unknown>> => {
  const candidates = [...options.listCandidates()]
    .filter((candidate) => !isSameWorkspace(candidate, options.targetWorkspace))
    .sort((left, right) => toSortTime(right) - toSortTime(left));

  for (const candidate of candidates) {
    const capsule = resolveWorkspaceRuntimeCapsule(candidate);
    try {
      const raw = await readFile(capsule.settingsFile.absolutePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      if (!isRecord(parsed)) {
        continue;
      }
      return normalizeLoadedSettingsSnapshotWithDefaults(parsed, options.config)
        .settings;
    } catch {
      // Ignore unreadable candidate snapshots and continue with older workspaces.
    }
  }

  return buildDefaultSettingsSnapshot(options.config);
};

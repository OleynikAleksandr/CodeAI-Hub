import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface DevelopmentTreeProductionPathApplyResult {
  readonly conflicts: readonly string[];
  readonly created: readonly string[];
  readonly existing: readonly string[];
  readonly skippedReason?: string;
}

export interface DevelopmentTreeCodeWorkspacePathEntry {
  readonly clusterId?: string;
  readonly codeWorkspacePath: string;
  readonly kind: "cluster" | "module" | "product_part";
  readonly moduleId?: string;
  readonly partId: string;
}

export interface DevelopmentTreeCodeWorkspacePathIndex {
  readonly entries: readonly DevelopmentTreeCodeWorkspacePathEntry[];
}

const EMPTY_RESULT: DevelopmentTreeProductionPathApplyResult = {
  conflicts: [],
  created: [],
  existing: [],
  skippedReason: "application_skeleton_map_missing",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isAccepted = (value: Record<string, unknown>): boolean => {
  if (value.accepted === true) {
    return true;
  }
  const acceptance = value.acceptance;
  return isRecord(acceptance) && acceptance.accepted === true;
};

const isMaterialized = (value: Record<string, unknown>): boolean => {
  if (value.materialized === true) {
    return true;
  }
  const materialization = value.materialization;
  return isRecord(materialization) && materialization.materialized === true;
};

const normalizeSafeRelativePath = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.replace(/\\/g, "/").trim();
  if (
    !normalized ||
    path.posix.isAbsolute(normalized) ||
    normalized.startsWith(".codeai-hub/")
  ) {
    return null;
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
};

const readId = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const collectCodePaths = (value: unknown, output: Set<string>): void => {
  if (!isRecord(value)) {
    return;
  }
  const codePath = normalizeSafeRelativePath(value.codePath);
  if (codePath) {
    output.add(codePath);
  }
  for (const key of [
    "productParts",
    "clusters",
    "modules",
    "standaloneModules",
  ]) {
    const children = value[key];
    if (Array.isArray(children)) {
      for (const child of children) {
        collectCodePaths(child, output);
      }
    }
  }
};

const pushCodePathEntry = (
  entries: DevelopmentTreeCodeWorkspacePathEntry[],
  params: Omit<DevelopmentTreeCodeWorkspacePathEntry, "codeWorkspacePath"> & {
    readonly codePath: unknown;
  }
): void => {
  const codeWorkspacePath = normalizeSafeRelativePath(params.codePath);
  if (!codeWorkspacePath) {
    return;
  }
  entries.push({
    kind: params.kind,
    partId: params.partId,
    codeWorkspacePath,
    ...(params.clusterId ? { clusterId: params.clusterId } : {}),
    ...(params.moduleId ? { moduleId: params.moduleId } : {}),
  });
};

const collectCodePathEntries = (
  skeletonMap: Record<string, unknown>
): readonly DevelopmentTreeCodeWorkspacePathEntry[] => {
  const entries: DevelopmentTreeCodeWorkspacePathEntry[] = [];
  const productParts = skeletonMap.productParts;
  if (!Array.isArray(productParts)) {
    return entries;
  }
  for (const part of productParts) {
    if (!isRecord(part)) {
      continue;
    }
    const partId = readId(part.id);
    if (!partId) {
      continue;
    }
    pushCodePathEntry(entries, {
      kind: "product_part",
      partId,
      codePath: part.codePath,
    });
    for (const cluster of Array.isArray(part.clusters) ? part.clusters : []) {
      collectClusterCodePathEntries(entries, partId, cluster);
    }
    for (const module of Array.isArray(part.standaloneModules)
      ? part.standaloneModules
      : []) {
      collectModuleCodePathEntries(entries, partId, undefined, module);
    }
  }
  return entries;
};

const collectClusterCodePathEntries = (
  entries: DevelopmentTreeCodeWorkspacePathEntry[],
  partId: string,
  cluster: unknown
): void => {
  if (!isRecord(cluster)) {
    return;
  }
  const clusterId = readId(cluster.id);
  if (!clusterId) {
    return;
  }
  pushCodePathEntry(entries, {
    kind: "cluster",
    partId,
    clusterId,
    codePath: cluster.codePath,
  });
  for (const module of Array.isArray(cluster.modules) ? cluster.modules : []) {
    collectModuleCodePathEntries(entries, partId, clusterId, module);
  }
};

const collectModuleCodePathEntries = (
  entries: DevelopmentTreeCodeWorkspacePathEntry[],
  partId: string,
  clusterId: string | undefined,
  module: unknown
): void => {
  if (!isRecord(module)) {
    return;
  }
  const moduleId = readId(module.id);
  if (!moduleId) {
    return;
  }
  pushCodePathEntry(entries, {
    kind: "module",
    partId,
    ...(clusterId ? { clusterId } : {}),
    moduleId,
    codePath: module.codePath,
  });
};

const readSkeletonMap = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<Record<string, unknown> | null> => {
  const filePath = path.join(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    "application_skeleton",
    "application-skeleton-map.json"
  );
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8")) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const readDevelopmentTreeCodeWorkspacePathIndex = async (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<DevelopmentTreeCodeWorkspacePathIndex | null> => {
  const skeletonMap = await readSkeletonMap(params);
  if (
    !(skeletonMap && isAccepted(skeletonMap) && isMaterialized(skeletonMap))
  ) {
    return null;
  }
  return { entries: collectCodePathEntries(skeletonMap) };
};

export class DevelopmentTreeProductionPathApplier {
  async apply(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<DevelopmentTreeProductionPathApplyResult> {
    const skeletonMap = await readSkeletonMap(params);
    if (!skeletonMap) {
      return EMPTY_RESULT;
    }
    if (!isAccepted(skeletonMap)) {
      return {
        ...EMPTY_RESULT,
        skippedReason: "application_skeleton_not_accepted",
      };
    }
    if (!isMaterialized(skeletonMap)) {
      return {
        ...EMPTY_RESULT,
        skippedReason: "application_skeleton_not_materialized",
      };
    }
    const paths = new Set<string>();
    collectCodePaths(skeletonMap, paths);
    const created: string[] = [];
    const existing: string[] = [];
    const conflicts: string[] = [];
    for (const relativePath of [...paths].sort()) {
      const absolutePath = path.join(params.workspaceRoot, relativePath);
      const fileStat = await stat(absolutePath).catch(() => null);
      if (fileStat?.isDirectory()) {
        existing.push(relativePath);
      } else if (fileStat) {
        conflicts.push(relativePath);
      } else {
        await mkdir(absolutePath, { recursive: true });
        created.push(relativePath);
      }
    }
    return { conflicts, created, existing };
  }
}

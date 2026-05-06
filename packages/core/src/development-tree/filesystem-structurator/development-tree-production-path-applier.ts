import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

export interface DevelopmentTreeProductionPathApplyResult {
  readonly conflicts: readonly string[];
  readonly created: readonly string[];
  readonly existing: readonly string[];
  readonly skippedReason?: string;
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

import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";

const MANIFEST_SCHEMA = "codeai-workflow-runtime-slices-v1";
const SNAPSHOT_DIR = "runtime-slices";
const WORKSPACE_ROOT_DIR = ".codeai-hub";
const MAX_PROVIDER_SEARCH_DEPTH = 6;
const SESSION_FILE_EXTENSIONS = new Set([".json", ".jsonl"]);
const SKIPPED_DIR_NAMES = new Set([
  ".git",
  "cache",
  "dist",
  "node_modules",
  "tmp",
]);
const SENSITIVE_FILE_NAMES = new Set([
  "auth.json",
  "config.toml",
  "credentials.json",
  "models_cache.json",
  "settings.json",
]);

export interface WorkflowRuntimeSliceSession {
  readonly providerId?: string | null;
  readonly providerSessionId?: string | null;
}

export interface WorkflowRuntimeSliceSnapshotParams {
  readonly homeDirectory?: string;
  readonly sessions?: readonly WorkflowRuntimeSliceSession[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowRuntimeSliceManifestEntry {
  readonly kind: string;
  readonly snapshotPath: string;
  readonly sourcePath: string;
  readonly type: "directory" | "file";
}

export interface WorkflowRuntimeSliceManifest {
  readonly entries: readonly WorkflowRuntimeSliceManifestEntry[];
  readonly schema: typeof MANIFEST_SCHEMA;
  readonly updatedAt: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const unique = (values: readonly string[]): readonly string[] =>
  Array.from(new Set(values.filter((value) => value.trim().length > 0)));

const sourceHash = (value: string): string =>
  createHash("sha256").update(path.resolve(value)).digest("hex").slice(0, 12);

const normalizeProviderId = (value: string | null | undefined): string =>
  sanitizeWorkspaceSlug(value ?? "unknown-provider");

const getSnapshotRoot = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    params.workspaceRoot,
    WORKSPACE_ROOT_DIR,
    params.workspaceSlug,
    SNAPSHOT_DIR
  );

const getManifestPath = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string => path.join(getSnapshotRoot(params), "manifest.json");

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
};

const readPathType = async (
  filePath: string
): Promise<"directory" | "file" | null> => {
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      return "directory";
    }
    return stats.isFile() ? "file" : null;
  } catch {
    return null;
  }
};

const safeSnapshotPath = (params: {
  readonly kind: string;
  readonly sourcePath: string;
  readonly type: "directory" | "file";
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string => {
  const sourceName = sanitizeWorkspaceSlug(path.basename(params.sourcePath));
  const fileName =
    params.type === "file"
      ? `${sourceName || "file"}${path.extname(params.sourcePath)}`
      : sourceName || "directory";
  return path.join(
    WORKSPACE_ROOT_DIR,
    params.workspaceSlug,
    SNAPSHOT_DIR,
    sanitizeWorkspaceSlug(params.kind),
    `${sourceHash(params.sourcePath)}-${fileName}`
  );
};

const copySourceToSnapshot = async (params: {
  readonly snapshotAbsolutePath: string;
  readonly sourcePath: string;
  readonly type: "directory" | "file";
}): Promise<void> => {
  await rm(params.snapshotAbsolutePath, { force: true, recursive: true });
  await mkdir(path.dirname(params.snapshotAbsolutePath), { recursive: true });
  await cp(params.sourcePath, params.snapshotAbsolutePath, {
    force: true,
    recursive: params.type === "directory",
  });
};

const findMatchingProviderSessionFiles = async (params: {
  readonly maxDepth: number;
  readonly providerSessionIds: readonly string[];
  readonly root: string;
}): Promise<readonly string[]> => {
  const matches: string[] = [];
  const ids = params.providerSessionIds.map((id) => id.toLowerCase());
  const visit = async (directory: string, depth: number): Promise<void> => {
    if (depth > params.maxDepth) {
      return;
    }
    const entries = await readdir(directory, { withFileTypes: true }).catch(
      () => []
    );
    for (const entry of entries) {
      const absolutePath = path.join(directory, entry.name);
      const lowerPath = absolutePath.toLowerCase();
      if (entry.isDirectory()) {
        if (!SKIPPED_DIR_NAMES.has(entry.name)) {
          await visit(absolutePath, depth + 1);
        }
        continue;
      }
      if (
        entry.isFile() &&
        SESSION_FILE_EXTENSIONS.has(path.extname(entry.name)) &&
        !SENSITIVE_FILE_NAMES.has(entry.name) &&
        ids.some((id) => lowerPath.includes(id))
      ) {
        matches.push(absolutePath);
      }
    }
  };
  await visit(params.root, 0);
  return matches;
};

const collectRuntimeSliceSources = async (
  params: WorkflowRuntimeSliceSnapshotParams
): Promise<
  readonly { readonly kind: string; readonly sourcePath: string }[]
> => {
  const homeDirectory = params.homeDirectory ?? homedir();
  const workspacePathSlug = sanitizeWorkspaceSlug(params.workspaceRoot);
  const sessionSlugs = unique([workspacePathSlug, params.workspaceSlug]);
  const providerSessionIds = unique(
    (params.sessions ?? [])
      .map((session) => session.providerSessionId?.trim() ?? "")
      .filter(Boolean)
  );
  const sources: { kind: string; sourcePath: string }[] = [];
  const addIfExists = async (
    kind: string,
    sourcePath: string
  ): Promise<void> => {
    if (await pathExists(sourcePath)) {
      sources.push({ kind, sourcePath });
    }
  };

  for (const slug of sessionSlugs) {
    await addIfExists(
      "unified-sessions",
      path.join(homeDirectory, ".codeai-hub", "sessions", slug)
    );
    await addIfExists(
      "claude-provider-sessions",
      path.join(
        homeDirectory,
        ".codeai-hub",
        "providers",
        "claude",
        "home",
        ".claude",
        "projects",
        slug
      )
    );
    await addIfExists(
      "gemini-provider-sessions",
      path.join(homeDirectory, ".gemini", "tmp", slug, "chats")
    );
  }

  const providerHomes = [
    path.join(homeDirectory, ".codeai-hub", "providers", "codex", "home"),
    path.join(homeDirectory, ".codeai-hub", "providers", "kimi", "home"),
    path.join(homeDirectory, ".gemini", "tmp"),
  ];
  if (providerSessionIds.length > 0) {
    for (const root of providerHomes) {
      const matches = await findMatchingProviderSessionFiles({
        maxDepth: MAX_PROVIDER_SEARCH_DEPTH,
        providerSessionIds,
        root,
      });
      for (const sourcePath of matches) {
        sources.push({
          kind: `${normalizeProviderId(path.basename(path.dirname(root)))}-provider-sessions`,
          sourcePath,
        });
      }
    }
  }

  const byResolvedPath = new Map<
    string,
    { kind: string; sourcePath: string }
  >();
  for (const source of sources) {
    byResolvedPath.set(path.resolve(source.sourcePath), source);
  }
  return Array.from(byResolvedPath.values());
};

const isRestorableSourcePath = (
  sourcePath: string,
  homeDirectory: string
): boolean => {
  const resolved = path.resolve(sourcePath);
  const allowedRoots = [
    path.join(homeDirectory, ".codeai-hub", "sessions"),
    path.join(homeDirectory, ".codeai-hub", "providers"),
    path.join(homeDirectory, ".gemini", "tmp"),
  ].map((root) => path.resolve(root));
  return allowedRoots.some(
    (root) => resolved === root || resolved.startsWith(`${root}${path.sep}`)
  );
};

export const captureWorkflowRuntimeSlices = async (
  params: WorkflowRuntimeSliceSnapshotParams
): Promise<WorkflowRuntimeSliceManifest> => {
  const snapshotRoot = getSnapshotRoot(params);
  await rm(snapshotRoot, { force: true, recursive: true });
  await mkdir(snapshotRoot, { recursive: true });
  const entries: WorkflowRuntimeSliceManifestEntry[] = [];
  for (const source of await collectRuntimeSliceSources(params)) {
    const type = await readPathType(source.sourcePath);
    if (!type) {
      continue;
    }
    const snapshotPath = safeSnapshotPath({ ...params, ...source, type });
    await copySourceToSnapshot({
      snapshotAbsolutePath: path.join(params.workspaceRoot, snapshotPath),
      sourcePath: source.sourcePath,
      type,
    });
    entries.push({
      kind: source.kind,
      snapshotPath,
      sourcePath: path.resolve(source.sourcePath),
      type,
    });
  }
  const manifest: WorkflowRuntimeSliceManifest = {
    schema: MANIFEST_SCHEMA,
    updatedAt: new Date().toISOString(),
    workspaceRoot: path.resolve(params.workspaceRoot),
    workspaceSlug: params.workspaceSlug,
    entries,
  };
  await writeFile(
    getManifestPath(params),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return manifest;
};

export const restoreWorkflowRuntimeSlices = async (
  params: WorkflowRuntimeSliceSnapshotParams
): Promise<WorkflowRuntimeSliceManifest | null> => {
  const manifestPath = getManifestPath(params);
  const raw = await readFile(manifestPath, "utf8").catch(() => null);
  if (!raw) {
    return null;
  }
  const manifest = JSON.parse(raw) as WorkflowRuntimeSliceManifest;
  if (manifest.schema !== MANIFEST_SCHEMA) {
    return null;
  }
  const homeDirectory = params.homeDirectory ?? homedir();
  for (const entry of manifest.entries) {
    if (!isRestorableSourcePath(entry.sourcePath, homeDirectory)) {
      continue;
    }
    const snapshotAbsolutePath = path.join(
      params.workspaceRoot,
      entry.snapshotPath
    );
    if (!(await pathExists(snapshotAbsolutePath))) {
      continue;
    }
    await rm(entry.sourcePath, { force: true, recursive: true });
    await mkdir(path.dirname(entry.sourcePath), { recursive: true });
    await cp(snapshotAbsolutePath, entry.sourcePath, {
      force: true,
      recursive: entry.type === "directory",
    });
  }
  return manifest;
};

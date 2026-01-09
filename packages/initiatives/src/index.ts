import path from "node:path";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const normalizeSlugSource = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

export const toSlug = (value: string): string => {
  const slug = normalizeSlugSource(value);
  if (!slug) {
    throw new Error("Unable to derive slug: empty value");
  }
  if (!SLUG_RE.test(slug)) {
    throw new Error(`Invalid slug derived: ${slug}`);
  }
  return slug;
};

export const resolveUniqueSlug = (
  baseSlug: string,
  existingSlugs: readonly string[]
): string => {
  if (!SLUG_RE.test(baseSlug)) {
    throw new Error(`Invalid base slug: ${baseSlug}`);
  }

  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  while (counter < 10_000) {
    const candidate = `${baseSlug}-${counter}`;
    if (!existingSlugs.includes(candidate)) {
      return candidate;
    }
    counter += 1;
  }

  throw new Error(`Unable to allocate unique slug for ${baseSlug}`);
};

export type InitiativePaths = {
  readonly initiativesRoot: string;
  readonly initiativeDir: string;
  readonly initiativeManifestPath: string;
  readonly runsRoot: string;
  readonly runDir: string;
  readonly runManifestPath: string;
  readonly stageDir: (stage: string) => string;
};

export const resolveInitiativesRoot = (workspaceRoot: string): string =>
  path.join(workspaceRoot, ".codeai-hub", "initiatives");

export const resolveInitiativeDir = (
  workspaceRoot: string,
  initiativeSlug: string
): string => {
  if (!SLUG_RE.test(initiativeSlug)) {
    throw new Error(`Invalid initiativeSlug: ${initiativeSlug}`);
  }

  return path.join(resolveInitiativesRoot(workspaceRoot), initiativeSlug);
};

export const resolveInitiativeManifestPath = (
  workspaceRoot: string,
  initiativeSlug: string
): string =>
  path.join(
    resolveInitiativeDir(workspaceRoot, initiativeSlug),
    "initiative.json"
  );

export const resolveRunsRoot = (
  workspaceRoot: string,
  initiativeSlug: string
): string =>
  path.join(resolveInitiativeDir(workspaceRoot, initiativeSlug), "runs");

export const resolveRunDir = (
  workspaceRoot: string,
  initiativeSlug: string,
  runSlug: string
): string => {
  if (!SLUG_RE.test(runSlug)) {
    throw new Error(`Invalid runSlug: ${runSlug}`);
  }

  return path.join(resolveRunsRoot(workspaceRoot, initiativeSlug), runSlug);
};

export const resolveRunManifestPath = (
  workspaceRoot: string,
  initiativeSlug: string,
  runSlug: string
): string =>
  path.join(resolveRunDir(workspaceRoot, initiativeSlug, runSlug), "run.json");

export const resolveStageDir = (
  workspaceRoot: string,
  initiativeSlug: string,
  runSlug: string,
  stage: string
): string =>
  path.join(resolveRunDir(workspaceRoot, initiativeSlug, runSlug), stage);

export const resolveInitiativePaths = (
  workspaceRoot: string,
  initiativeSlug: string,
  runSlug: string
): InitiativePaths => ({
  initiativesRoot: resolveInitiativesRoot(workspaceRoot),
  initiativeDir: resolveInitiativeDir(workspaceRoot, initiativeSlug),
  initiativeManifestPath: resolveInitiativeManifestPath(
    workspaceRoot,
    initiativeSlug
  ),
  runsRoot: resolveRunsRoot(workspaceRoot, initiativeSlug),
  runDir: resolveRunDir(workspaceRoot, initiativeSlug, runSlug),
  runManifestPath: resolveRunManifestPath(
    workspaceRoot,
    initiativeSlug,
    runSlug
  ),
  stageDir: (stage: string) =>
    resolveStageDir(workspaceRoot, initiativeSlug, runSlug, stage),
});

export type { InitiativeManifest } from "./initiative-store";
export { InitiativeStore } from "./initiative-store";
export type { RunManifest } from "./run-store";
export { RunStore } from "./run-store";

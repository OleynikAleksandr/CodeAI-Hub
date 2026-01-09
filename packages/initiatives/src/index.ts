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

export const resolveInitiativePaths = (
  workspaceRoot: string,
  initiativeSlug: string,
  runSlug: string
): InitiativePaths => {
  if (!SLUG_RE.test(initiativeSlug)) {
    throw new Error(`Invalid initiativeSlug: ${initiativeSlug}`);
  }
  if (!SLUG_RE.test(runSlug)) {
    throw new Error(`Invalid runSlug: ${runSlug}`);
  }

  const initiativesRoot = path.join(
    workspaceRoot,
    ".codeai-hub",
    "full-development-flow",
    "initiatives"
  );

  const initiativeDir = path.join(initiativesRoot, initiativeSlug);
  const initiativeManifestPath = path.join(initiativeDir, "initiative.json");
  const runsRoot = path.join(initiativeDir, "runs");
  const runDir = path.join(runsRoot, runSlug);
  const runManifestPath = path.join(runDir, "run.json");

  return {
    initiativesRoot,
    initiativeDir,
    initiativeManifestPath,
    runsRoot,
    runDir,
    runManifestPath,
    stageDir: (stage: string) => path.join(runDir, stage),
  };
};

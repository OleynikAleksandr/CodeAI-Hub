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

export interface InitiativePaths {
  readonly initiativeDir: string;
  readonly initiativeManifestPath: string;
  readonly initiativesRoot: string;
}

export const resolveInitiativesRoot = (workspaceRoot: string): string =>
  path.join(workspaceRoot, ".codeai-hub");

export const resolveInitiativeDir = (
  workspaceRoot: string,
  initiativeSlug: string
): string => {
  if (!SLUG_RE.test(initiativeSlug)) {
    throw new Error(`Invalid initiativeSlug: ${initiativeSlug}`);
  }

  return path.join(
    resolveInitiativesRoot(workspaceRoot),
    initiativeSlug,
    "description"
  );
};

export const resolveInitiativeManifestPath = (
  workspaceRoot: string,
  initiativeSlug: string
): string =>
  path.join(
    resolveInitiativeDir(workspaceRoot, initiativeSlug),
    "initiative.json"
  );

export const resolveInitiativePaths = (
  workspaceRoot: string,
  initiativeSlug: string
): InitiativePaths => ({
  initiativesRoot: resolveInitiativesRoot(workspaceRoot),
  initiativeDir: resolveInitiativeDir(workspaceRoot, initiativeSlug),
  initiativeManifestPath: resolveInitiativeManifestPath(
    workspaceRoot,
    initiativeSlug
  ),
});

export type { InitiativeManifest } from "./initiative-store";
export { InitiativeStore } from "./initiative-store";

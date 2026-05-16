import { readFile } from "node:fs/promises";
import path from "node:path";

const GENERATED_OUTPUT_SEGMENTS = new Set([
  ".cache",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

const INSTALL_OUTPUT_PACKAGE_MANAGERS = new Set(["bun", "npm", "pnpm", "yarn"]);
const BACKSLASH_RE = /\\/g;
const LEADING_DOT_SLASH_RE = /^\.\//u;
const NEGATED_PATTERN_RE = /^!/u;
const NEWLINE_RE = /\r?\n/u;
const TRAILING_SLASH_RE = /\/+$/u;

const normalizePath = (value: string): string =>
  value
    .trim()
    .replace(BACKSLASH_RE, "/")
    .replace(LEADING_DOT_SLASH_RE, "")
    .replace(TRAILING_SLASH_RE, "");

const hasGeneratedOutputSegment = (value: string): boolean =>
  normalizePath(value)
    .split("/")
    .some((segment) => GENERATED_OUTPUT_SEGMENTS.has(segment));

const readGitignoreLines = async (
  workspaceRoot: string
): Promise<readonly string[] | null> => {
  const content = await readFile(path.join(workspaceRoot, ".gitignore"), "utf8")
    .then((value) => value)
    .catch(() => null);
  if (content === null) {
    return null;
  }
  return content
    .split(NEWLINE_RE)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
};

const ignoresSegment = (
  lines: readonly string[] | null,
  segment: string
): boolean =>
  lines?.some((line) => {
    const normalized = normalizePath(line.replace(NEGATED_PATTERN_RE, ""));
    if (normalized === segment || normalized === `${segment}/`) {
      return true;
    }
    return (
      normalized.endsWith(`/${segment}`) ||
      normalized.endsWith(`/${segment}/`) ||
      normalized.includes(`/**/${segment}`) ||
      normalized.includes(`/${segment}/`)
    );
  }) ?? false;

const requiresBuildOutputIgnore = (
  requiredScripts: readonly string[]
): boolean => requiredScripts.some((script) => script === "build");

export const validateGeneratedOutputMaterializedPaths = (
  materializedPaths: readonly string[]
): readonly string[] =>
  materializedPaths
    .filter(hasGeneratedOutputSegment)
    .map(
      (relativePath) =>
        `application skeleton generated output must not be listed as materializedPath: ${relativePath}`
    );

export const auditApplicationSkeletonGitignore = async (params: {
  readonly packageManager: string;
  readonly requiredScripts: readonly string[];
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const lines = await readGitignoreLines(params.workspaceRoot);
  if (lines === null) {
    return ["application skeleton gitignore is missing: .gitignore"];
  }
  const errors: string[] = [];
  if (
    INSTALL_OUTPUT_PACKAGE_MANAGERS.has(params.packageManager) &&
    !ignoresSegment(lines, "node_modules")
  ) {
    errors.push(
      "application skeleton gitignore must ignore install output: node_modules"
    );
  }
  if (
    requiresBuildOutputIgnore(params.requiredScripts) &&
    !ignoresSegment(lines, "dist")
  ) {
    errors.push(
      "application skeleton gitignore must ignore build output: dist"
    );
  }
  return errors;
};

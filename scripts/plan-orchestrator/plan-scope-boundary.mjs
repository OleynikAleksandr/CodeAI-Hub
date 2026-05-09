import { execFileSync } from "node:child_process";
import { parsePlanItemLines } from "./plan-task-locator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const SCOPE_PATTERN = /scope:\s*`([^`]+)`/iu;
const REGEX_SPECIAL_PATTERN = /[.+?^${}()|[\]\\]/gu;
const TRAILING_SCOPE_PUNCTUATION_PATTERN = /[.;]+$/u;
const PORCELAIN_RENAME_SEPARATOR = " -> ";

const normalizePath = (path) => path.trim().replace(/\\/gu, "/");

const normalizeScopeToken = (token) =>
  normalizePath(token)
    .replace(/^['"`]+|['"`]+$/gu, "")
    .replace(TRAILING_SCOPE_PUNCTUATION_PATTERN, "")
    .trim();

const splitScopeTokens = (scope) =>
  scope.split(",").map(normalizeScopeToken).filter(Boolean);

const getTaskBlock = (markdown, taskId) => {
  const items = parsePlanItemLines(markdown);
  const task = items.find((item) => item.id === taskId);

  if (!task) {
    throw new Error(`Plan task not found: ${taskId}`);
  }

  const nextItem = items.find((item) => item.lineIndex > task.lineIndex);
  const lines = markdown.split("\n");

  return lines
    .slice(task.lineIndex, nextItem?.lineIndex ?? lines.length)
    .join("\n");
};

const escapeRegex = (value) => value.replace(REGEX_SPECIAL_PATTERN, "\\$&");

const globToRegex = (pattern) => {
  let regex = "";

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];

    if (char === "*" && pattern[index + 1] === "*") {
      regex += ".*";
      index += 1;
      continue;
    }

    if (char === "*") {
      regex += "[^/]*";
      continue;
    }

    regex += escapeRegex(char);
  }

  return new RegExp(`^${regex}$`, "u");
};

const hasGlob = (pattern) => pattern.includes("*");

export const extractTaskScopePatterns = (markdown, taskId) => {
  const taskBlock = getTaskBlock(markdown, taskId);
  const scopeMatch = taskBlock.match(SCOPE_PATTERN);
  const scopeTokens = scopeMatch ? splitScopeTokens(scopeMatch[1]) : [];

  return Array.from(new Set([...scopeTokens, TODO_PLAN_PATH]));
};

export const pathMatchesScope = (path, scopePattern) => {
  const normalizedPath = normalizePath(path);
  const normalizedPattern = normalizeScopeToken(scopePattern);

  if (!normalizedPattern) {
    return false;
  }

  if (hasGlob(normalizedPattern)) {
    return globToRegex(normalizedPattern).test(normalizedPath);
  }

  return (
    normalizedPath === normalizedPattern ||
    normalizedPath.startsWith(`${normalizedPattern}/`)
  );
};

export const getOutOfScopePaths = (paths, scopePatterns) =>
  paths
    .map(normalizePath)
    .filter(
      (path) =>
        path && !scopePatterns.some((scope) => pathMatchesScope(path, scope))
    );

const extractPorcelainPath = (line) => {
  const rawPath = line.slice(3);

  if (rawPath.includes(PORCELAIN_RENAME_SEPARATOR)) {
    return rawPath.split(PORCELAIN_RENAME_SEPARATOR).map(normalizePath);
  }

  return [normalizePath(rawPath)];
};

export const parsePorcelainPaths = (output) =>
  output.split("\n").filter(Boolean).flatMap(extractPorcelainPath);

export const readDirtyPaths = (cwd) =>
  parsePorcelainPaths(
    execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    })
  );

export const readStagedPaths = (cwd) =>
  execFileSync(
    "git",
    ["diff", "--cached", "--name-only", "--diff-filter=ACMRD"],
    {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  )
    .split("\n")
    .filter(Boolean)
    .map(normalizePath);

export const assertPathsWithinScope = ({ paths, scopePatterns }) => {
  const outOfScopePaths = getOutOfScopePaths(paths, scopePatterns);

  if (outOfScopePaths.length > 0) {
    throw new Error(
      [
        "Plan commit boundary rejected files outside the current task scope:",
        ...outOfScopePaths.map((path) => `- ${path}`),
        "",
        "Update the current task scope or move these changes to another stream before committing.",
      ].join("\n")
    );
  }
};

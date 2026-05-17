import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const BACKSLASH_RE = /\\/gu;
const LEADING_DOT_SLASH_RE = /^\.\//u;
const RENAME_SEPARATOR = " -> ";

export type ManagedTerminalStage =
  | "application_skeleton"
  | "diagram_modules"
  | "quality_gates";

export type ManagedTerminalDirtyKind =
  | "core_runtime"
  | "gate_or_formatter_residue"
  | "stage_owned"
  | "unclassified";

export interface ManagedTerminalDirtyPath {
  readonly kind: ManagedTerminalDirtyKind;
  readonly path: string;
  readonly status: string;
}

export interface ManagedTerminalDirtyClassification {
  readonly clean: boolean;
  readonly committablePaths: readonly string[];
  readonly entries: readonly ManagedTerminalDirtyPath[];
  readonly unclassifiedPaths: readonly string[];
}

const normalizeGitPath = (value: string): string =>
  value.trim().replace(BACKSLASH_RE, "/").replace(LEADING_DOT_SLASH_RE, "");

const parseGitStatusLine = (line: string): ManagedTerminalDirtyPath | null => {
  if (line.trim().length === 0 || line.length < 4) {
    return null;
  }
  const rawPath = line.slice(3).trim();
  const renameTarget = rawPath.includes(RENAME_SEPARATOR)
    ? rawPath.split(RENAME_SEPARATOR).at(-1)
    : rawPath;
  if (!renameTarget) {
    return null;
  }
  return {
    kind: "unclassified",
    path: normalizeGitPath(renameTarget),
    status: line.slice(0, 2),
  };
};

const matchesExactOrPrefix = (
  pathValue: string,
  patterns: readonly string[]
): boolean =>
  patterns.some((pattern) =>
    pattern.endsWith("/")
      ? pathValue.startsWith(pattern)
      : pathValue === pattern
  );

const resolveStageOwnedPatterns = (params: {
  readonly stage: ManagedTerminalStage;
  readonly workspaceSlug: string;
}): readonly string[] => {
  const hubRoot = `.codeai-hub/${params.workspaceSlug}`;
  if (params.stage === "diagram_modules") {
    return [
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      `${hubRoot}/diagram_modules/`,
      `${hubRoot}/workflow/managed/diagram_modules.json`,
    ];
  }
  if (params.stage === "application_skeleton") {
    return [
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      `${hubRoot}/application_skeleton/`,
      `${hubRoot}/workflow/managed/application_skeleton.json`,
    ];
  }
  return [
    "doc/TODO/stages/quality-gates/todo-plan.md",
    `${hubRoot}/quality_gates/`,
    `${hubRoot}/workflow/managed/quality_gates.json`,
  ];
};

const resolveCoreRuntimePatterns = (
  workspaceSlug: string
): readonly string[] => [
  "doc/TODO/workspace.plan.md",
  "doc/TODO/stages/",
  `.codeai-hub/${workspaceSlug}/continuity/`,
  `.codeai-hub/${workspaceSlug}/workflow/state.json`,
];

const isGateOrFormatterResidue = (
  stage: ManagedTerminalStage,
  pathValue: string
): boolean => {
  if (stage === "diagram_modules") {
    return false;
  }
  return matchesExactOrPrefix(pathValue, [
    ".husky/pre-commit",
    ".husky/pre-push",
    "package-lock.json",
    "package.json",
    "product-parts/",
    "scripts/application-skeleton-smoke.cjs",
    "scripts/plan-orchestrator/plan-cli.mjs",
    "tsconfig.base.json",
    "tsconfig.json",
  ]);
};

const classifyKind = (params: {
  readonly pathValue: string;
  readonly stage: ManagedTerminalStage;
  readonly workspaceSlug: string;
}): ManagedTerminalDirtyKind => {
  if (
    matchesExactOrPrefix(params.pathValue, resolveStageOwnedPatterns(params))
  ) {
    return "stage_owned";
  }
  if (
    matchesExactOrPrefix(
      params.pathValue,
      resolveCoreRuntimePatterns(params.workspaceSlug)
    )
  ) {
    return "core_runtime";
  }
  return isGateOrFormatterResidue(params.stage, params.pathValue)
    ? "gate_or_formatter_residue"
    : "unclassified";
};

export const classifyManagedTerminalDirtyEntries = (params: {
  readonly entries: readonly string[];
  readonly stage: ManagedTerminalStage;
  readonly workspaceSlug: string;
}): ManagedTerminalDirtyClassification => {
  const entries = params.entries
    .map(parseGitStatusLine)
    .filter((entry): entry is ManagedTerminalDirtyPath => entry !== null)
    .map((entry) => ({
      ...entry,
      kind: classifyKind({
        pathValue: entry.path,
        stage: params.stage,
        workspaceSlug: params.workspaceSlug,
      }),
    }));
  const committablePaths = entries
    .filter((entry) => entry.kind !== "unclassified")
    .map((entry) => entry.path);
  const unclassifiedPaths = entries
    .filter((entry) => entry.kind === "unclassified")
    .map((entry) => entry.path);

  return {
    clean: entries.length === 0,
    committablePaths,
    entries,
    unclassifiedPaths,
  };
};

export const classifyManagedTerminalDirtyTree = async (params: {
  readonly stage: ManagedTerminalStage;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<ManagedTerminalDirtyClassification> => {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--short", "--untracked-files=all"],
    { cwd: params.workspaceRoot }
  );
  return classifyManagedTerminalDirtyEntries({
    entries: stdout.split("\n"),
    stage: params.stage,
    workspaceSlug: params.workspaceSlug,
  });
};

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getGitState } from "./plan-git-state.mjs";
import { updatePlanState } from "./plan-markdown-updater.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const DOCS_INDEX_PATH = "doc/SolidWorks-WorkFlow/Docs_Index.md";
const TODO_ARCHIVE_DIR = "doc/TODO/Archive";
const PLANS_ARCHIVE_DIR = "doc/SolidWorks-WorkFlow/Plans/Archive";

const formatIssues = (issues) =>
  issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n");

const normalizeText = (value) => value.trim().replace(/\s+/gu, " ");

const sanitizePathPart = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const replaceAllText = (text, from, to) => text.split(from).join(to);

const assertPathIsNotIgnored = (cwd, relativePath) => {
  try {
    execFileSync("git", ["check-ignore", "-q", relativePath], {
      cwd,
      stdio: "ignore",
    });
  } catch (error) {
    if (error.status === 1) {
      return;
    }

    throw error;
  }

  throw new Error(`Closeout artifact path is ignored by Git: ${relativePath}`);
};

const getArchivePlanPath = (planId) =>
  `${TODO_ARCHIVE_DIR}/todo-plan-closeout-${sanitizePathPart(planId)}.md`;

const getPlanningArchivePath = (planningSource) =>
  planningSource.startsWith(`${PLANS_ARCHIVE_DIR}/`)
    ? planningSource
    : `${PLANS_ARCHIVE_DIR}/${basename(planningSource)}`;

const movePlanningSource = ({ cwd, planningArchivePath, planningSource }) => {
  const sourcePath = resolve(cwd, planningSource);
  const archivePath = resolve(cwd, planningArchivePath);

  if (planningSource === planningArchivePath) {
    return "already_archived";
  }

  if (existsSync(sourcePath)) {
    mkdirSync(dirname(archivePath), { recursive: true });
    renameSync(sourcePath, archivePath);
    return "moved";
  }

  if (existsSync(archivePath)) {
    return "already_archived";
  }

  throw new Error(`Planning source not found: ${planningSource}`);
};

const updateDocsIndex = ({ cwd, planningArchivePath, planningSource }) => {
  const docsIndexPath = resolve(cwd, DOCS_INDEX_PATH);

  if (!existsSync(docsIndexPath) || planningSource === planningArchivePath) {
    return false;
  }

  const current = readFileSync(docsIndexPath, "utf8");
  const next = replaceAllText(current, planningSource, planningArchivePath);

  if (next === current) {
    return false;
  }

  writeFileSync(docsIndexPath, next, "utf8");
  return true;
};

const updateActivePlanPlanningSource = ({
  markdown,
  planningArchivePath,
  planningSource,
}) => {
  const withState = updatePlanState(markdown, (state) => ({
    ...state,
    planningSource: planningArchivePath,
  }));

  return replaceAllText(withState, planningSource, planningArchivePath);
};

const createCloseoutArchive = ({
  acceptance,
  markdown,
  now,
  planningArchivePath,
  planningDisposition,
  state,
}) => `# Plan Closeout: ${state.planId}

**Created:** ${now.toISOString()}
**Acceptance:** ${acceptance}
**Execution Scope Status:** ${state.executionScopeStatus}
**Branch:** ${state.branch}
**Current Task:** ${state.currentTaskId ?? "none"}
**Expected Commit:** ${state.expectedCommitMessage ?? "none"}
**Last Recorded Commit:** ${state.lastRecordedCommit}
**Planning Source Disposition:** ${planningDisposition}
**Planning Source Path:** ${planningArchivePath}

## Active Plan Copy

\`\`\`\`markdown
${markdown.trim()}
\`\`\`\`
`;

export const runPlanCloseout = ({
  acceptance,
  cwd = process.cwd(),
  now = new Date(),
} = {}) => {
  const cleanAcceptance = normalizeText(acceptance ?? "");

  if (!cleanAcceptance) {
    throw new Error('Usage: npm run plan:closeout -- "<acceptance evidence>"');
  }

  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const markdown = readFileSync(planPath, "utf8");
  const validation = validatePlanMarkdown(markdown, {
    gitState: getGitState(cwd),
    sourcePath: planPath,
  });

  if (!validation.ok) {
    throw new Error(
      `Plan validation failed before closeout:\n${formatIssues(
        validation.issues
      )}`
    );
  }

  if (validation.state.executionScopeStatus !== "ACTIVE") {
    throw new Error("plan:closeout requires active execution scope.");
  }

  const closeoutArchiveRelativePath = getArchivePlanPath(
    validation.state.planId
  );
  const planningArchivePath = getPlanningArchivePath(
    validation.state.planningSource
  );

  assertPathIsNotIgnored(cwd, closeoutArchiveRelativePath);
  assertPathIsNotIgnored(cwd, planningArchivePath);

  const planningDisposition = movePlanningSource({
    cwd,
    planningArchivePath,
    planningSource: validation.state.planningSource,
  });
  const nextMarkdown = updateActivePlanPlanningSource({
    markdown,
    planningArchivePath,
    planningSource: validation.state.planningSource,
  });

  writeFileSync(planPath, nextMarkdown, "utf8");
  updateDocsIndex({
    cwd,
    planningArchivePath,
    planningSource: validation.state.planningSource,
  });

  const closeoutArchivePath = resolve(cwd, closeoutArchiveRelativePath);
  mkdirSync(dirname(closeoutArchivePath), { recursive: true });
  writeFileSync(
    closeoutArchivePath,
    createCloseoutArchive({
      acceptance: cleanAcceptance,
      markdown: nextMarkdown,
      now,
      planningArchivePath,
      planningDisposition,
      state: {
        ...validation.state,
        planningSource: planningArchivePath,
      },
    }),
    "utf8"
  );

  console.log(`Plan closeout archive written: ${closeoutArchiveRelativePath}`);
  console.log(`Planning source disposition: ${planningDisposition}`);
  console.log(`Planning source path: ${planningArchivePath}`);

  return {
    closeoutArchiveRelativePath,
    planningArchivePath,
    planningDisposition,
  };
};

const main = () => {
  runPlanCloseout({ acceptance: process.argv.slice(2).join(" ") });
};

try {
  if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

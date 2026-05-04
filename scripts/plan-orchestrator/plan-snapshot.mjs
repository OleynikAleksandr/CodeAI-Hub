import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const SNAPSHOT_DIR = "doc/TODO/Archive";

const formatIssues = (issues) =>
  issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n");

const normalizeNote = (note) => note.trim().replace(/\s+/gu, " ");

const sanitizePathPart = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

const formatSnapshotTimestamp = (date) =>
  date.toISOString().replace(/[:.]/gu, "-");

const extractRecoveryPack = (markdown) => {
  const start = markdown.indexOf("## Recovery Pack");

  if (start === -1) {
    return "_Recovery Pack section not found._";
  }

  const nextSection = markdown.indexOf("\n## ", start + 1);
  return markdown
    .slice(start, nextSection === -1 ? undefined : nextSection)
    .trim();
};

const createSnapshotRelativePath = (state, now) =>
  `${SNAPSHOT_DIR}/todo-plan-snapshot-${sanitizePathPart(
    state.planId
  )}-${formatSnapshotTimestamp(now)}.md`;

const assertSnapshotPathIsNotIgnored = (cwd, relativePath) => {
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

  throw new Error(`Snapshot path is ignored by Git: ${relativePath}`);
};

export const createPlanSnapshot = ({ markdown, note, now, state }) => {
  const cleanNote = normalizeNote(note);
  const recoveryPack = extractRecoveryPack(markdown);

  return `# Plan Snapshot: ${state.planId}

**Created:** ${now.toISOString()}
**Result note:** ${cleanNote}
**Execution Scope Status:** ${state.executionScopeStatus}
**Branch:** ${state.branch}
**Current Task:** ${state.currentTaskId ?? "none"}
**Expected Commit:** ${state.expectedCommitMessage ?? "none"}
**Last Recorded Commit:** ${state.lastRecordedCommit}

${recoveryPack}

## Active Plan Copy

\`\`\`\`markdown
${markdown.trim()}
\`\`\`\`
`;
};

export const runPlanSnapshot = ({
  cwd = process.cwd(),
  note,
  now = new Date(),
} = {}) => {
  const cleanNote = normalizeNote(note ?? "");

  if (!cleanNote) {
    throw new Error('Usage: npm run plan:snapshot -- "<result note>"');
  }

  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const markdown = readFileSync(planPath, "utf8");
  const validation = validatePlanMarkdown(markdown, {
    gitState: getGitState(cwd),
    sourcePath: planPath,
  });

  if (!validation.ok) {
    throw new Error(
      `Plan validation failed before snapshot:\n${formatIssues(
        validation.issues
      )}`
    );
  }

  if (validation.state.executionScopeStatus !== "ACTIVE") {
    throw new Error("plan:snapshot requires active execution scope.");
  }

  const snapshotRelativePath = createSnapshotRelativePath(
    validation.state,
    now
  );
  assertSnapshotPathIsNotIgnored(cwd, snapshotRelativePath);

  const snapshotPath = resolve(cwd, snapshotRelativePath);
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(
    snapshotPath,
    createPlanSnapshot({
      markdown,
      note: cleanNote,
      now,
      state: validation.state,
    }),
    "utf8"
  );

  console.log(`Plan snapshot written: ${snapshotRelativePath}`);
  return { snapshotPath, snapshotRelativePath };
};

const main = () => {
  runPlanSnapshot({ note: process.argv.slice(2).join(" ") });
};

try {
  if (fileURLToPath(import.meta.url) === process.argv[1]) {
    main();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}

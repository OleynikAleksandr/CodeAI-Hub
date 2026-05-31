import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { DiagramModulesManagedGitBoundary } from "./diagram-modules/diagram-modules-managed-git-boundary";
import {
  ensureManagedTerminalGitClean,
  formatManagedTerminalAutoCommitFailure,
  formatManagedTerminalDirtyBlocker,
} from "./managed-terminal-clean-git-boundary";
import {
  classifyManagedTerminalDirtyEntries,
  classifyManagedTerminalDirtyTree,
} from "./managed-terminal-dirty-classifier";

const WORKSPACE_SLUG = "codeai-hub-codex-5-4";
const COMMIT_AND_FINISH_RE = /Commit and finish step/u;
const CONFIRM_AGAIN_RE = /Confirm the step again/u;
const GENERATED_FILES_NOT_SAVED_RE =
  /generated files were not saved automatically/u;
const SHOW_FILES_RE = /Show files/u;
const MANUAL_NOTES_RE = /manual-notes\.md/u;
const NO_FILE_PATH_RE = /No file path was reported/u;
const CORE_INTERNALS_RE =
  /Core|classified|unclassified|managed terminal|dirty-tree/u;
const LOCAL_STATE_IGNORE_RE = /\.codeai-hub\/state\//u;
const execFileAsync = promisify(execFile);

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

test("terminal dirty classifier treats Diagram Modules sidecars and runtime metadata as committable", () => {
  const result = classifyManagedTerminalDirtyEntries({
    entries: [
      `?? .codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/checkpoints/description.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/undo-ledger.json`,
      " M product-parts/project-manager/src/index.ts",
    ],
    stage: "diagram_modules",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.deepEqual(result.committablePaths, [
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/checkpoints/description.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/undo-ledger.json`,
  ]);
  assert.deepEqual(result.unclassifiedPaths, [
    "product-parts/project-manager/src/index.ts",
  ]);
});

test("terminal dirty classifier treats local runtime state as volatile clean state", () => {
  const result = classifyManagedTerminalDirtyEntries({
    entries: ["?? .codeai-hub/state/task-timers.json"],
    stage: "quality_gates",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.equal(result.clean, true);
  assert.deepEqual(result.committablePaths, []);
  assert.deepEqual(result.unclassifiedPaths, []);
  assert.deepEqual(
    result.entries.map((entry) => entry.kind),
    ["local_volatile"]
  );
});

test("terminal dirty classifier accepts Diagram Modules sidecars when workspace slug is unresolved", () => {
  const result = classifyManagedTerminalDirtyEntries({
    entries: [
      `?? .codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`,
    ],
    stage: "diagram_modules",
    workspaceSlug: "__unknown_workspace__",
  });

  assert.deepEqual(result.committablePaths, [
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`,
  ]);
  assert.deepEqual(result.unclassifiedPaths, []);
});

test("terminal dirty blocker text gives user actions without core internals", () => {
  const message = formatManagedTerminalDirtyBlocker(["manual-notes.md"]);

  assert.match(message, COMMIT_AND_FINISH_RE);
  assert.match(message, SHOW_FILES_RE);
  assert.match(message, MANUAL_NOTES_RE);
  assert.doesNotMatch(message, CORE_INTERNALS_RE);
});

test("terminal auto-commit failure text avoids empty file lists and user commit choices", () => {
  const message = formatManagedTerminalAutoCommitFailure([]);

  assert.match(message, GENERATED_FILES_NOT_SAVED_RE);
  assert.match(message, CONFIRM_AGAIN_RE);
  assert.match(message, NO_FILE_PATH_RE);
  assert.doesNotMatch(message, COMMIT_AND_FINISH_RE);
  assert.doesNotMatch(message, SHOW_FILES_RE);
  assert.doesNotMatch(message, CORE_INTERNALS_RE);
});

test("terminal dirty classifier allows application skeleton generated root files", () => {
  const result = classifyManagedTerminalDirtyEntries({
    entries: [
      " M package.json",
      " M tsconfig.base.json",
      " M product-parts/core-runtime/src/index.ts",
      " M scripts/application-skeleton-smoke.cjs",
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
      " M doc/SolidWorks-WorkFlow/System/SystemArchitecture.md",
    ],
    stage: "application_skeleton",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.deepEqual(result.committablePaths, [
    "package.json",
    "tsconfig.base.json",
    "product-parts/core-runtime/src/index.ts",
    "scripts/application-skeleton-smoke.cjs",
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
  ]);
  assert.deepEqual(result.unclassifiedPaths, [
    "doc/SolidWorks-WorkFlow/System/SystemArchitecture.md",
  ]);
});

test("terminal dirty classifier allows quality-gate formatter residue without accepting unrelated files", () => {
  const result = classifyManagedTerminalDirtyEntries({
    entries: [
      " M .husky/pre-commit",
      " M scripts/plan-orchestrator/plan-cli.mjs",
      " M product-parts/ai-providers/tsconfig.json",
      ` M .codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/boundaries.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/managed/diagram_modules.json`,
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      "?? notes/manual-review.md",
    ],
    stage: "quality_gates",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.deepEqual(result.committablePaths, [
    ".husky/pre-commit",
    "scripts/plan-orchestrator/plan-cli.mjs",
    "product-parts/ai-providers/tsconfig.json",
    `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/boundaries.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/diagram_modules.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
  ]);
  assert.deepEqual(result.unclassifiedPaths, ["notes/manual-review.md"]);
});

test("terminal dirty classifier reads the current git tree", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-terminal-dirty-classifier-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      "# stage plan\n"
    );
    await writeWorkspaceFile(workspaceRoot, "manual-notes.md", "# notes\n");

    const result = await classifyManagedTerminalDirtyTree({
      stage: "diagram_modules",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(result.committablePaths, [
      "doc/TODO/stages/diagram-modules/todo-plan.md",
    ]);
    assert.deepEqual(result.unclassifiedPaths, ["manual-notes.md"]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("terminal clean boundary ignores local runtime state and commits metadata gitignore", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-terminal-local-state-clean-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeWorkspaceFile(workspaceRoot, "README.md", "# demo\n");
    await writeWorkspaceFile(workspaceRoot, ".gitignore", "node_modules/\n");
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "test: initial"]);
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/state/task-timers.json",
      '{"schemaVersion":2,"totals":{"quality_gates":10}}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      '{"workspaceSlug":"codeai-hub-codex-5-4"}\n'
    );

    await ensureManagedTerminalGitClean({
      gitBoundary: new DiagramModulesManagedGitBoundary(),
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await git(workspaceRoot, ["status", "--short", "--untracked-files=all"]),
      ""
    );
    assert.match(
      await readFile(path.join(workspaceRoot, ".gitignore"), "utf8"),
      LOCAL_STATE_IGNORE_RE
    );
    assert.equal(
      await git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: commit managed terminal residue"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("terminal clean boundary commits Quality Gates residue from formatted upstream managed artifacts", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-terminal-quality-gates-clean-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
      '{\n  "requiredScripts": [\n    "build",\n    "test:smoke"\n  ]\n}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
      '{\n  "stage": "application_skeleton",\n  "mapJson": {\n    "languages": [\n      "TypeScript"\n    ]\n  }\n}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      '{"stage":"quality_gates"}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nnpm run quality:gates\n"
    );
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, ["commit", "-m", "test: initial"]);

    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`,
      '{"requiredScripts":["build","test:smoke"]}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/application_skeleton.json`,
      '{"stage":"application_skeleton","mapJson":{"languages":["TypeScript"]}}\n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/quality_gates.json`,
      '{"stage":"quality_gates","phase":"return"}\n'
    );

    await ensureManagedTerminalGitClean({
      gitBoundary: new DiagramModulesManagedGitBoundary(),
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await git(workspaceRoot, ["status", "--short", "--untracked-files=all"]),
      ""
    );
    assert.equal(
      await git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: commit managed terminal residue"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

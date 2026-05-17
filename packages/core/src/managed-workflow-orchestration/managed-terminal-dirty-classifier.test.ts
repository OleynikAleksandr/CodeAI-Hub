import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  classifyManagedTerminalDirtyEntries,
  classifyManagedTerminalDirtyTree,
} from "./managed-terminal-dirty-classifier";

const WORKSPACE_SLUG = "codeai-hub-codex-5-4";
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
      ` M .codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
      " M product-parts/project-manager/src/index.ts",
    ],
    stage: "diagram_modules",
    workspaceSlug: WORKSPACE_SLUG,
  });

  assert.deepEqual(result.committablePaths, [
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/module-map.flow.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/state.json`,
  ]);
  assert.deepEqual(result.unclassifiedPaths, [
    "product-parts/project-manager/src/index.ts",
  ]);
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

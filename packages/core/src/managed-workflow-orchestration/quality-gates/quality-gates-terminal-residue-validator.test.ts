import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { collectQualityGatesTerminalResidueDiagnostics } from "./quality-gates-terminal-residue-validator";

const WORKSPACE_SLUG = "demo-workspace";
const ROOT_BUILD_ARTIFACT_RE = /generated_root_build_artifact:surfaces/u;
const WORKSPACE_BUILD_ARTIFACT_RE =
  /generated_workspace_build_artifact:\.artifacts\/go\/terminal/u;
const execFileAsync = promisify(execFile);

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", args, { cwd: workspaceRoot });
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

test("Quality Gates terminal residue flags generated root build artifacts for repair", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-root-build-artifact-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await writeWorkspaceFile(workspaceRoot, "surfaces", "generated binary\n");
    await chmod(path.join(workspaceRoot, "surfaces"), 0o755);

    const diagnostics = await collectQualityGatesTerminalResidueDiagnostics({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.ok(diagnostics.some((item) => ROOT_BUILD_ARTIFACT_RE.test(item)));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates terminal residue flags generated workspace-local build artifacts for repair", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-workspace-build-artifact-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await writeWorkspaceFile(
      workspaceRoot,
      ".artifacts/go/terminal",
      "generated binary\n"
    );
    await chmod(path.join(workspaceRoot, ".artifacts/go/terminal"), 0o755);

    const diagnostics = await collectQualityGatesTerminalResidueDiagnostics({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.ok(
      diagnostics.some((item) => WORKSPACE_BUILD_ARTIFACT_RE.test(item))
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates terminal residue ignores classified core runtime files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-core-runtime-residue-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/boundaries.json`,
      "{}\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/diagram_modules.json`,
      "{}\n"
    );

    const diagnostics = await collectQualityGatesTerminalResidueDiagnostics({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(diagnostics, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

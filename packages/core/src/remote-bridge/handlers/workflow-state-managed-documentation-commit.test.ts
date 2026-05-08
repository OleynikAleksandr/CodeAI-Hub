import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { ManagedPlanOrchestratorInstaller } from "../../managed-workspace/managed-plan-orchestrator-installer";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const execFileAsync = promisify(execFile);
const DIAGRAM_MODULES_AUTO_COMMIT_LOG_RE =
  /chore: record managed workspace ledger[\s\S]+docs: update diagram modules artifacts/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "",
  ].join("\n");

const createProductPart = (): string =>
  [
    "# Product Part: local-runtime",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    "| Part ID | `local-runtime` |",
    "",
    "## Owned Clusters",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `provider-bridge` | Coordinates providers. |",
    "",
  ].join("\n");

const initManagedWorkspace = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
    "# Final Description\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
    "# Virtual Simulation\n"
  );
  await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
    initialStage: "diagram_modules",
  });
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, [
    "-c",
    "core.hooksPath=",
    "commit",
    "-m",
    "test: managed baseline",
  ]);
};

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly gating?: {
    readonly blocked?: Record<string, boolean>;
  };
}> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = {
      json: (payload: unknown) => resolve(payload as never),
    } as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state auto-commits valid Diagram Modules artifacts and unlocks Application Skeleton", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-managed-commit-diagram-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await initManagedWorkspace(workspaceRoot, workspaceSlug);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex()
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-runtime.md`,
      createProductPart()
    );

    const payload = await readWorkflowStatePayload({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(payload.gating?.blocked?.application_skeleton, false);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await runGit(workspaceRoot, ["log", "--oneline", "-2"]),
      DIAGRAM_MODULES_AUTO_COMMIT_LOG_RE
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

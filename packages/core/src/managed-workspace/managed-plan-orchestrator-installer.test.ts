import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-plan-"));

test("ManagedPlanOrchestratorInstaller writes plan scripts, hooks, and package scripts", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "demo", scripts: { test: "node test.js" } }, null, 2)}\n`,
      "utf8"
    );

    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot
    );

    assert.equal(result.hooksWritten.length, 5);
    assert.equal(result.packageScripts.includes("plan:status"), true);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, "scripts/plan-orchestrator/plan-cli.mjs"),
        "utf8"
      ).then((content) => content.includes("codeai-plan-state:start")),
      true
    );

    const packageJson = JSON.parse(
      await readFile(path.join(workspaceRoot, "package.json"), "utf8")
    );
    assert.equal(packageJson.scripts.test, "node test.js");
    assert.equal(
      packageJson.scripts["plan:validate"],
      "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

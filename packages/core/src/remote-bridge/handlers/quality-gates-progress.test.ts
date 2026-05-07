import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readQualityGatesProgressSnapshot } from "./quality-gates-progress";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeQualityGateArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    ".codeai-hub/demo/quality_gates/quality-gates.md",
    "# Quality Gates Baseline\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".codeai-hub/demo/quality_gates/quality-gates.json",
    `${JSON.stringify(
      {
        accepted: true,
        commands: {
          "qg-secret-scan": {
            availability: "executable",
            desiredStatus: "active",
            id: "qg-secret-scan",
          },
          "qg-smoke-checks": {
            availability: "executable",
            desiredStatus: "active",
            id: "qg-smoke-checks",
          },
        },
        integrated: true,
        integrationState: "integrated",
        requiredBeforeCommit: ["qg-secret-scan"],
        requiredBeforePush: ["qg-smoke-checks"],
        schema: "codeai-quality-gates-v1",
      },
      null,
      2
    )}\n`
  );
};

test("Quality Gates progress requires lifecycle hook wiring before integrated", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-progress-")
  );
  try {
    await writeQualityGateArtifacts(workspaceRoot);

    const missingHooks = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(missingHooks?.accepted, true);
    assert.equal(missingHooks?.integrated, false);
    assert.equal(missingHooks?.substep, "failed");
    assert.deepEqual(missingHooks?.validationErrors, [
      "Quality gate qg-secret-scan is missing from .husky/pre-commit",
      "Quality gate qg-smoke-checks is missing from .husky/pre-push",
    ]);

    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nnpm run qg:secret-scan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-push",
      "#!/bin/sh\nnpm run qg:smoke-checks\n"
    );

    const hooked = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(hooked?.integrated, true);
    assert.equal(hooked?.substep, "integrated");
    assert.deepEqual(hooked?.validationErrors, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "demo-workspace";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeQualityGatesArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  const contract = {
    accepted: true,
    advisory: [],
    commands: {
      "qg:audit-js": {
        availability: "executable",
        desiredStatus: "active",
        id: "qg:audit-js",
        integrationRequired: true,
        proposedCommand: "npm run qg:audit-js",
      },
      "qg:size-limit-500": {
        availability: "executable",
        desiredStatus: "active",
        id: "qg:size-limit-500",
        integrationRequired: true,
        policy: {
          appliesTo: ["source_files", "classes"],
          maxLines: 500,
          type: "source_size_limit",
        },
        proposedCommand: "npm run qg:size-limit-500",
      },
    },
    deferred: [],
    integrated: true,
    integratedPaths: [
      "package.json",
      ".husky/pre-commit",
      ".husky/pre-push",
      "scripts/quality-gates/size-limit-500.mjs",
      "scripts/quality-gates/audit-js.mjs",
    ],
    integrationState: "integrated",
    plannedRequiredAfterIntegration: [],
    requiredBeforeCommit: ["qg:size-limit-500"],
    requiredBeforeModuleExecution: [],
    requiredBeforePush: ["qg:audit-js"],
    requiredBeforeRelease: [],
    schema: "codeai-quality-gates-v1",
  };

  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\n## Summary\n\nQuality gates are selected.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        recommendations: [
          {
            purpose: "architecture",
            recommendation: "Limit source files and classes.",
            requiredChecks: ["qg:size-limit-500"],
            sourceUrls: ["https://example.com/quality-gates"],
            tradeoff: "Adds a lightweight file scan.",
            userApprovalRequired: false,
            whyUse: "Keeps generated code modular.",
          },
        ],
        schema: "codeai-quality-gates-research-v1",
        sources: [
          {
            retrievedAt: "2026-05-31T00:00:00.000Z",
            sourceType: "primary",
            title: "Quality gate policy",
            url: "https://example.com/quality-gates",
            whyRelevant: "Defines the source size policy.",
          },
        ],
        stackSummary: "Node workspace",
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n\n## Overview\n\nIntegrated gates.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    `${JSON.stringify(contract, null, 2)}\n`
  );
};

const writeIntegratedSupportFiles = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    `${JSON.stringify(
      {
        scripts: {
          "qg:audit-js": "node scripts/quality-gates/audit-js.mjs",
          "qg:size-limit-500": "node scripts/quality-gates/size-limit-500.mjs",
        },
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nset -e\nnpm run qg:size-limit-500\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-push",
    "#!/bin/sh\nset -e\nnpm run qg:audit-js\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "scripts/quality-gates/size-limit-500.mjs",
    "console.log('ok');\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "scripts/quality-gates/audit-js.mjs",
    "console.log('ok');\n"
  );
};

test("Quality Gates validator accepts required gate ids that already use qg colon script names", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-script-id-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot);
    await writeIntegratedSupportFiles(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.nextAction, "open_persistent_return");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

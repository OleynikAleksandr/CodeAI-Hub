import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "name-agnostic-workspace";
const NOT_REACHABLE_RE = /gate_command_not_reachable:qg-typecheck/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const buildRunOneContract = (): Record<string, unknown> => ({
  accepted: true,
  advisory: [],
  commands: {
    "qg-source-size": {
      availability: "executable",
      blockingIn: ["beforeCommit"],
      desiredStatus: "active",
      id: "qg-source-size",
      integrationRequired: false,
      policy: {
        appliesTo: ["source_files", "classes"],
        maxLines: 500,
        type: "source_size_limit",
      },
      proposedCommand: "npm run qg:qg-source-size",
    },
    "qg-typecheck": {
      availability: "executable",
      blockingIn: ["beforeCommit"],
      desiredStatus: "active",
      id: "qg-typecheck",
      integrationRequired: false,
      proposedCommand: "npm run qg:qg-typecheck",
    },
  },
  deferred: [],
  integrated: true,
  integratedPaths: ["package.json", ".husky/pre-commit"],
  integrationState: "integrated",
  plannedRequiredAfterIntegration: [],
  requiredBeforeCommit: ["qg-typecheck", "qg-source-size"],
  requiredBeforeModuleExecution: [],
  requiredBeforePush: [],
  requiredBeforeRelease: [],
  schema: "codeai-quality-gates-v1",
  verification: [],
});

const writeRunOneWorkspace = async (params: {
  readonly preCommitHook: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\n## Summary\n\nTypecheck and size gates.\n"
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        recommendations: [
          {
            purpose: "correctness",
            recommendation: "Run the TypeScript compiler as a gate.",
            requiredChecks: ["qg-typecheck"],
            sourceUrls: ["https://www.typescriptlang.org/docs/"],
            tradeoff: "Adds pre-commit runtime.",
            userApprovalRequired: false,
            whyUse: "Catches type errors before commits.",
          },
        ],
        schema: "codeai-quality-gates-research-v1",
        sources: [
          {
            retrievedAt: "2026-06-10T00:00:00.000Z",
            sourceType: "official",
            title: "TypeScript documentation",
            url: "https://www.typescriptlang.org/docs/",
            whyRelevant: "Defines compiler checks.",
          },
        ],
        stackSummary: "Node.js TypeScript workspace",
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n\n## Overview\n\nGate contract.\n"
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    `${JSON.stringify(buildRunOneContract(), null, 2)}\n`
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    "package.json",
    `${JSON.stringify(
      {
        scripts: {
          "qg:qg-source-size": "node scripts/quality-gates/source-size.mjs",
          "qg:qg-typecheck": "node scripts/quality-gates/typecheck.mjs",
        },
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    ".husky/pre-commit",
    params.preCommitHook
  );
};

test("run-1 contract with qg- gate ids and agent-chosen script names passes integration", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-name-agnostic-")
  );
  try {
    await writeRunOneWorkspace({
      preCommitHook:
        "#!/bin/sh\nset -e\nnpm run qg:qg-typecheck\nnpm run qg:qg-source-size\n",
      workspaceRoot,
    });

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.deepEqual(result.diagnostics, []);
    assert.equal(result.valid, true);
    assert.equal(result.phase, "integration");
    assert.equal(result.nextAction, "open_persistent_return");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("run-1 contract is rejected only when a gate command is unreachable from its hook", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-name-agnostic-")
  );
  try {
    await writeRunOneWorkspace({
      preCommitHook: "#!/bin/sh\nset -e\nnpm run qg:qg-source-size\n",
      workspaceRoot,
    });

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.equal(result.diagnostics.length, 1);
    assert.match(result.diagnostics[0] ?? "", NOT_REACHABLE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

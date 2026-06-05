import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "demo-workspace";
const RUNNER_EVIDENCE_RE = /runner evidence after Phase 3/u;
const DRAFT_PHASE_RE = /In draft phase/u;
const VERIFIED_RETURN_RE = /formal enforcement checks passed/u;

const writeFileInWorkspace = async (
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
  const basePath = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates`;
  await writeFileInWorkspace(
    workspaceRoot,
    `${basePath}/quality-gates-research.md`,
    "# Quality Gates Research\n\nRunner evidence regression.\n"
  );
  await writeFileInWorkspace(
    workspaceRoot,
    `${basePath}/quality-gates-research.json`,
    `${JSON.stringify({
      recommendations: [
        {
          purpose: "security",
          recommendation: "Add a secret scan gate.",
          requiredChecks: ["qg-secret-scan"],
          sourceUrls: ["https://docs.npmjs.com/"],
          tradeoff: "Adds hook runtime.",
          userApprovalRequired: false,
          whyUse: "Prevents credential commits.",
        },
      ],
      schema: "codeai-quality-gates-research-v1",
      sources: [
        {
          retrievedAt: "2026-05-31T00:00:00.000Z",
          sourceType: "official",
          title: "npm scripts",
          url: "https://docs.npmjs.com/",
          whyRelevant: "Defines npm script execution.",
        },
      ],
      stackSummary: "npm workspace",
    })}\n`
  );
  await writeFileInWorkspace(
    workspaceRoot,
    `${basePath}/quality-gates.md`,
    "# Quality Gates Baseline\n\n## Overview\n\nIntegrated baseline.\n"
  );
  await writeFileInWorkspace(
    workspaceRoot,
    `${basePath}/quality-gates.json`,
    `${JSON.stringify({
      accepted: true,
      advisory: [],
      commands: {
        "qg-max-file-lines": {
          availability: "executable",
          baseline: ["recommended"],
          blockingIn: ["beforeCommit"],
          desiredStatus: "active",
          id: "qg-max-file-lines",
          integrationRequired: true,
          policy: {
            appliesTo: ["source_files", "classes"],
            maxLines: 500,
            type: "source_size_limit",
          },
          proposedCommand: "npm run qg:max-file-lines",
        },
        "qg-secret-scan": {
          availability: "not_integrated",
          baseline: ["recommended"],
          blockingIn: ["beforeCommit"],
          desiredStatus: "active",
          id: "qg-secret-scan",
          integrationRequired: true,
          plannedIntegrationPaths: [
            "package.json",
            ".husky/pre-commit",
            "scripts/quality-gates/secret-scan.mjs",
          ],
          proposedCommand: "npm run qg:secret-scan",
        },
      },
      deferred: [],
      integrated: true,
      integratedPaths: [
        "package.json",
        ".husky/pre-commit",
        "scripts/quality-gates/max-file-lines.mjs",
        "scripts/quality-gates/secret-scan.mjs",
      ],
      integrationState: "integrated",
      plannedRequiredAfterIntegration: ["qg-secret-scan"],
      requiredBeforeCommit: ["qg-max-file-lines"],
      requiredBeforeModuleExecution: [],
      requiredBeforePush: [],
      requiredBeforeRelease: [],
      schema: "codeai-quality-gates-v1",
    })}\n`
  );
};

const writeQualityGatesJson = async (
  workspaceRoot: string,
  contract: Record<string, unknown>
): Promise<void> => {
  await writeFileInWorkspace(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    `${JSON.stringify(contract, null, 2)}\n`
  );
};

const writeVerificationStagePlan = async (
  workspaceRoot: string
): Promise<void> => {
  await writeFileInWorkspace(
    workspaceRoot,
    "doc/TODO/stages/quality-gates/todo-plan.md",
    [
      "<!-- codeai-plan-state:start -->",
      "```json",
      '{"currentTaskId":"quality-gates.phase4.verify.task1"}',
      "```",
      "<!-- codeai-plan-state:end -->",
    ].join("\n")
  );
};

const buildVerifiedContract = (): Record<string, unknown> => ({
  accepted: true,
  advisory: [],
  commands: {
    "qg-max-file-lines": {
      availability: "executable",
      baseline: ["recommended"],
      blockingIn: ["beforeCommit"],
      desiredStatus: "active",
      id: "qg-max-file-lines",
      integrationRequired: true,
      policy: {
        appliesTo: ["source_files", "classes"],
        maxLines: 500,
        type: "source_size_limit",
      },
      proposedCommand: "npm run qg:max-file-lines",
    },
    "qg-secret-scan": {
      availability: "executable",
      baseline: ["recommended"],
      blockingIn: ["beforeCommit"],
      desiredStatus: "active",
      id: "qg-secret-scan",
      integrationRequired: true,
      proposedCommand: "npm run qg:secret-scan",
    },
  },
  deferred: [],
  integrated: true,
  integratedPaths: [
    "package.json",
    ".husky/pre-commit",
    "scripts/quality-gates/max-file-lines.mjs",
    "scripts/quality-gates/secret-scan.mjs",
  ],
  integrationState: "integrated",
  plannedRequiredAfterIntegration: [],
  requiredBeforeCommit: ["qg-max-file-lines", "qg-secret-scan"],
  requiredBeforeModuleExecution: [],
  requiredBeforePush: [],
  requiredBeforeRelease: [],
  schema: "codeai-quality-gates-v1",
});

const writeRunnerEvidence = async (workspaceRoot: string): Promise<void> => {
  await writeFileInWorkspace(
    workspaceRoot,
    "package.json",
    `${JSON.stringify({
      scripts: {
        "qg:max-file-lines": "node scripts/quality-gates/max-file-lines.mjs",
        "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
      },
    })}\n`
  );
  await writeFileInWorkspace(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nset -e\nnpm run qg:max-file-lines\nnpm run qg:secret-scan\n"
  );
  await writeFileInWorkspace(
    workspaceRoot,
    "scripts/quality-gates/max-file-lines.mjs",
    "console.log('ok');\n"
  );
  await writeFileInWorkspace(
    workspaceRoot,
    "scripts/quality-gates/secret-scan.mjs",
    "console.log('ok');\n"
  );
};

test("Quality Gates rejects planned/not_integrated gates with runner evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-runner-evidence-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot);
    await writeRunnerEvidence(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(
      result.diagnostics.some((diagnostic) =>
        diagnostic.startsWith(
          "planned_gate_has_runner_evidence_after_integration:qg-secret-scan:"
        )
      )
    );
    assert.match(result.nextPrompt ?? "", RUNNER_EVIDENCE_RE);
    assert.doesNotMatch(result.nextPrompt ?? "", DRAFT_PHASE_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates verification phase rejects missing formal evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-missing-verification-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot);
    await writeQualityGatesJson(workspaceRoot, buildVerifiedContract());
    await writeRunnerEvidence(workspaceRoot);
    await writeVerificationStagePlan(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.phase, "verification");
    assert.ok(result.diagnostics.includes("missing_verification_state"));
    assert.ok(result.diagnostics.includes("missing_verification_evidence"));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates verification phase accepts recorded command evidence", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-verified-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot);
    await writeQualityGatesJson(workspaceRoot, {
      ...buildVerifiedContract(),
      verificationEvidence: {
        checkedAt: "2026-06-05T00:00:00.000Z",
        commands: [
          { command: "sh .husky/pre-commit", status: "passed" },
          { command: "npm run qg:max-file-lines", status: "passed" },
          { command: "npm run qg:secret-scan", status: "passed" },
        ],
      },
      verificationState: "verified",
    });
    await writeRunnerEvidence(workspaceRoot);
    await writeVerificationStagePlan(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.phase, "verification");
    assert.equal(result.nextAction, "open_persistent_return");
    assert.match(result.nextPrompt ?? "", VERIFIED_RETURN_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

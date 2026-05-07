import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { normalizeAndValidateWorkflowStageArtifact } from "../remote-bridge/handlers/http-api-artifact-validation";
import { readDevelopmentTreeBootstrapGate } from "./development-tree-bootstrap-gate";

const execFileAsync = promisify(execFile);

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeJsonArtifact = async (params: {
  readonly content: Record<string, unknown>;
  readonly fileName: string;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${params.fileName}`,
    `${JSON.stringify(params.content, null, 2)}\n`
  );
};

const writeManagedPlanEvidence = async (params: {
  readonly workspaceRoot: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    "doc/TODO/workspace.plan.md",
    [
      "# Managed Workspace Plan",
      "",
      "<!-- codeai-workspace-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          acceptedCommits: [
            {
              commitHash: "abc1234",
              planPath: "doc/TODO/stages/quality-gates/todo-plan.md",
              stage: "quality_gates",
            },
          ],
          activePlanPath: "doc/TODO/stages/quality-gates/todo-plan.md",
          activeStage: "quality_gates",
          schema: "codeai-workspace-plan-v1",
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-workspace-plan-state:end -->",
      "",
    ].join("\n")
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    "doc/TODO/stages/quality-gates/todo-plan.md",
    [
      "# Managed Workspace TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          currentTaskId: "quality-gates.stream1.task2",
          debt: null,
          executionScopeStatus: "ACTIVE",
          expectedCommitMessage: "feat: integrate quality gates baseline",
          schema: "codeai-plan-v1",
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
    ].join("\n")
  );
};

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<void> => {
  await execFileAsync("git", [...args], { cwd: workspaceRoot });
};

const commitWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
  await runGit(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: accept quality gates"]);
};

const writeMarkdownArtifact = async (params: {
  readonly fileName: string;
  readonly heading: string;
  readonly stage: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/${params.stage}/${params.fileName}`,
    `# ${params.heading}\n`
  );
};

const validateQualityGatesJson = (content: Record<string, unknown>) =>
  normalizeAndValidateWorkflowStageArtifact({
    fileName: "quality-gates.json",
    markdown: JSON.stringify(content),
  });

test("quality gates validation rejects contradictory blocker contracts", () => {
  const advisoryBlocker = validateQualityGatesJson({
    advisory: ["license-policy"],
    commands: {
      "license-policy": {
        blockingIn: ["beforeRelease"],
        desiredStatus: "advisory",
        id: "license-policy",
      },
    },
    schema: "codeai-quality-gates-v1",
  });
  assert.equal(advisoryBlocker.ok, false);
  assert.equal(
    advisoryBlocker.error.includes("must not have blocking phases"),
    true
  );

  const missingIntegrationPlan = validateQualityGatesJson({
    commands: {
      "format-check": {
        availability: "not_integrated",
        desiredStatus: "active",
        id: "format-check",
        integrationRequired: true,
      },
    },
    requiredBeforeCommit: ["format-check"],
    schema: "codeai-quality-gates-v1",
  });
  assert.equal(missingIntegrationPlan.ok, false);
  assert.equal(
    missingIntegrationPlan.error.includes("plannedIntegrationPaths"),
    true
  );

  const commandsArray = validateQualityGatesJson({
    commands: [
      {
        availability: "not_integrated",
        desiredStatus: "active",
        id: "format-check",
        integrationRequired: true,
        plannedIntegrationPaths: ["package.json"],
      },
    ],
    requiredBeforeCommit: ["format-check"],
    schema: "codeai-quality-gates-v1",
  });
  assert.equal(commandsArray.ok, false);
  assert.equal(commandsArray.error.includes("object keyed by gate id"), true);

  const plannedRequiredDuplicate = validateQualityGatesJson({
    commands: {
      "format-check": {
        availability: "not_integrated",
        desiredStatus: "active",
        id: "format-check",
        integrationRequired: true,
        plannedIntegrationPaths: ["package.json"],
      },
    },
    plannedRequiredAfterIntegration: ["format-check"],
    requiredBeforeCommit: ["format-check"],
    schema: "codeai-quality-gates-v1",
  });
  assert.equal(plannedRequiredDuplicate.ok, false);
  assert.equal(
    plannedRequiredDuplicate.error.includes("both required and non-blocking"),
    true
  );

  const invalidPlannedRequired = validateQualityGatesJson({
    commands: {
      "format-check": {
        availability: "not_integrated",
        desiredStatus: "planned",
        id: "format-check",
        integrationRequired: true,
        plannedIntegrationPaths: ["package.json"],
      },
    },
    plannedRequiredAfterIntegration: ["format-check"],
    schema: "codeai-quality-gates-v1",
  });
  assert.equal(invalidPlannedRequired.ok, false);
  assert.equal(
    invalidPlannedRequired.error.includes("must be active and not_integrated"),
    true
  );
});

test("development tree stays locked until quality gates transaction is committed", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "development-tree-bootstrap-gate-")
  );
  const workspaceSlug = "demo";

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      [
        "# Application Skeleton",
        "- `reviewState`: `materialized`",
        "- `accepted`: `true`",
        "- `materialized`: `true`",
        "- `materializationState`: `materialized`",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "product-parts/demo/README.md",
      "# Demo Product Part\n"
    );
    await writeJsonArtifact({
      fileName: "application-skeleton-map.json",
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        materializedPaths: ["product-parts/demo/README.md"],
        materialized: true,
        materializationState: "materialized",
        productParts: [{ codePath: "product-parts/demo", partId: "demo" }],
        reviewState: "materialized",
        schema: "codeai-application-skeleton-v1",
        sourceRoot: "product-parts",
      },
    });
    await writeMarkdownArtifact({
      fileName: "quality-gates.md",
      heading: "Quality Gates Baseline",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
    });
    await writeJsonArtifact({
      fileName: "quality-gates.json",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        commands: {},
        integrated: false,
        integrationState: "not_started",
        schema: "codeai-quality-gates-v1",
      },
    });

    const acceptedOnly = await readDevelopmentTreeBootstrapGate({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(acceptedOnly.qualityGatesProgress?.accepted, true);
    assert.equal(acceptedOnly.qualityGatesProgress?.integrated, false);
    assert.equal(acceptedOnly.unlocked, false);

    await writeJsonArtifact({
      fileName: "quality-gates.json",
      stage: "quality_gates",
      workspaceRoot,
      workspaceSlug,
      content: {
        accepted: true,
        commands: {},
        integrated: true,
        integratedPaths: ["package.json", ".husky/pre-commit"],
        integrationState: "integrated",
        schema: "codeai-quality-gates-v1",
      },
    });

    const integrated = await readDevelopmentTreeBootstrapGate({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(integrated.qualityGatesProgress?.integrated, true);
    assert.equal(integrated.qualityGatesProgress?.substep, "integrated");
    assert.equal(integrated.qualityGatesTransaction.ready, false);
    assert.equal(
      integrated.qualityGatesTransaction.blockers.includes(
        "Missing accepted quality_gates commit in workspace.plan.md"
      ),
      true
    );
    assert.equal(integrated.unlocked, false);

    await writeManagedPlanEvidence({ workspaceRoot });
    await commitWorkspace(workspaceRoot);

    const committed = await readDevelopmentTreeBootstrapGate({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(committed.qualityGatesProgress?.integrated, true);
    assert.equal(committed.qualityGatesTransaction.ready, true);
    assert.deepEqual(committed.qualityGatesTransaction.blockers, []);
    assert.equal(committed.unlocked, true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

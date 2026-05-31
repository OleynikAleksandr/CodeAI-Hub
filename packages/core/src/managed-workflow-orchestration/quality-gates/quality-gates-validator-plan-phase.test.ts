import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

const writeStagePlanState = async (
  workspaceRoot: string,
  currentTaskId: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/stages/quality-gates/todo-plan.md",
    [
      "# Quality Gates Managed TODO Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          currentTaskId,
          expectedCommitMessage:
            "feat: repair quality gates integration attempt 1",
          lastRecordedCommit: "415616d",
          schema: "codeai-plan-v1",
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-plan-state:end -->",
    ].join("\n")
  );
};

const writeResearchArtifacts = async (workspaceRoot: string): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\n## Stack Summary\n\nNode workspace.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        recommendations: [
          {
            purpose: "architecture",
            recommendation: "Source size gate",
            requiredChecks: ["qg:source-size-500"],
            sourceUrls: ["https://example.com/source-size"],
            tradeoff: "Adds a local check.",
            userApprovalRequired: false,
            whyUse: "Preserves architecture limits.",
          },
        ],
        schema: "codeai-quality-gates-research-v1",
        sources: [
          {
            retrievedAt: "2026-05-31T00:00:00.000Z",
            sourceType: "primary",
            title: "Architecture policy",
            url: "https://example.com/source-size",
            whyRelevant: "Defines the source size gate.",
          },
        ],
        stackSummary: "Node workspace",
      },
      null,
      2
    )}\n`
  );
};

const writeDraftContractArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n\n## Overview\n\nDraft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    `${JSON.stringify(
      {
        accepted: false,
        advisory: [],
        commands: {
          "qg:source-size-500": {
            availability: "not_integrated",
            baseline: "recommended",
            blockingIn: [],
            desiredStatus: "active",
            id: "qg:source-size-500",
            integrationRequired: true,
            plannedIntegrationPaths: ["package.json"],
            policy: {
              appliesTo: ["source_files", "classes"],
              maxLines: 500,
              type: "source_size_limit",
            },
            proposedCommand: "npm run qg:source-size-500",
          },
        },
        deferred: [],
        deferredIntegration: [],
        integrated: false,
        integratedPaths: [],
        integrationState: "not_started",
        plannedRequiredAfterIntegration: ["qg:source-size-500"],
        projectProfile: {},
        requiredBeforeCommit: [],
        requiredBeforeModuleExecution: [],
        requiredBeforePush: [],
        requiredBeforeRelease: [],
        schema: "codeai-quality-gates-v1",
        selectedBaseline: "recommended",
      },
      null,
      2
    )}\n`
  );
};

test("Quality Gates integration repair phase is owned by the stage plan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "quality-gates-plan-phase-")
  );
  try {
    await writeStagePlanState(
      workspaceRoot,
      "quality-gates.phase3.repair.task1"
    );
    await writeResearchArtifacts(workspaceRoot);
    await writeDraftContractArtifacts(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.phase, "integration");
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(result.diagnostics.includes("accepted_required_for_integration"));
    assert.ok(result.diagnostics.includes("integrated_required"));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

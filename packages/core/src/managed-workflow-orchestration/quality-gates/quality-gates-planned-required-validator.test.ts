import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "demo-workspace";
const CONTRACT_TARGET_ARTIFACTS = [
  `- \`.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md\``,
  `- \`.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json\``,
] as const;
const PLANNED_REQUIRED_REPAIR_RE =
  /Do not convert planned required gates into advisory/u;

const extractTargetArtifacts = (prompt: string): readonly string[] => {
  const targetsSection = prompt.split("Target artifacts:").at(1);
  if (!targetsSection) {
    return [];
  }
  const [targetLines = ""] = targetsSection.split("Diagnostics:");
  return targetLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
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

const writeResearchArtifacts = async (workspaceRoot: string): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\nResearch is accepted.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        recommendations: [
          {
            purpose: "format",
            recommendation: "Use a format gate.",
            requiredChecks: ["format"],
            sourceUrls: ["https://example.com"],
            tradeoff: "Adds runtime.",
            userApprovalRequired: false,
            whyUse: "Keeps formatting stable.",
          },
        ],
        schema: "codeai-quality-gates-research-v1",
        sources: [
          {
            retrievedAt: "2026-05-24T00:00:00.000Z",
            sourceType: "official",
            title: "Tool docs",
            url: "https://example.com",
            whyRelevant: "Documents the gate.",
          },
        ],
        stackSummary: "TypeScript workspace",
      },
      null,
      2
    )}\n`
  );
};

test("Quality Gates rejects advisory planned-required draft gates", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "qg-planned-"));
  try {
    await writeResearchArtifacts(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
      "# Quality Gates Baseline\n\n## Required Gates After Integration\n\n- `format`\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
      `${JSON.stringify(
        {
          accepted: false,
          advisory: [],
          commands: {
            format: {
              availability: "not_integrated",
              desiredStatus: "advisory",
              id: "format",
              integrationRequired: false,
              plannedIntegrationPaths: ["package.json"],
            },
          },
          integrated: false,
          integrationState: "not_started",
          plannedRequiredAfterIntegration: ["format"],
          requiredBeforeCommit: [],
          requiredBeforeModuleExecution: [],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.includes("planned_required_gate_non_active:format")
    );
    assert.ok(
      result.diagnostics.includes(
        "planned_required_gate_not_integration_required:format"
      )
    );
    assert.deepEqual(
      extractTargetArtifacts(result.nextPrompt ?? ""),
      CONTRACT_TARGET_ARTIFACTS
    );
    assert.match(result.nextPrompt ?? "", PLANNED_REQUIRED_REPAIR_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

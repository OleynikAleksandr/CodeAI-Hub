import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "demo-workspace";
const RESEARCH_REVIEW_OPEN_RE = /research report shape is valid/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const researchJson = (): string =>
  `${JSON.stringify(
    {
      recommendations: [
        {
          purpose: "security",
          recommendation: "Add a secret scanning gate.",
          requiredChecks: ["qg-secret-scan"],
          sourceUrls: ["https://docs.npmjs.com/"],
          tradeoff: "Adds pre-commit runtime.",
          userApprovalRequired: false,
          whyUse: "Prevents committing credentials.",
        },
      ],
      schema: "codeai-quality-gates-research-v1",
      sources: [
        {
          retrievedAt: "2026-05-22T00:00:00.000Z",
          sourceType: "official",
          title: "Official npm docs",
          url: "https://docs.npmjs.com/",
          whyRelevant: "Defines npm script behavior for hooks.",
        },
      ],
      stackSummary: "Node.js workspace",
    },
    null,
    2
  )}\n`;

const contractJson = (): string =>
  `${JSON.stringify(
    {
      accepted: false,
      commands: {
        "qg-secret-scan": {
          availability: "not_integrated",
          desiredStatus: "active",
          id: "qg-secret-scan",
          integrationRequired: true,
          plannedIntegrationPaths: ["package.json"],
        },
      },
      integrated: false,
      integrationState: "not_started",
      requiredBeforeCommit: ["qg-secret-scan"],
      requiredBeforeModuleExecution: [],
      schema: "codeai-quality-gates-v1",
    },
    null,
    2
  )}\n`;

const writeResearchArtifacts = async (workspaceRoot: string): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\nSecret scanning is recommended.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    researchJson()
  );
};

const writeInitialStagePlan = async (workspaceRoot: string): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/stages/quality-gates/todo-plan.md",
    [
      "<!-- codeai-plan-state:start -->",
      "```json",
      '{"currentTaskId":"quality-gates.phase1.draft.task1"}',
      "```",
      "<!-- codeai-plan-state:end -->",
    ].join("\n")
  );
};

test("Quality Gates validator accepts research-only first pass", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "qg-research-"));
  try {
    await writeInitialStagePlan(workspaceRoot);
    await writeResearchArtifacts(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.nextAction, "open_user_review");
    assert.match(result.nextPrompt ?? "", RESEARCH_REVIEW_OPEN_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects contract files in the initial research pass", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "qg-early-"));
  try {
    await writeInitialStagePlan(workspaceRoot);
    await writeResearchArtifacts(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
      "# Quality Gates Baseline\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
      contractJson()
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.includes(
        "quality_gates_contract_before_research_review"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

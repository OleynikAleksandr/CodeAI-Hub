import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildQualityGatesBoundaryBlockedMessage,
  buildQualityGatesIntegrationPrompt,
  buildQualityGatesReviewRevisionPrompt,
} from "./quality-gates-prompt-builder";
import { validateQualityGatesManagedArtifacts } from "./quality-gates-validator";

const WORKSPACE_SLUG = "demo-workspace";
const DRAFT_REJECTED_RE = /Core rejected the current Quality Gates draft/u;
const INTEGRATION_ACCEPTED_RE = /Core accepted Quality Gates integration/u;
const INTEGRATION_OPEN_RE = /Core opens Phase 3 Quality Gates Integration/u;
const INTEGRATION_REJECTED_RE = /Core rejected Quality Gates integration/u;
const PLAN_STATE_PROBLEM_RE = /orchestrator plan-state problem/u;
const QUALITY_GATES_BASELINE_HEADING_RE =
  /Set the first Markdown heading to exactly `# Quality Gates Baseline`/u;
const REVIEW_CORRECTIONS_RE = /review corrections/u;
const USER_REVIEW_OPEN_RE = /user review is now open/u;
const REQUIRED_INTEGRATED_GATE_IDS = [
  "qg-secret-scan",
  "qg-max-file-lines",
] as const;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const buildQualityGatesJson = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  accepted: false,
  advisory: [],
  commands: {
    "qg-secret-scan": {
      availability: "not_integrated",
      baseline: ["recommended"],
      blockingIn: ["beforeCommit"],
      desiredStatus: "active",
      id: "qg-secret-scan",
      integrationRequired: true,
      plannedIntegrationPaths: ["package.json", "scripts/quality-gates"],
      proposedCommand: "npm run qg:secret-scan",
    },
  },
  deferred: [],
  integrated: false,
  integratedPaths: [],
  integrationState: "not_started",
  plannedRequiredAfterIntegration: [],
  requiredBeforeCommit: ["qg-secret-scan"],
  requiredBeforeModuleExecution: [],
  requiredBeforePush: [],
  requiredBeforeRelease: [],
  schema: "codeai-quality-gates-v1",
  verification: [],
  ...overrides,
});

const buildExecutableCommands = (): Record<string, unknown> => ({
  "qg-max-file-lines": {
    availability: "executable",
    baseline: ["minimal", "recommended", "strict"],
    blockingIn: ["beforeCommit"],
    desiredStatus: "active",
    id: "qg-max-file-lines",
    integrationRequired: true,
    proposedCommand: "npm run qg:max-file-lines",
    purpose: "Enforce source files and classes <= 500 lines.",
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
});

const writeQualityGatesArtifacts = async (
  workspaceRoot: string,
  contract: Record<string, unknown>,
  markdown = "# Quality Gates Baseline\n\n## Overview\n\nGate contract.\n"
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.md`,
    "# Quality Gates Research\n\n## Summary\n\nSecret scanning is recommended.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates-research.json`,
    `${JSON.stringify(
      {
        schema: "codeai-quality-gates-research-v1",
        stackSummary: "Node.js workspace",
        sources: [
          {
            title: "Official npm docs",
            url: "https://docs.npmjs.com/",
            sourceType: "official",
            retrievedAt: "2026-05-22T00:00:00.000Z",
            whyRelevant: "Defines npm script behavior for hooks.",
          },
        ],
        recommendations: [
          {
            purpose: "security",
            recommendation: "Add a secret scanning gate.",
            whyUse: "Prevents committing credentials.",
            sourceUrls: ["https://docs.npmjs.com/"],
            tradeoff: "Adds pre-commit runtime.",
            requiredChecks: ["qg-secret-scan"],
            userApprovalRequired: false,
          },
        ],
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    markdown
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
          "qg:max-file-lines": "node scripts/quality-gates/max-file-lines.mjs",
          "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
        },
      },
      null,
      2
    )}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nset -e\nnpm run qg:max-file-lines\nnpm run qg:secret-scan\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "scripts/quality-gates/max-file-lines.mjs",
    "console.log('ok');\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "scripts/quality-gates/secret-scan.mjs",
    "console.log('ok');\n"
  );
};

test("Quality Gates validator accepts draft contract and opens user review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-draft-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot, buildQualityGatesJson());

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.phase, "draft");
    assert.equal(result.nextAction, "open_user_review");
    assert.match(result.nextPrompt ?? "", USER_REVIEW_OPEN_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects draft contract without Baseline heading", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-wrong-heading-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson(),
      "# Quality Gates Contract\n\n## Overview\n\nGate contract.\n"
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_current_artifact");
    assert.ok(result.diagnostics.includes("markdown_wrong_stage"));
    assert.match(result.nextPrompt ?? "", DRAFT_REJECTED_RE);
    assert.match(result.nextPrompt ?? "", QUALITY_GATES_BASELINE_HEADING_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects malformed draft commands", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-bad-draft-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({ commands: [] })
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_current_artifact");
    assert.ok(result.diagnostics.includes("commands_array"));
    assert.match(result.nextPrompt ?? "", DRAFT_REJECTED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator accepts integrated contract with scripts and hooks", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-integrated-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({
        accepted: true,
        commands: buildExecutableCommands(),
        integrated: true,
        integratedPaths: [
          "package.json",
          ".husky/pre-commit",
          "scripts/quality-gates/max-file-lines.mjs",
          "scripts/quality-gates/secret-scan.mjs",
        ],
        integrationState: "integrated",
        requiredBeforeCommit: REQUIRED_INTEGRATED_GATE_IDS,
      })
    );
    await writeIntegratedSupportFiles(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, true);
    assert.equal(result.phase, "integration");
    assert.equal(result.nextAction, "open_persistent_return");
    assert.match(result.nextPrompt ?? "", INTEGRATION_ACCEPTED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects integration without required 500-line gate", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-missing-size-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({
        accepted: true,
        commands: {
          "qg-secret-scan": buildExecutableCommands()["qg-secret-scan"],
        },
        integrated: true,
        integratedPaths: [
          "package.json",
          ".husky/pre-commit",
          "scripts/quality-gates/secret-scan.mjs",
        ],
        integrationState: "integrated",
      })
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "package.json",
      `${JSON.stringify(
        {
          scripts: {
            "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
          },
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nset -e\nnpm run qg:secret-scan\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      "scripts/quality-gates/secret-scan.mjs",
      "console.log('ok');\n"
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(result.diagnostics.includes("missing_required_size_policy_gate"));
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects integrated JSON that keeps a required gate not_integrated", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-not-integrated-json-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({
        accepted: true,
        integrated: true,
        integratedPaths: [
          "package.json",
          ".husky/pre-commit",
          "scripts/quality-gates/max-file-lines.mjs",
          "scripts/quality-gates/secret-scan.mjs",
        ],
        integrationState: "integrated",
        requiredBeforeCommit: REQUIRED_INTEGRATED_GATE_IDS,
      })
    );
    await writeIntegratedSupportFiles(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(
      result.diagnostics.includes(
        'quality-gates.json keeps required gate "qg-secret-scan" as not_integrated after integration'
      )
    );
    assert.match(result.nextPrompt ?? "", INTEGRATION_REJECTED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects integrated Markdown that says a required gate is not_integrated", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-not-integrated-markdown-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({
        accepted: true,
        commands: buildExecutableCommands(),
        integrated: true,
        integratedPaths: [
          "package.json",
          ".husky/pre-commit",
          "scripts/quality-gates/max-file-lines.mjs",
          "scripts/quality-gates/secret-scan.mjs",
        ],
        integrationState: "integrated",
        requiredBeforeCommit: REQUIRED_INTEGRATED_GATE_IDS,
      }),
      [
        "# Quality Gates Baseline",
        "",
        "| id | availability |",
        "|---|---|",
        "| `qg-secret-scan` | `not_integrated` |",
      ].join("\n")
    );
    await writeIntegratedSupportFiles(workspaceRoot);

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(
      result.diagnostics.includes(
        'quality-gates.md keeps required gate "qg-secret-scan" as not_integrated after integration'
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates validator rejects integrated contract without package script and hook wiring", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-missing-hooks-")
  );
  try {
    await writeQualityGatesArtifacts(
      workspaceRoot,
      buildQualityGatesJson({
        accepted: true,
        integrated: true,
        integrationState: "integrated",
      })
    );

    const result = await validateQualityGatesManagedArtifacts({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.valid, false);
    assert.equal(result.nextAction, "repair_integration");
    assert.ok(result.diagnostics.includes("missing_package_json"));
    assert.ok(
      result.diagnostics.includes(
        "missing_hook_gate:qg-secret-scan in .husky/pre-commit"
      )
    );
    assert.match(result.nextPrompt ?? "", INTEGRATION_REJECTED_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates prompt builders expose integration, revision, and boundary messages", () => {
  assert.match(
    buildQualityGatesIntegrationPrompt({ workspaceSlug: WORKSPACE_SLUG }),
    INTEGRATION_OPEN_RE
  );
  assert.match(
    buildQualityGatesReviewRevisionPrompt({
      userFeedback: "Добавь smoke gate.",
      workspaceSlug: WORKSPACE_SLUG,
    }),
    REVIEW_CORRECTIONS_RE
  );
  assert.match(
    buildQualityGatesBoundaryBlockedMessage(
      "stage plan does not point to an active commit-backed microtask"
    ),
    PLAN_STATE_PROBLEM_RE
  );
});

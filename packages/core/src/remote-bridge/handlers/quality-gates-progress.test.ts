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

const writeWorkspaceAcceptanceLedger = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/workspace.plan.md",
    `# Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
${JSON.stringify(
  {
    acceptedCommits: [
      {
        hash: "abc1234",
        message: "docs: accept quality gates contract",
        stage: "quality_gates",
      },
    ],
    schema: "codeai-workspace-plan-v1",
  },
  null,
  2
)}
\`\`\`
<!-- codeai-workspace-plan-state:end -->
`
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

test("Quality Gates progress rejects aggregate-only lifecycle hook runners", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-progress-aggregate-")
  );
  try {
    await writeQualityGateArtifacts(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      "package.json",
      `${JSON.stringify(
        {
          scripts: {
            "qg:before-commit":
              "node ./scripts/quality-gates/run.mjs requiredBeforeCommit",
            "qg:before-push":
              "node ./scripts/quality-gates/run.mjs requiredBeforePush",
          },
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-commit",
      "#!/bin/sh\nnpm run qg:before-commit\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".husky/pre-push",
      "#!/bin/sh\nnpm run qg:before-push\n"
    );

    const snapshot = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(snapshot?.integrated, false);
    assert.equal(snapshot?.substep, "failed");
    assert.deepEqual(snapshot?.validationErrors, [
      "Quality gate qg-secret-scan is missing from .husky/pre-commit",
      "Quality gate qg-smoke-checks is missing from .husky/pre-push",
    ]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Quality Gates progress derives acceptanceCommitted from workspace accepted commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-progress-ledger-")
  );
  try {
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
          acceptanceCommitted: false,
          commands: {
            "qg-format": {
              availability: "executable",
              desiredStatus: "active",
              id: "qg-format",
            },
          },
          integrated: false,
          integrationState: "draft",
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceAcceptanceLedger(workspaceRoot);

    const snapshot = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(snapshot?.accepted, true);
    assert.equal(snapshot?.acceptanceCommitted, true);
    assert.equal(snapshot?.integrated, false);
    assert.equal(snapshot?.substep, "accepted");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Quality Gates progress reports awaiting_acceptance until accepted flag flips", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-progress-acceptance-")
  );
  try {
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
          accepted: false,
          commands: {
            "qg-secret-scan": {
              availability: "executable",
              desiredStatus: "active",
              id: "qg-secret-scan",
            },
          },
          integrated: false,
          requiredBeforeCommit: ["qg-secret-scan"],
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );

    const draft = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(draft?.accepted, false);
    assert.equal(draft?.acceptanceCommitted, false);
    assert.equal(draft?.integrated, false);
    assert.equal(draft?.substep, "awaiting_acceptance");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Quality Gates progress tracks acceptanceCommitted flag distinctly from accepted", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "quality-gates-progress-accepted-committed-")
  );
  try {
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
          acceptanceCommitted: false,
          commands: {
            "qg-format": {
              availability: "executable",
              desiredStatus: "active",
              id: "qg-format",
            },
          },
          integrated: false,
          integrationState: "draft",
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );

    const acceptedDraft = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });
    assert.equal(acceptedDraft?.accepted, true);
    assert.equal(acceptedDraft?.acceptanceCommitted, false);
    assert.equal(acceptedDraft?.substep, "accepted");

    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo/quality_gates/quality-gates.json",
      `${JSON.stringify(
        {
          accepted: true,
          acceptanceCommitted: true,
          commands: {
            "qg-format": {
              availability: "executable",
              desiredStatus: "active",
              id: "qg-format",
            },
          },
          integrated: false,
          integrationState: "draft",
          schema: "codeai-quality-gates-v1",
        },
        null,
        2
      )}\n`
    );

    const acceptedCommitted = await readQualityGatesProgressSnapshot({
      workspaceRoot,
      workspaceSlug: "demo",
    });
    assert.equal(acceptedCommitted?.acceptanceCommitted, true);
    assert.equal(acceptedCommitted?.accepted, true);
    assert.equal(acceptedCommitted?.integrated, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

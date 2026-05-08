import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const execFileAsync = promisify(execFile);
const DIAGRAM_MODULES_MISSING_PART_RE =
  /next missing or invalid Product Part is "local-runtime"/u;
const CORE_CHECKED_HEADING_RE = /What Core checked:/u;
const DIAGRAM_MODULES_OBSERVED_RE =
  /Observed valid Product Part artifacts: 0\/1\./u;
const APPLICATION_SKELETON_OBSERVED_RE =
  /Observed accepted: true; materialized: false; materializationState: failed; substep: failed\./u;
const QUALITY_GATES_OBSERVED_RE =
  /Observed accepted: true; integrated: false; integrationState: integrated; substep: failed\./u;
const OUT_OF_OWNER_DIRTY_RE =
  /dirty files are outside the active stage allowlist: scratch\/unmanaged\.txt/u;
const PLAN_COMMIT_COMMAND_RE =
  /npm run plan:commit|current managed plan command/u;

const waitForImmediate = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

const createChains = (
  stage: ContinuityChainSummary["stage"],
  sessionId: string
): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: `codex-${stage}`,
    segments: [
      {
        createdAt: "2026-05-08T05:51:54.053Z",
        providerId: "codexCli",
        providerSessionId: `provider-${sessionId}`,
        sessionId,
      },
    ],
    stage,
    updatedAt: "2026-05-08T05:51:54.053Z",
    workspaceSlug: "demo-workspace",
  },
];

const commitWorkspaceChange = async (
  workspaceRoot: string,
  relativePath: string,
  content: string,
  message: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
  await execFileAsync("git", ["add", relativePath], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", message], {
    cwd: workspaceRoot,
  });
};

const initWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await commitWorkspaceChange(
    workspaceRoot,
    "README.md",
    "# Demo\n",
    "test: initial"
  );
};

test("managed feedback repeats after a repair commit leaves Diagram Modules validation failing", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    const feedback = new WorkflowAgentAcceptanceFeedback(new Logger("error"));
    const send = () =>
      feedback.sendDiagramModulesFeedback({
        chains: createChains("diagram_modules", "diagram-session"),
        gateway: {
          handleMessage: (sessionId, content) => {
            messages.push(`${sessionId}\n${content}`);
            return Promise.resolve();
          },
        },
        progress: {
          aggregateReady: false,
          currentPartId: "local-runtime",
          generatedCount: 0,
          generatedPartIds: [],
          plannedCount: 1,
          plannedPartIds: ["local-runtime"],
          substep: "generate_product_part",
        },
        workspaceRoot,
        workspaceSlug: "demo-workspace",
      });

    await send();
    await send();
    assert.equal(messages.length, 1);

    await commitWorkspaceChange(
      workspaceRoot,
      "repair-attempt.txt",
      "agent attempted repair\n",
      "test: repair attempt"
    );

    await send();
    await send();
    assert.equal(messages.length, 2);
    assert.match(messages[1] ?? "", DIAGRAM_MODULES_MISSING_PART_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed feedback includes diagnostic check context for every managed stage", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-diagnostics-")
  );
  const messages: string[] = [];
  const gateway = {
    handleMessage: (sessionId: string, content: string) => {
      messages.push(`${sessionId}\n${content}`);
      return Promise.resolve();
    },
  };

  try {
    await initWorkspace(workspaceRoot);
    const feedback = new WorkflowAgentAcceptanceFeedback(new Logger("error"));
    await feedback.sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway,
      progress: {
        aggregateReady: false,
        currentPartId: "local-runtime",
        generatedCount: 0,
        generatedPartIds: [],
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        substep: "generate_product_part",
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    await feedback.sendApplicationSkeletonFeedback({
      chains: createChains("application_skeleton", "skeleton-session"),
      gateway,
      progress: {
        accepted: true,
        mapExists: true,
        mappingReady: true,
        markdownExists: true,
        materializationState: "failed",
        materialized: false,
        observedMaterialization: true,
        substep: "failed",
        validationErrors: [
          "application-skeleton.md status reviewState must be materialized",
        ],
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    await feedback.sendQualityGatesFeedback({
      chains: createChains("quality_gates", "quality-session"),
      gateway,
      progress: {
        accepted: true,
        commandContractReady: true,
        integrated: false,
        integrationState: "integrated",
        jsonExists: true,
        markdownExists: true,
        substep: "failed",
        validationErrors: [
          "Quality gate qg-secret-scan is missing from .husky/pre-commit",
        ],
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    const feedbackText = messages.join("\n---\n");
    assert.equal(messages.length, 3);
    assert.match(feedbackText, CORE_CHECKED_HEADING_RE);
    assert.match(feedbackText, DIAGRAM_MODULES_OBSERVED_RE);
    assert.match(feedbackText, APPLICATION_SKELETON_OBSERVED_RE);
    assert.match(feedbackText, QUALITY_GATES_OBSERVED_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed feedback reports out-of-owner dirty files without provider shell commands", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-out-of-owner-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway: {
        handleMessage: (sessionId, content) => {
          messages.push(`${sessionId}\n${content}`);
          return Promise.resolve();
        },
      },
      progress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["local-runtime"],
        managedGitOutOfOwnerDirtyFiles: ["scratch/unmanaged.txt"],
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        substep: "awaiting_review",
      } as never,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(messages.length, 1);
    assert.match(messages[0] ?? "", OUT_OF_OWNER_DIRTY_RE);
    assert.doesNotMatch(messages[0] ?? "", PLAN_COMMIT_COMMAND_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed feedback suppresses concurrent duplicate sends for every managed stage", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-concurrent-")
  );
  const messages: string[] = [];
  const gateway = {
    handleMessage: async (sessionId: string, content: string) => {
      await waitForImmediate();
      messages.push(`${sessionId}\n${content}`);
    },
  };

  try {
    await initWorkspace(workspaceRoot);
    const feedback = new WorkflowAgentAcceptanceFeedback(new Logger("error"));
    const commonParams = {
      gateway,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    };

    await Promise.all([
      feedback.sendDiagramModulesFeedback({
        ...commonParams,
        chains: createChains("diagram_modules", "diagram-session"),
        progress: {
          aggregateReady: false,
          currentPartId: "local-runtime",
          generatedCount: 0,
          generatedPartIds: [],
          plannedCount: 1,
          plannedPartIds: ["local-runtime"],
          substep: "generate_product_part",
        },
      }),
      feedback.sendDiagramModulesFeedback({
        ...commonParams,
        chains: createChains("diagram_modules", "diagram-session"),
        progress: {
          aggregateReady: false,
          currentPartId: "local-runtime",
          generatedCount: 0,
          generatedPartIds: [],
          plannedCount: 1,
          plannedPartIds: ["local-runtime"],
          substep: "generate_product_part",
        },
      }),
      feedback.sendApplicationSkeletonFeedback({
        ...commonParams,
        chains: createChains("application_skeleton", "skeleton-session"),
        progress: {
          accepted: true,
          mapExists: true,
          mappingReady: true,
          markdownExists: true,
          materializationState: "failed",
          materialized: false,
          observedMaterialization: true,
          substep: "failed",
          validationErrors: [
            "application-skeleton.md status reviewState must be materialized",
          ],
        },
      }),
      feedback.sendApplicationSkeletonFeedback({
        ...commonParams,
        chains: createChains("application_skeleton", "skeleton-session"),
        progress: {
          accepted: true,
          mapExists: true,
          mappingReady: true,
          markdownExists: true,
          materializationState: "failed",
          materialized: false,
          observedMaterialization: true,
          substep: "failed",
          validationErrors: [
            "application-skeleton.md status reviewState must be materialized",
          ],
        },
      }),
      feedback.sendQualityGatesFeedback({
        ...commonParams,
        chains: createChains("quality_gates", "quality-session"),
        progress: {
          accepted: true,
          commandContractReady: true,
          integrated: false,
          integrationState: "integrated",
          jsonExists: true,
          markdownExists: true,
          substep: "failed",
          validationErrors: [
            "Quality gate qg-secret-scan is missing from .husky/pre-commit",
          ],
        },
      }),
      feedback.sendQualityGatesFeedback({
        ...commonParams,
        chains: createChains("quality_gates", "quality-session"),
        progress: {
          accepted: true,
          commandContractReady: true,
          integrated: false,
          integrationState: "integrated",
          jsonExists: true,
          markdownExists: true,
          substep: "failed",
          validationErrors: [
            "Quality gate qg-secret-scan is missing from .husky/pre-commit",
          ],
        },
      }),
    ]);

    assert.equal(messages.length, 3);
    assert.equal(
      messages.filter((message) => message.startsWith("diagram-session\n"))
        .length,
      1
    );
    assert.equal(
      messages.filter((message) => message.startsWith("skeleton-session\n"))
        .length,
      1
    );
    assert.equal(
      messages.filter((message) => message.startsWith("quality-session\n"))
        .length,
      1
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import { sendDiagramModulesContinuationIfReady } from "./diagram-modules-continuation-dispatcher";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const execFileAsync = promisify(execFile);
const CORE_OWNED_DIRTY_GATE_RE = /Core-owned managed commit is pending/u;
const COMMIT_OR_CLEAN_RE = /Commit or clean/u;
const PLAN_COMMIT_COMMAND_RE =
  /npm run plan:commit|current managed plan command/u;
const DIAGRAM_MODULES_REPAIR_RE =
  /Core rejected the current Diagram Modules artifact/u;
const TARGET_ARTIFACT_REPAIR_RE = /Target artifact to repair:/u;
const SNAPSHOT_HEAD_RE = /snapshotHead: [a-f0-9]{40}/u;
const CHECKED_AT_RE = /checkedAt:/u;
const PRODUCT_PART_VALIDATOR_RE = /validator: diagram_modules\.product_part/u;
const MISSING_PART_ID_RE = /Missing Part ID `local-runtime`\./u;
const DO_NOT_UPDATE_NEXT_PART_RE =
  /Do not create or update the next Product Part\./u;
const CONTINUATION_SESSION_RE = /diagram-continuation-session/u;
const CONTINUATION_ACCEPTED_RE =
  /Core accepted the previous Diagram Modules artifact\./u;
const MATERIALIZE_LOCAL_RUNTIME_RE =
  /Materialize only Product Part "local-runtime"\./u;
const ACCEPTED_PROJECT_MANAGER_RE =
  /Already accepted Product Parts: project-manager\./u;
const LOCAL_RUNTIME_ARTIFACT_RE =
  /\.codeai-hub\/demo\/diagram_modules\/product-parts\/local-runtime\.md/u;

const stringifyFeedbackPayload = (payload: unknown): string =>
  typeof payload === "string"
    ? payload
    : ((payload as { readonly content?: string }).content ?? "");

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

const initWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await mkdir(workspaceRoot, { recursive: true });
  await writeFile(path.join(workspaceRoot, "README.md"), "# Demo\n", "utf8");
  await execFileAsync("git", ["add", "README.md"], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: initial"], {
    cwd: workspaceRoot,
  });
};

test("Diagram Modules feedback separates Core-owned dirty gate from artifact edits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-core-owned-dirty-")
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
          messages.push(`${sessionId}\n${stringifyFeedbackPayload(content)}`);
          return Promise.resolve();
        },
      },
      progress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["local-runtime"],
        managedGitDirtyFiles: [
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        ],
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        substep: "awaiting_review",
      } as never,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(messages.length, 1);
    assert.match(messages[0] ?? "", CORE_OWNED_DIRTY_GATE_RE);
    assert.doesNotMatch(messages[0] ?? "", COMMIT_OR_CLEAN_RE);
    assert.doesNotMatch(messages[0] ?? "", PLAN_COMMIT_COMMAND_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed feedback marks the feedback turn running before dispatch", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-running-")
  );
  const events: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway: {
        handleMessage: (sessionId) => {
          events.push(`message:${sessionId}`);
          return Promise.resolve();
        },
        markFeedbackTurnStarted: (sessionId) => {
          events.push(`running:${sessionId}`);
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

    assert.deepEqual(events, [
      "running:diagram-session",
      "message:diagram-session",
    ]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules pending Product Part waits for continuation instead of aggregate feedback", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-pending-part-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway: {
        handleMessage: (_sessionId, content) => {
          messages.push(stringifyFeedbackPayload(content));
          return Promise.resolve();
        },
      },
      progress: {
        acceptedPartIds: [],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 0,
        generatedPartIds: [],
        lastValidation: {
          diagnostics: ["Product Part artifact file is missing."],
          expectedArtifactPath:
            ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
          valid: false,
          validator: "diagram_modules.product_part",
        },
        managedGitDirtyFiles: [
          ".codeai-hub/demo/diagram_modules/product-parts.index.md",
        ],
        nextPartId: "local-runtime",
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        productPartDiagnostics: [
          {
            error: "Product Part artifact file is missing.",
            partId: "local-runtime",
            path: ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
            valid: false,
          },
        ],
        substep: "generate_product_part",
      } as never,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(messages, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules continuation dispatches the current Product Part scope from Core", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-continuation-core-")
  );
  const events: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await sendDiagramModulesContinuationIfReady({
      chains: createChains("diagram_modules", "diagram-continuation-session"),
      gateway: {
        handleMessage: (sessionId, content) => {
          events.push(`${sessionId}\n${stringifyFeedbackPayload(content)}`);
          return Promise.resolve();
        },
        markFeedbackTurnStarted: (sessionId) => {
          events.push(`running:${sessionId}`);
        },
      },
      progress: {
        acceptedPartIds: ["project-manager"],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 2,
        plannedPartIds: ["project-manager", "local-runtime"],
        substep: "generate_product_part",
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace-continuation",
    });

    assert.equal(events.length, 2);
    assert.equal(events[0], "running:diagram-continuation-session");
    const message = events[1] ?? "";
    assert.match(message, CONTINUATION_SESSION_RE);
    assert.match(message, CONTINUATION_ACCEPTED_RE);
    assert.match(message, MATERIALIZE_LOCAL_RUNTIME_RE);
    assert.match(message, ACCEPTED_PROJECT_MANAGER_RE);
    assert.match(message, LOCAL_RUNTIME_ARTIFACT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules continuation waits for a settled provider turn boundary", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-continuation-boundary-")
  );
  const events: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await sendDiagramModulesContinuationIfReady({
      chains: createChains("diagram_modules", "diagram-boundary-session"),
      gateway: {
        handleMessage: (sessionId: string, content: unknown) => {
          events.push(`${sessionId}\n${stringifyFeedbackPayload(content)}`);
          return Promise.resolve();
        },
        markFeedbackTurnStarted: (sessionId: string) => {
          events.push(`running:${sessionId}`);
        },
        waitForManagedContinuationTurnBoundary: (sessionId: string) => {
          events.push(`boundary:${sessionId}`);
          return Promise.resolve(true);
        },
      } as never,
      progress: {
        acceptedPartIds: ["project-manager"],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 2,
        plannedPartIds: ["project-manager", "local-runtime"],
        substep: "generate_product_part",
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace-boundary-continuation",
    });

    assert.equal(events.length, 3);
    assert.equal(events[0], "boundary:diagram-boundary-session");
    assert.equal(events[1], "running:diagram-boundary-session");
    assert.match(events[2] ?? "", CONTINUATION_ACCEPTED_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules continuation does not dispatch before the provider turn boundary settles", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-continuation-unsettled-")
  );
  const events: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await sendDiagramModulesContinuationIfReady({
      chains: createChains("diagram_modules", "diagram-unsettled-session"),
      gateway: {
        handleMessage: (sessionId: string) => {
          events.push(`message:${sessionId}`);
          return Promise.resolve();
        },
        markFeedbackTurnStarted: (sessionId: string) => {
          events.push(`running:${sessionId}`);
        },
        waitForManagedContinuationTurnBoundary: (sessionId: string) => {
          events.push(`boundary:${sessionId}`);
          return Promise.resolve(false);
        },
      } as never,
      progress: {
        acceptedPartIds: ["project-manager"],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 2,
        plannedPartIds: ["project-manager", "local-runtime"],
        substep: "generate_product_part",
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace-unsettled-continuation",
    });

    assert.deepEqual(events, ["boundary:diagram-unsettled-session"]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules continuation waits when Core commit gate is dirty", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-modules-continuation-dirty-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await sendDiagramModulesContinuationIfReady({
      chains: createChains("diagram_modules", "diagram-dirty-session"),
      gateway: {
        handleMessage: (_sessionId, content) => {
          messages.push(stringifyFeedbackPayload(content));
          return Promise.resolve();
        },
      },
      progress: {
        acceptedPartIds: ["project-manager"],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        managedGitDirtyFiles: [
          ".codeai-hub/demo/diagram_modules/product-parts.index.md",
        ],
        plannedCount: 2,
        plannedPartIds: ["project-manager", "local-runtime"],
        substep: "generate_product_part",
      } as never,
      workspaceRoot,
      workspaceSlug: "demo-workspace-dirty-continuation",
    });

    assert.deepEqual(messages, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Diagram Modules repair feedback targets current artifact with snapshot metadata", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-agent-feedback-repair-part-")
  );
  const messages: string[] = [];

  try {
    await initWorkspace(workspaceRoot);
    await new WorkflowAgentAcceptanceFeedback(
      new Logger("error")
    ).sendDiagramModulesFeedback({
      chains: createChains("diagram_modules", "diagram-session"),
      gateway: {
        handleMessage: (_sessionId, content) => {
          messages.push(stringifyFeedbackPayload(content));
          return Promise.resolve();
        },
      },
      progress: {
        acceptedPartIds: [],
        activeSubturn: {
          kind: "product_part",
          partId: "local-runtime",
          status: "repair_pending",
        },
        aggregateReady: false,
        currentPartId: "local-runtime",
        expectedArtifactPath:
          ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
        generatedCount: 0,
        generatedPartIds: [],
        lastValidation: {
          diagnostics: ["Missing Part ID `local-runtime`."],
          expectedArtifactPath:
            ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
          valid: false,
          validator: "diagram_modules.product_part",
        },
        nextPartId: "local-runtime",
        plannedCount: 1,
        plannedPartIds: ["local-runtime"],
        productPartDiagnostics: [
          {
            error: "Missing Part ID `local-runtime`.",
            partId: "local-runtime",
            path: ".codeai-hub/demo/diagram_modules/product-parts/local-runtime.md",
            valid: false,
          },
        ],
        substep: "generate_product_part",
      },
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(messages.length, 1);
    const message = messages[0] ?? "";
    assert.match(message, DIAGRAM_MODULES_REPAIR_RE);
    assert.match(message, TARGET_ARTIFACT_REPAIR_RE);
    assert.match(message, SNAPSHOT_HEAD_RE);
    assert.match(message, CHECKED_AT_RE);
    assert.match(message, PRODUCT_PART_VALIDATOR_RE);
    assert.match(message, MISSING_PART_ID_RE);
    assert.match(message, DO_NOT_UPDATE_NEXT_PART_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const WORKSPACE_SLUG = "demo-workspace";
const QUALITY_STAGE = "quality_gates";
const QUALITY_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`;
const PHASE_3_REPAIR_RE =
  /Core opens Phase 3 Quality Gates Integration Repair/u;
const PHASE_4_RE = /Core opens Phase 4 Formal Quality Gates Verification/u;
const USER_RETURN_RE = /Core: Quality Gates завершён и зафиксирован/u;

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writeStageTask = async (
  workspaceRoot: string,
  taskId: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/stages/quality-gates/todo-plan.md",
    [
      "<!-- codeai-plan-state:start -->",
      "```json",
      JSON.stringify({ currentTaskId: taskId }),
      "```",
      "<!-- codeai-plan-state:end -->",
    ].join("\n")
  );
};

const baseContract = (): Record<string, unknown> => ({
  accepted: true,
  advisory: [],
  commands: {
    "qg-max-file-lines": {
      availability: "executable",
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

const writeQualityGatesWorkspace = async (
  workspaceRoot: string,
  contract: Record<string, unknown>
): Promise<void> => {
  const basePath = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates`;
  await writeWorkspaceFile(
    workspaceRoot,
    `${basePath}/quality-gates-research.md`,
    "# Quality Gates Research\n\nRegression fixture.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `${basePath}/quality-gates-research.json`,
    JSON.stringify({
      recommendations: [],
      schema: "codeai-quality-gates-research-v1",
      sources: [],
      stackSummary: "npm workspace",
    })
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `${basePath}/quality-gates.md`,
    "# Quality Gates Baseline\n\n## Overview\n\nIntegrated baseline.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_JSON_PATH,
    `${JSON.stringify(contract, null, 2)}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    JSON.stringify({
      scripts: {
        "qg:max-file-lines": "node scripts/quality-gates/max-file-lines.mjs",
        "qg:secret-scan": "node scripts/quality-gates/secret-scan.mjs",
      },
    })
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

const verifiedContract = (): Record<string, unknown> => ({
  ...baseContract(),
  verificationEvidence: {
    checkedAt: "2026-06-06T00:00:00.000Z",
    commands: [
      { command: "sh .husky/pre-commit", status: "passed" },
      { command: "npm run qg:max-file-lines", status: "passed" },
      { command: "npm run qg:secret-scan", status: "passed" },
    ],
  },
  verificationState: "verified",
});

const createStagePlan = (): QualityGatesStagePlanController =>
  ({
    commitManagedTurn: async (params: {
      readonly decision: QualityGatesManagedValidationResult;
    }) => ({
      blocked: null,
      commit: {
        expectedCommitMessage: "test",
        hash: "abc1234",
        nextTaskId:
          params.decision.phase === "integration"
            ? "quality-gates.phase4.verify.task1"
            : "quality-gates.phase5.return.task1",
      },
    }),
    commitRejectedTurn: async () => ({
      blocked: null,
      commit: {
        expectedCommitMessage: "test",
        hash: "def5678",
        nextTaskId: "quality-gates.phase3.repair.task1",
      },
    }),
    commitTerminalHandoffResidue: async () => undefined,
  }) as unknown as QualityGatesStagePlanController;

test("Quality Gates verification repair reopens Phase 4 before user return", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-repair-chain-"));
  try {
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: QUALITY_STAGE }
    );
    const coreMessages: string[] = [];
    const internalMessages: string[] = [];
    const waitEvents: string[] = [];
    const handler = new SessionRequestHandlerManagedWorkflowTurn({
      eventMessages: {
        appendCoreMessage: (_sessionId, message) => {
          coreMessages.push(message.content);
        },
        waitForMessagePersistence: (sessionId) => {
          waitEvents.push(sessionId);
          return Promise.resolve();
        },
      },
      getMessageDispatch: () =>
        ({
          sendInternalMessage: (_sessionId: string, content: string) => {
            internalMessages.push(content);
            return Promise.resolve();
          },
        }) as never,
      qualityGatesStagePlan: createStagePlan(),
      sessionManager,
    });

    await writeQualityGatesWorkspace(workspaceRoot, baseContract());
    await writeStageTask(workspaceRoot, "quality-gates.phase4.verify.task1");
    await handler.handleTurnCompleted(session.id);
    assert.match(internalMessages.at(-1) ?? "", PHASE_3_REPAIR_RE);

    await writeQualityGatesWorkspace(workspaceRoot, verifiedContract());
    await writeStageTask(workspaceRoot, "quality-gates.phase3.repair.task1");
    await handler.handleTurnCompleted(session.id);
    assert.match(internalMessages.at(-1) ?? "", PHASE_4_RE);

    await writeStageTask(workspaceRoot, "quality-gates.phase4.verify.task1");
    await handler.handleTurnCompleted(session.id);
    assert.match(coreMessages.at(-1) ?? "", USER_RETURN_RE);
    assert.deepEqual(waitEvents, [session.id]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

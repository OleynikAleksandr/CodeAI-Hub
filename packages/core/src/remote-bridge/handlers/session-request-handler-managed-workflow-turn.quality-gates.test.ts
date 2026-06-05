import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const QUALITY_STAGE = "quality_gates";
const QUALITY_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`;
const QUALITY_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`;
const QUALITY_REVIEW_RE =
  /Core: Quality Gates перешёл в пользовательскую проверку/u;
const QUALITY_RETURN_RE = /Core: Quality Gates завершён и зафиксирован/u;
const QUALITY_VERIFY_RE =
  /Core opens Phase 4 Formal Quality Gates Verification/u;
const RETURN_RE = /Можно переходить к следующему шагу/u;
const PRODUCT_PART_BOOTSTRAP_COMMIT_RE =
  /docs: bootstrap product part development briefs/u;
const PRODUCT_PART_BRIEF_DRAFT_RE = /ProductPartDevelopmentBrief\.draft\.md/u;
const PRODUCT_PART_BRIEF_TITLE_RE = /ProductPartDevelopmentBrief/u;
const PRODUCT_PART_LOCAL_RUNTIME_RE = /local-runtime/u;
const USER_REVIEW_RE =
  /Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки/u;

interface CapturedCoreMessage {
  readonly content: string;
  readonly tag: string;
}

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const qualityDraftDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: null,
  diagnostics: [],
  nextAction: "open_user_review",
  nextPrompt: null,
  phase: "draft",
  valid: true,
});

const integratedCommands = (): Record<string, unknown> => ({
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

const qualityIntegratedDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: {
    accepted: true,
    advisory: [],
    commands: integratedCommands(),
    deferred: [],
    integrated: true,
    integratedPaths: [
      "package.json",
      ".husky/pre-commit",
      "scripts/quality-gates/max-file-lines.mjs",
      "scripts/quality-gates/secret-scan.mjs",
    ],
    integrationState: "integrated",
    requiredBeforeCommit: ["qg-secret-scan", "qg-max-file-lines"],
    requiredBeforeModuleExecution: [],
    requiredBeforePush: [],
    requiredBeforeRelease: [],
    schema: "codeai-quality-gates-v1",
  },
  diagnostics: [],
  nextAction: "open_persistent_return",
  nextPrompt: null,
  phase: "integration",
  valid: true,
});

const qualityVerifiedDecision = (): QualityGatesManagedValidationResult => {
  const integrated = qualityIntegratedDecision();
  return {
    ...integrated,
    contractJson: {
      ...integrated.contractJson,
      verificationEvidence: {
        checkedAt: "2026-06-05T00:00:00.000Z",
        commands: [
          { command: "sh .husky/pre-commit", status: "passed" },
          { command: "npm run qg:secret-scan", status: "passed" },
          { command: "npm run qg:max-file-lines", status: "passed" },
        ],
      },
      verificationState: "verified",
    },
    phase: "verification",
  };
};

const createHandler = (params: {
  readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
  readonly persistCoreMessages?: boolean;
  readonly workspaceRoot: string;
}): {
  readonly coreMessages: CapturedCoreMessage[];
  readonly handler: SessionRequestHandlerManagedWorkflowTurn;
  readonly internalMessages: string[];
  readonly sessionId: string;
  readonly waitEvents: string[];
} => {
  const coreMessages: CapturedCoreMessage[] = [];
  const internalMessages: string[] = [];
  const waitEvents: string[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    params.workspaceRoot,
    "provider-session-1",
    { initiativeSlug: WORKSPACE_SLUG, stage: QUALITY_STAGE }
  );
  const handler = new SessionRequestHandlerManagedWorkflowTurn({
    developmentTreeAgentGateway: params.developmentTreeAgentGateway,
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedCoreMessage) => {
        coreMessages.push(message);
        if (!params.persistCoreMessages) {
          return;
        }
        const unifiedSessionPath = path.join(
          params.workspaceRoot,
          ".codeai-hub",
          WORKSPACE_SLUG,
          "runtime",
          "sessions",
          "unified",
          `${session.id}.jsonl`
        );
        mkdirSync(path.dirname(unifiedSessionPath), { recursive: true });
        appendFileSync(
          unifiedSessionPath,
          `${JSON.stringify({ role: "system", ...message })}\n`,
          "utf8"
        );
      },
      waitForMessagePersistence: (waitSessionId: string) => {
        waitEvents.push(waitSessionId);
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
    sessionManager,
  });
  return {
    coreMessages,
    handler,
    internalMessages,
    sessionId: session.id,
    waitEvents,
  };
};

const writeDiagramModulesAcceptedArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts Index",
      "",
      "- leadProductPartId: `local-runtime`",
      "- productPartLeadershipOrder: `local-runtime`",
      "",
      "### Product Part: local-runtime",
      "- Title: Local Runtime",
      "- Purpose: Runtime shell.",
      "",
    ].join("\n")
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/local-runtime.md`,
    [
      "# Product Part: local-runtime",
      "",
      "## Identity",
      "",
      "| Field | Value |",
      "| ----- | ----- |",
      "| Part ID | `local-runtime` |",
      "",
      "## Owned Clusters",
      "",
      "## Standalone Modules",
      "",
      "| `module-id` | Responsibility |",
      "| --- | --- |",
      "| `provider-bridge` | Coordinates providers. |",
      "",
    ].join("\n")
  );
  await execFileAsync("git", ["add", `.codeai-hub/${WORKSPACE_SLUG}`], {
    cwd: workspaceRoot,
  });
  await execFileAsync(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-m",
      "test: accept diagram modules",
    ],
    { cwd: workspaceRoot }
  ).catch(() => undefined);
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

const prepareQualityDraft = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
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
  await new QualityGatesStagePlanController().openDraftPhase({ workspaceRoot });
};

const settleSetupResidue = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync(
    "git",
    [
      "add",
      "doc/TODO/stages/application-skeleton",
      "doc/TODO/stages/diagram-modules",
      "scripts/plan-orchestrator",
    ],
    { cwd: workspaceRoot }
  ).catch(() => undefined);
  await execFileAsync(
    "git",
    [
      "-c",
      "core.hooksPath=/dev/null",
      "commit",
      "-m",
      "test: settle managed setup residue",
    ],
    { cwd: workspaceRoot }
  ).catch(() => undefined);
};

const prepareQualityIntegration = async (
  workspaceRoot: string
): Promise<void> => {
  const controller = new QualityGatesStagePlanController();
  await prepareQualityDraft(workspaceRoot);
  await controller.commitManagedTurn({
    decision: qualityDraftDecision(),
    sessionId: "setup-session",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await controller.acceptUserReviewWithoutRevision({ workspaceRoot });
  await settleSetupResidue(workspaceRoot);
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_MARKDOWN_PATH,
    "# Quality Gates Baseline\n\n## Overview\n\nGate contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_JSON_PATH,
    `${JSON.stringify(qualityIntegratedDecision().contractJson, null, 2)}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    '{"scripts":{"qg:max-file-lines":"node scripts/quality-gates/max-file-lines.mjs","qg:secret-scan":"node scripts/quality-gates/secret-scan.mjs"}}\n'
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
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nset -e\nnpm run qg:secret-scan\nnpm run qg:max-file-lines\n"
  );
};

const prepareQualityVerification = async (
  workspaceRoot: string
): Promise<void> => {
  await prepareQualityIntegration(workspaceRoot);
  const controller = new QualityGatesStagePlanController();
  await controller.commitManagedTurn({
    decision: qualityIntegratedDecision(),
    sessionId: "setup-session",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_JSON_PATH,
    `${JSON.stringify(qualityVerifiedDecision().contractJson, null, 2)}\n`
  );
};

test("Quality Gates turn emits Core-owned user review handoff", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-review-"));
  try {
    await prepareQualityDraft(workspaceRoot);
    const { coreMessages, handler, sessionId, waitEvents } = createHandler({
      workspaceRoot,
    });

    await handler.handleTurnCompleted(sessionId);

    assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-user-review");
    assert.match(coreMessages.at(-1)?.content ?? "", QUALITY_REVIEW_RE);
    assert.match(coreMessages.at(-1)?.content ?? "", USER_REVIEW_RE);
    assert.deepEqual(waitEvents, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates integration opens formal verification continuation", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-clean-"));
  try {
    await prepareQualityIntegration(workspaceRoot);
    const { coreMessages, handler, internalMessages, sessionId, waitEvents } =
      createHandler({
        persistCoreMessages: true,
        workspaceRoot,
      });

    await handler.handleTurnCompleted(sessionId);

    assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-validation");
    assert.match(internalMessages.at(-1) ?? "", QUALITY_VERIFY_RE);
    assert.deepEqual(waitEvents, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("Quality Gates completion bootstraps Product Part brief workflow after terminal handoff", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "qg-devtree-"));
  try {
    await prepareQualityVerification(workspaceRoot);
    await writeDiagramModulesAcceptedArtifacts(workspaceRoot);
    const createdStages: string[] = [];
    const sentMessages: string[] = [];
    const { coreMessages, handler, sessionId, waitEvents } = createHandler({
      developmentTreeAgentGateway: {
        createSessionForWorkflow: (options) => {
          createdStages.push(options.context.stage);
          return Promise.resolve({ id: `devtree-${createdStages.length}` });
        },
        handleMessage: (_sessionId, content) => {
          sentMessages.push(content);
          return Promise.resolve();
        },
      },
      persistCoreMessages: true,
      workspaceRoot,
    });

    await handler.handleTurnCompleted(sessionId);

    assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-complete");
    assert.match(coreMessages.at(-1)?.content ?? "", QUALITY_RETURN_RE);
    assert.match(coreMessages.at(-1)?.content ?? "", RETURN_RE);
    assert.deepEqual(waitEvents, [sessionId]);
    const productPartPlan = path.join(
      workspaceRoot,
      "doc/TODO/stages/development-tree/product-parts/local-runtime/todo-plan.md"
    );
    const productPartBrief = path.join(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/local-runtime/ProductPartDevelopmentBrief.draft.md`
    );
    assert.match(
      await readFile(productPartPlan, "utf8"),
      PRODUCT_PART_LOCAL_RUNTIME_RE
    );
    assert.match(
      await readFile(productPartBrief, "utf8"),
      PRODUCT_PART_BRIEF_TITLE_RE
    );
    assert.deepEqual(createdStages, [
      "development_tree/materialized/product-parts/local-runtime",
    ]);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", PRODUCT_PART_BRIEF_DRAFT_RE);
    const { stdout: statusOutput } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      { cwd: workspaceRoot }
    );
    assert.equal(statusOutput.trim(), "");
    const { stdout: logOutput } = await execFileAsync(
      "git",
      ["log", "--oneline", "-5"],
      { cwd: workspaceRoot }
    );
    assert.match(logOutput, PRODUCT_PART_BOOTSTRAP_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import type { ApplicationSkeletonManagedValidationResult } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { QualityGatesStagePlanController } from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-controller";
import type { QualityGatesManagedValidationResult } from "../../managed-workflow-orchestration/quality-gates/quality-gates-validator";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const WORKSPACE_SLUG = "demo-workspace";
const APP_STAGE = "application_skeleton";
const DIAGRAM_STAGE = "diagram_modules";
const QUALITY_STAGE = "quality_gates";
const USER_REVIEW_RE =
  /Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки/u;
const CONFIRMATION_RE = /нажмите кнопку «Подтверждаю» ниже/u;
const TYPE_CONFIRMATION_RE = /напишите `подтверждаю`/u;
const RETURN_RE = /Можно переходить к следующему шагу/u;
const APP_REVIEW_RE =
  /Core: Application Skeleton перешёл в пользовательскую проверку/u;
const DIAGRAM_REVIEW_RE =
  /Core: Diagram Modules перешёл в пользовательскую проверку/u;
const QUALITY_REVIEW_RE =
  /Core: Quality Gates перешёл в пользовательскую проверку/u;
const QUALITY_RETURN_RE = /Core: Quality Gates завершён и зафиксирован/u;
const APP_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;
const APP_MAP_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;
const QUALITY_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`;
const QUALITY_JSON_PATH = `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`;

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

const appDraftMap = (): Record<string, unknown> => ({
  accepted: false,
  materializationState: "not_started",
  materialized: false,
  openQuestions: [],
  packageManager: "npm",
  productParts: [
    { codePath: "product-parts/core-runtime", partId: "core-runtime" },
  ],
  projectFoundation: {
    configFiles: ["tsconfig.json"],
    firstWaveEntrypoints: ["product-parts/core-runtime/src/index.ts"],
    installCommand: "npm ci",
    requiredScripts: ["build", "typecheck", "test:smoke"],
  },
  repoShape: "workspace-monorepo",
  schema: "codeai-application-skeleton-v1",
  stack: {
    frameworks: ["node"],
    languages: ["TypeScript"],
    runtimes: ["Node.js"],
  },
});

const appDraftDecision = (): ApplicationSkeletonManagedValidationResult => ({
  diagnostics: [],
  mapJson: appDraftMap(),
  nextAction: "open_user_review",
  nextPrompt: null,
  phase: "draft",
  valid: true,
});

const appMaterializedDecision =
  (): ApplicationSkeletonManagedValidationResult => ({
    diagnostics: [],
    mapJson: {
      ...appDraftMap(),
      accepted: true,
      materializationState: "materialized",
      materialized: true,
      materializedPaths: ["product-parts/core-runtime/src/index.ts"],
      reviewState: "materialized",
    },
    nextAction: "open_persistent_return",
    nextPrompt: null,
    phase: "materialization",
    valid: true,
  });

const qualityContract = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  accepted: false,
  advisory: [],
  commands: {
    "qg-secret-scan": {
      availability: "not_integrated",
      desiredStatus: "active",
      id: "qg-secret-scan",
      integrationRequired: true,
      plannedIntegrationPaths: ["package.json", ".husky/pre-commit"],
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

const qualityDraftDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: qualityContract(),
  diagnostics: [],
  nextAction: "open_user_review",
  nextPrompt: null,
  phase: "draft",
  valid: true,
});

const qualityIntegratedDecision = (): QualityGatesManagedValidationResult => ({
  contractJson: qualityContract({
    accepted: true,
    commands: {
      "qg-secret-scan": {
        availability: "executable",
        desiredStatus: "active",
        id: "qg-secret-scan",
        integrationRequired: true,
        proposedCommand: "npm run qg:secret-scan",
      },
    },
    integrated: true,
    integratedPaths: [
      "package.json",
      ".husky/pre-commit",
      "scripts/quality-gates/secret-scan.mjs",
    ],
    integrationState: "integrated",
  }),
  diagnostics: [],
  nextAction: "open_persistent_return",
  nextPrompt: null,
  phase: "integration",
  valid: true,
});

const createHandler = (params: {
  readonly stage:
    | typeof APP_STAGE
    | typeof DIAGRAM_STAGE
    | typeof QUALITY_STAGE;
  readonly workspaceRoot: string;
}): {
  readonly coreMessages: CapturedCoreMessage[];
  readonly handler: SessionRequestHandlerManagedWorkflowTurn;
  readonly sessionId: string;
} => {
  const coreMessages: CapturedCoreMessage[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    params.workspaceRoot,
    "provider-session-1",
    { initiativeSlug: WORKSPACE_SLUG, stage: params.stage }
  );
  const handler = new SessionRequestHandlerManagedWorkflowTurn({
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedCoreMessage) => {
        coreMessages.push(message);
      },
    },
    getMessageDispatch: () =>
      ({
        sendInternalMessage: () => Promise.resolve(),
      }) as never,
    sessionManager,
  });
  return { coreMessages, handler, sessionId: session.id };
};

const prepareApplicationDraft = async (
  workspaceRoot: string
): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    APP_MARKDOWN_PATH,
    "# Application Skeleton\n\n## Overview\n\nApplication Skeleton draft contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    APP_MAP_PATH,
    `${JSON.stringify(appDraftMap(), null, 2)}\n`
  );
  await new ApplicationSkeletonStagePlanController().openDraftPhase({
    workspaceRoot,
  });
};

const prepareApplicationMaterialization = async (
  workspaceRoot: string
): Promise<void> => {
  const controller = new ApplicationSkeletonStagePlanController();
  await prepareApplicationDraft(workspaceRoot);
  await controller.commitManagedTurn({
    decision: appDraftDecision(),
    sessionId: "setup-session",
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await controller.acceptUserReviewWithoutRevision({ workspaceRoot });
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    '{"scripts":{"build":"node -e \\"process.exit(0)\\"","test:smoke":"node -e \\"process.exit(0)\\"","typecheck":"node -e \\"process.exit(0)\\""}}\n'
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "package-lock.json",
    '{"lockfileVersion":3,"requires":true,"packages":{"":{}}}\n'
  );
  await writeWorkspaceFile(workspaceRoot, "tsconfig.json", "{}\n");
  await writeWorkspaceFile(
    workspaceRoot,
    ".gitignore",
    "node_modules/\ndist/\n.codeai-hub/state/\n"
  );
  await writeWorkspaceFile(workspaceRoot, "node_modules/.keep", "");
  await writeWorkspaceFile(
    workspaceRoot,
    "product-parts/core-runtime/src/index.ts",
    "export {};\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    APP_MARKDOWN_PATH,
    "# Application Skeleton\n\n## Overview\n\naccepted: true\nmaterialized: true\nreviewState: materialized\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    APP_MAP_PATH,
    `${JSON.stringify(appMaterializedDecision().mapJson, null, 2)}\n`
  );
};

const prepareDiagramIndex = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts",
      "",
      "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
    ].join("\n")
  );
};

const writeDiagramProductPart = (workspaceRoot: string): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/project-manager.md`,
    [
      "# Product Part: Project Manager",
      "",
      "## Identity",
      "",
      "| Field | Value |",
      "| --- | --- |",
      "| Part ID | `project-manager` |",
      "| Product Part | Project Manager |",
      "",
      "## Purpose",
      "",
      "Hosts the Project Manager UI.",
      "",
      "## Standalone Modules",
      "",
      "| `module-id` | Responsibility |",
      "| --- | --- |",
      "| `workflow-tree` | Renders workflow navigation. |",
    ].join("\n")
  );

const prepareQualityDraft = async (workspaceRoot: string): Promise<void> => {
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_MARKDOWN_PATH,
    "# Quality Gates Baseline\n\n## Overview\n\nGate contract.\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_JSON_PATH,
    `${JSON.stringify(qualityContract(), null, 2)}\n`
  );
  await new QualityGatesStagePlanController().openDraftPhase({ workspaceRoot });
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
  await writeWorkspaceFile(
    workspaceRoot,
    QUALITY_JSON_PATH,
    `${JSON.stringify(qualityIntegratedDecision().contractJson, null, 2)}\n`
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "package.json",
    '{"scripts":{"qg:secret-scan":"node scripts/quality-gates/secret-scan.mjs"}}\n'
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "scripts/quality-gates/secret-scan.mjs",
    "console.log('ok');\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nset -e\nnpm run qg:secret-scan\n"
  );
};

test("managed workflow turn emits Core-owned user review handoff messages", async () => {
  const cases = [
    {
      expected: APP_REVIEW_RE,
      prepare: prepareApplicationDraft,
      stage: APP_STAGE,
    },
    {
      expected: APP_REVIEW_RE,
      prepare: prepareApplicationMaterialization,
      stage: APP_STAGE,
    },
    {
      expected: QUALITY_REVIEW_RE,
      prepare: prepareQualityDraft,
      stage: QUALITY_STAGE,
    },
  ] as const;
  for (const testCase of cases) {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), `managed-review-${testCase.stage}-`)
    );
    try {
      await testCase.prepare(workspaceRoot);
      const { coreMessages, handler, sessionId } = createHandler({
        stage: testCase.stage,
        workspaceRoot,
      });

      await handler.handleTurnCompleted(sessionId);

      assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-user-review");
      assert.match(coreMessages.at(-1)?.content ?? "", testCase.expected);
      assert.match(coreMessages.at(-1)?.content ?? "", USER_REVIEW_RE);
      assert.match(coreMessages.at(-1)?.content ?? "", CONFIRMATION_RE);
      assert.doesNotMatch(
        coreMessages.at(-1)?.content ?? "",
        TYPE_CONFIRMATION_RE
      );
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }
});

test("managed workflow turn emits Core-owned Diagram Modules review handoff", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-review-diagram-modules-")
  );
  try {
    await prepareDiagramIndex(workspaceRoot);
    const { coreMessages, handler, sessionId } = createHandler({
      stage: DIAGRAM_STAGE,
      workspaceRoot,
    });

    await handler.handleTurnCompleted(sessionId);
    await writeDiagramProductPart(workspaceRoot);
    await handler.handleTurnCompleted(sessionId);

    assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-user-review");
    assert.match(coreMessages.at(-1)?.content ?? "", DIAGRAM_REVIEW_RE);
    assert.match(coreMessages.at(-1)?.content ?? "", USER_REVIEW_RE);
    assert.match(coreMessages.at(-1)?.content ?? "", CONFIRMATION_RE);
    assert.doesNotMatch(
      coreMessages.at(-1)?.content ?? "",
      TYPE_CONFIRMATION_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow turn emits Core-owned persistent return messages", async () => {
  const cases = [
    {
      expected: QUALITY_RETURN_RE,
      prepare: prepareQualityIntegration,
      stage: QUALITY_STAGE,
    },
  ] as const;
  for (const testCase of cases) {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), `managed-return-${testCase.stage}-`)
    );
    try {
      await testCase.prepare(workspaceRoot);
      const { coreMessages, handler, sessionId } = createHandler({
        stage: testCase.stage,
        workspaceRoot,
      });

      await handler.handleTurnCompleted(sessionId);

      assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-complete");
      assert.match(coreMessages.at(-1)?.content ?? "", testCase.expected);
      assert.match(coreMessages.at(-1)?.content ?? "", RETURN_RE);
    } finally {
      await rm(workspaceRoot, { force: true, recursive: true });
    }
  }
});

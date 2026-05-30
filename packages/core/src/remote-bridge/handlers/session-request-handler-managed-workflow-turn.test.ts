import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { ApplicationSkeletonStagePlanController } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-controller";
import type { ApplicationSkeletonManagedValidationResult } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-validator";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { SessionManager } from "../../session-manager";
import { SessionRequestHandlerManagedWorkflowTurn } from "./session-request-handler-managed-workflow-turn";

const WORKSPACE_SLUG = "demo-workspace";
const APP_STAGE = "application_skeleton";
const DIAGRAM_STAGE = "diagram_modules";
const USER_REVIEW_RE =
  /Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки/u;
const CONFIRMATION_RE = /нажмите кнопку «Подтверждаю» ниже/u;
const TYPE_CONFIRMATION_RE = /напишите `подтверждаю`/u;
const APP_DRAFT_RE = /Application Skeleton draft contract/u;
const APP_MATERIALIZED_RE =
  /Application Skeleton materialized filesystem skeleton/u;
const DIAGRAM_REVIEW_RE =
  /Core: Diagram Modules перешёл в пользовательскую проверку/u;
const DIAGRAM_CONTINUATION_USER_NOTICE_RE =
  /Core accepted the current Diagram Modules artifact/u;
const DIAGRAM_CONTINUATION_PRODUCT_PART_RE =
  /Materialize only Product Part "project-manager"/u;
const DIAGRAM_CONTINUATION_TEMPLATE_RE = /### product-part-template/u;
const DIAGRAM_CONTINUATION_FIELD_REFERENCE_RE =
  /### diagram-modules-field-reference/u;
const RAW_APPLICATION_SKELETON_REPAIR_PROMPT_RE =
  /Core rejected the current Application Skeleton draft/u;
const APPLICATION_SKELETON_REPAIR_USER_MESSAGE_RE =
  /Core: Application Skeleton требует исправить черновик/u;
const APP_MARKDOWN_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton.md`;
const APP_MAP_PATH = `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton/application-skeleton-map.json`;

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

const createHandler = (params: {
  readonly applicationStagePlan?: ApplicationSkeletonStagePlanController;
  readonly sendInternalMessage?: (
    sessionId: string,
    content: string
  ) => Promise<void>;
  readonly dispatchUserMessage?: (options: {
    readonly content: string;
    readonly hiddenUserMessage: boolean;
    readonly messageTag?: string;
    readonly sessionId: string;
  }) => Promise<void>;
  readonly stage: typeof APP_STAGE | typeof DIAGRAM_STAGE;
  readonly workspaceRoot: string;
}): {
  readonly coreMessages: CapturedCoreMessage[];
  readonly handler: SessionRequestHandlerManagedWorkflowTurn;
  readonly internalMessages: string[];
  readonly sessionId: string;
  readonly userMessageTags: Array<string | undefined>;
  readonly userMessages: string[];
  readonly waitEvents: string[];
} => {
  const coreMessages: CapturedCoreMessage[] = [];
  const internalMessages: string[] = [];
  const userMessageTags: Array<string | undefined> = [];
  const userMessages: string[] = [];
  const waitEvents: string[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    params.workspaceRoot,
    "provider-session-1",
    { initiativeSlug: WORKSPACE_SLUG, stage: params.stage }
  );
  const handler = new SessionRequestHandlerManagedWorkflowTurn({
    ...(params.applicationStagePlan
      ? { applicationStagePlan: params.applicationStagePlan }
      : {}),
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedCoreMessage) => {
        coreMessages.push(message);
      },
      waitForMessagePersistence: (waitSessionId: string) => {
        waitEvents.push(waitSessionId);
        return Promise.resolve();
      },
    },
    getMessageDispatch: () =>
      ({
        dispatchUserMessage:
          params.dispatchUserMessage ??
          ((options: {
            readonly content: string;
            readonly hiddenUserMessage: boolean;
            readonly messageTag?: string;
            readonly sessionId: string;
          }) => {
            assert.equal(options.hiddenUserMessage, false);
            userMessageTags.push(options.messageTag);
            userMessages.push(options.content);
            internalMessages.push(options.content);
            return Promise.resolve();
          }),
        sendInternalMessage:
          params.sendInternalMessage ??
          ((_sessionId: string, content: string) => {
            internalMessages.push(content);
            return Promise.resolve();
          }),
      }) as never,
    sessionManager,
  });
  return {
    coreMessages,
    handler,
    internalMessages,
    sessionId: session.id,
    userMessageTags,
    userMessages,
    waitEvents,
  };
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
      "- leadProductPartId: `project-manager`",
      "- productPartLeadershipOrder: `project-manager`",
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

test("managed workflow repair shows concise Application Skeleton user message and keeps full prompt internal", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-review-missing-application-skeleton-")
  );
  try {
    const { coreMessages, handler, internalMessages, sessionId } =
      createHandler({
        applicationStagePlan: {
          commitRejectedTurn: () =>
            Promise.resolve({
              blocked: null,
              commit: {
                expectedCommitMessage:
                  "docs: draft application skeleton contract",
                hash: "rejected-draft",
                nextTaskId: "application-skeleton.phase1.repair.task1",
              },
            }),
        } as never,
        stage: APP_STAGE,
        workspaceRoot,
      });

    const result = await handler.handleTurnCompleted(sessionId);

    assert.equal(result, "continued");
    assert.equal(coreMessages.length, 1);
    assert.equal(coreMessages[0]?.tag, "managed-workflow-validation");
    assert.match(
      coreMessages[0]?.content ?? "",
      APPLICATION_SKELETON_REPAIR_USER_MESSAGE_RE
    );
    assert.doesNotMatch(
      coreMessages[0]?.content ?? "",
      RAW_APPLICATION_SKELETON_REPAIR_PROMPT_RE
    );
    assert.equal(internalMessages.length, 1);
    assert.match(
      internalMessages[0] ?? "",
      RAW_APPLICATION_SKELETON_REPAIR_PROMPT_RE
    );
    assert.notEqual(internalMessages[0], coreMessages[0]?.content);
    await assert.rejects(
      access(
        path.join(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/application_skeleton`
        )
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow turn emits Core-owned user review handoff messages", async () => {
  const cases = [
    {
      expected: APP_DRAFT_RE,
      prepare: prepareApplicationDraft,
      stage: APP_STAGE,
    },
    {
      expected: APP_MATERIALIZED_RE,
      prepare: prepareApplicationMaterialization,
      stage: APP_STAGE,
    },
  ] as const;
  for (const testCase of cases) {
    const workspaceRoot = await mkdtemp(
      path.join(tmpdir(), `managed-review-${testCase.stage}-`)
    );
    try {
      await testCase.prepare(workspaceRoot);
      const { coreMessages, handler, sessionId, waitEvents } = createHandler({
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
      assert.deepEqual(waitEvents, []);
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

test("managed Diagram Modules continuation starts the next agent turn as a user message", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-review-diagram-user-continuation-")
  );
  try {
    await prepareDiagramIndex(workspaceRoot);
    const { coreMessages, handler, sessionId, userMessageTags, userMessages } =
      createHandler({
        stage: DIAGRAM_STAGE,
        workspaceRoot,
      });

    const result = await handler.handleTurnCompleted(sessionId);

    assert.equal(result, "continued");
    assert.deepEqual(
      coreMessages.filter(
        (message) => message.tag === "managed-workflow-continuation"
      ),
      []
    );
    assert.equal(userMessages.length, 1);
    assert.deepEqual(userMessageTags, ["managed-workflow-continuation"]);
    assert.match(userMessages[0] ?? "", DIAGRAM_CONTINUATION_USER_NOTICE_RE);
    assert.match(userMessages[0] ?? "", DIAGRAM_CONTINUATION_PRODUCT_PART_RE);
    assert.doesNotMatch(
      userMessages[0] ?? "",
      DIAGRAM_CONTINUATION_TEMPLATE_RE
    );
    assert.doesNotMatch(
      userMessages[0] ?? "",
      DIAGRAM_CONTINUATION_FIELD_REFERENCE_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow turn returns continued before internal continuation settles", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-review-diagram-async-continuation-")
  );
  try {
    await prepareDiagramIndex(workspaceRoot);
    const pendingInternalSend: { resolve?: () => void } = {};
    let internalSendStarted: (() => void) | null = null;
    const sendStarted = new Promise<void>((resolve) => {
      internalSendStarted = resolve;
    });
    const { handler, internalMessages, sessionId } = createHandler({
      dispatchUserMessage: (options) => {
        internalMessages.push(options.content);
        internalSendStarted?.();
        return new Promise<void>((resolve) => {
          pendingInternalSend.resolve = resolve;
        });
      },
      stage: DIAGRAM_STAGE,
      workspaceRoot,
    });

    const resultPromise = handler.handleTurnCompleted(sessionId);
    await sendStarted;
    const result = await Promise.race([
      resultPromise,
      new Promise<"pending">((resolve) =>
        setTimeout(() => resolve("pending"), 25)
      ),
    ]);
    assert.ok(pendingInternalSend.resolve);
    pendingInternalSend.resolve();

    assert.equal(result, "continued");
    assert.equal(await resultPromise, "continued");
    assert.equal(internalMessages.length, 1);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

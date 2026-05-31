import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
const USER_REVIEW_RE =
  /Пожалуйста, ответьте на вопросы агента, задайте свои вопросы или напишите правки/u;
const CONFIRMATION_RE = /нажмите кнопку «Подтверждаю» ниже/u;
const APP_COMPLETE_RE = /Core: Application Skeleton завершён и зафиксирован/u;
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

const createHandler = (workspaceRoot: string) => {
  const coreMessages: CapturedCoreMessage[] = [];
  const waitEvents: string[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    workspaceRoot,
    "provider-session-1",
    { initiativeSlug: WORKSPACE_SLUG, stage: APP_STAGE }
  );
  const handler = new SessionRequestHandlerManagedWorkflowTurn({
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
        dispatchUserMessage: () => Promise.resolve(),
        sendInternalMessage: () => Promise.resolve(),
      }) as never,
    sessionManager,
  });
  return { coreMessages, handler, sessionId: session.id, waitEvents };
};

test("managed workflow turn completes materialized Application Skeleton without final user review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "managed-review-application-materialized-")
  );
  try {
    await prepareApplicationMaterialization(workspaceRoot);
    const { coreMessages, handler, sessionId, waitEvents } =
      createHandler(workspaceRoot);

    await handler.handleTurnCompleted(sessionId);

    assert.equal(coreMessages.at(-1)?.tag, "managed-workflow-complete");
    assert.match(coreMessages.at(-1)?.content ?? "", APP_COMPLETE_RE);
    assert.doesNotMatch(coreMessages.at(-1)?.content ?? "", USER_REVIEW_RE);
    assert.doesNotMatch(coreMessages.at(-1)?.content ?? "", CONFIRMATION_RE);
    assert.deepEqual(waitEvents, [sessionId]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

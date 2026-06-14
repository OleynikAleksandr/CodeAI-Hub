import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { appendFileSync } from "node:fs";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowBoundaryGit } from "../../workflow/boundary/workflow-boundary-git";
import type { WorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { bootstrapWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import type { WorkspaceRuntimeFacade } from "../../workspace-runtime/workspace-runtime-facade";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionActions } from "./session-request-handler-session-actions";

const WORKSPACE_SLUG = "demo-workspace";
const DIAGRAM_STAGE = "diagram_modules";
const ACCEPTANCE = "подтверждаю";
const USER_RETURN_STREAM_RE = /### Stream: User Return And Revisions/u;
const USER_RETURN_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase3\.user-return\.task1"/u;
const APPLICATION_ACTIVE_RE = /"activeStage": "application_skeleton"/u;
const DIAGRAM_COMPLETE_MESSAGE_RE =
  /Core: Diagram Modules завершён и зафиксирован/u;
const DIAGRAM_COMPLETED_RE = /"diagram_modules"/u;
const USER_ACCEPTANCE_RE = /подтверждаю/u;
const DIAGRAM_ACCEPTED_COMMIT_RE = /codeai-step: Diagram Modules accepted/u;
const PRODUCT_PART_BOOTSTRAP_COMMIT_RE =
  /docs: bootstrap product part development briefs/u;
const PRODUCT_PART_BRIEF_DRAFT_RE = /ProductPartDevelopmentBrief\.draft\.md/u;
const PRODUCT_PART_BRIEF_TITLE_RE = /ProductPartDevelopmentBrief/u;
const MISSING_FILE_RE = /ENOENT/u;
const APPLICATION_SKELETON_ACTIVATION_EVENT = {
  payload: { stage: "application_skeleton" },
  type: "workflow:stage:activate",
} as const;
const execFileAsync = promisify(execFile);

interface CapturedMessage {
  readonly content: unknown;
  readonly role?: string;
  readonly tag?: string;
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

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const appendPersistedMessage = (
  messageLogPath: string | undefined,
  message: CapturedMessage
): void => {
  if (!messageLogPath) {
    return;
  }
  appendFileSync(messageLogPath, `${JSON.stringify(message)}\n`, "utf8");
};

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const prepareDiagramReviewWorkspace = async (
  workspaceRoot: string
): Promise<WorkspaceRuntimeCapsule> => {
  const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  await new ManagedWorkflowScaffoldInstaller().installDiagramModulesScaffold({
    workspaceRoot,
  });
  await new WorkflowBoundaryGit().ensureRepository(workspaceRoot);
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/stages/diagram-modules/todo-plan.md",
    `# Diagram Modules Managed TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-diagram-modules",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "3836dc1",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "diagram-modules.phase2.review.task1",
  "expectedCommitMessage": "docs: open diagram modules user review",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 — Diagram Modules User Review

### Stream: User-Led Review

13. [DONE] \`diagram-modules.phase2.review.task1\` User reviews the accepted Diagram Modules Product Part artifacts before the stage can be completed (scope: user workflow; expected commit: \`docs: open diagram modules user review\`).
14. [DONE] Git Commit: \`docs: open diagram modules user review\` (hash: 3836dc1)
`
  );
  await new WorkflowBoundaryGit().commit({
    commitMessage: "docs: open diagram modules user review",
    paths: [".codeai-hub", ".husky", "doc/TODO", "package.json", "scripts"],
    workspaceRoot,
  });
  return capsule;
};

const writeDiagramModulesAcceptedArtifacts = async (
  workspaceRoot: string
): Promise<void> => {
  const parts = [
    ["local-runtime", "provider-bridge"],
    ["finder-widget-shell", "view-shell"],
  ] as const;
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`,
    [
      "# Product Parts Index",
      "",
      "- leadProductPartId: `local-runtime`",
      `- productPartLeadershipOrder: ${parts.map(([id]) => `\`${id}\``).join(", ")}`,
      "",
      ...parts.flatMap(([id]) => [
        `### Product Part: ${id}`,
        `- Title: ${id}`,
        "- Purpose: Test product part.",
        "",
      ]),
    ].join("\n")
  );
  for (const [id, moduleId] of parts) {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${id}.md`,
      [
        `# Product Part: ${id}`,
        "",
        "## Identity",
        "",
        "| Field | Value |",
        "| ----- | ----- |",
        `| Part ID | \`${id}\` |`,
        "",
        "## Standalone Modules",
        "",
        "| `module-id` | Responsibility |",
        "| --- | --- |",
        `| \`${moduleId}\` | Test responsibility. |`,
        "",
      ].join("\n")
    );
  }
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
      "test: accept diagram modules artifacts",
    ],
    { cwd: workspaceRoot }
  ).catch(() => undefined);
};

const createActions = (
  sessionManager: SessionManager,
  options: {
    readonly developmentTreeAgentGateway?: DevelopmentTreeAgentSessionGateway;
    readonly messageLogPath?: string;
    readonly workspaceRuntime?: WorkspaceRuntimeFacade;
  } = {}
) => {
  const coreMessages: CapturedMessage[] = [];
  const dialogMessages: CapturedMessage[] = [];
  const dispatchedUserMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const sentInternalMessages: string[] = [];
  const actions = new SessionRequestHandlerSessionActions({
    appliedTurnConfig: {} as never,
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    continuityLockService: {
      getContext: () => null,
    } as never,
    continuityRolloverOrchestrator: {} as never,
    developmentTreeAgentGateway: options.developmentTreeAgentGateway,
    eventMessages: {
      appendCoreMessage: (_sessionId: string, message: CapturedMessage) => {
        appendPersistedMessage(options.messageLogPath, message);
        coreMessages.push(message);
      },
      appendDialogMessage: (_sessionId: string, message: CapturedMessage) => {
        appendPersistedMessage(options.messageLogPath, message);
        dialogMessages.push(message);
      },
      extractMessageContentAndTurnOptions: (payload: unknown) =>
        typeof payload === "string" ? { content: payload } : null,
      waitForMessagePersistence: () => Promise.resolve(),
    } as never,
    logger: new Logger("error"),
    messageDispatch: {
      dispatchUserMessage: (options: { readonly content: string }) => {
        dispatchedUserMessages.push(options.content);
        return Promise.resolve();
      },
      sendInternalMessage: (_sessionId: string, content: string) => {
        sentInternalMessages.push(content);
        return Promise.resolve();
      },
    } as never,
    onProviderFailure: () => undefined,
    providerRegistry: {} as never,
    providerSessions: new Map(),
    resumeLifecycle: {
      clearPostTurnContextDecision: () => undefined,
      getSessionResumeLifecycleState: () => ({
        finalTurnCompleted: false,
        mode: "resume",
        terminalLockReason: null,
      }),
      hasPendingPostTurnContextDecision: () => false,
      updateSessionResumeLifecycleState: () => undefined,
    } as never,
    sessionManager,
    sessionStorage: {} as never,
    stopRebind: {
      ensureSessionReadyForSend: async () => true,
    } as never,
    workspaceRuntime: options.workspaceRuntime,
  });
  return {
    actions,
    coreMessages,
    dialogMessages,
    dispatchedUserMessages,
    events,
    sentInternalMessages,
  };
};

const createSettlingWorkspaceRuntime = (
  events: string[]
): WorkspaceRuntimeFacade => {
  let snapshotCount = 0;
  const idle = {
    lastHeartbeatAt: "2026-06-13T07:07:30.000Z",
    turnState: "idle",
  };
  const running = {
    turnState: "running",
  };
  return {
    getSnapshot: () => {
      snapshotCount += 1;
      events.push(`snapshot:${snapshotCount}`);
      if (snapshotCount === 1) {
        return { sessions: { "devtree-1": running } };
      }
      if (snapshotCount === 2) {
        return { sessions: { "devtree-1": idle } };
      }
      if (snapshotCount === 3) {
        return { sessions: { "devtree-1": idle, "devtree-2": running } };
      }
      return { sessions: { "devtree-1": idle, "devtree-2": idle } };
    },
  } as unknown as WorkspaceRuntimeFacade;
};

test("Diagram Modules review acceptance is intercepted by Core and opens persistent return", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "diagram-review-session-accept-")
  );
  try {
    const capsule = await prepareDiagramReviewWorkspace(workspaceRoot);
    await writeDiagramModulesAcceptedArtifacts(workspaceRoot);
    const unifiedSessionPath = path.join(
      capsule.unifiedSessionsRoot.absolutePath,
      "codexCli",
      "diagram-review.jsonl"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      path.relative(workspaceRoot, unifiedSessionPath),
      "existing session\n"
    );
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: WORKSPACE_SLUG, stage: DIAGRAM_STAGE }
    );
    const createdStages: string[] = [];
    const createdWorkspacePaths: string[] = [];
    const gatewayEvents: string[] = [];
    const sentMessages: string[] = [];
    const harness = createActions(sessionManager, {
      developmentTreeAgentGateway: {
        createSessionForWorkflow: (options) => {
          createdStages.push(options.context.stage);
          createdWorkspacePaths.push(options.workspacePath);
          const sessionId = `devtree-${createdStages.length}`;
          gatewayEvents.push(`create:${sessionId}`);
          return Promise.resolve({ id: sessionId });
        },
        handleMessage: (sessionId, content) => {
          gatewayEvents.push(`send:${sessionId}`);
          sentMessages.push(content);
          return Promise.resolve();
        },
      },
      messageLogPath: unifiedSessionPath,
      workspaceRuntime: createSettlingWorkspaceRuntime(gatewayEvents),
    });

    await harness.actions.handleMessage(session.id, ACCEPTANCE);

    assert.deepEqual(harness.dispatchedUserMessages, []);
    assert.deepEqual(harness.sentInternalMessages, []);
    assert.equal(harness.dialogMessages.at(-1)?.role, "user");
    assert.equal(harness.dialogMessages.at(-1)?.content, ACCEPTANCE);
    assert.equal(
      harness.coreMessages.at(-1)?.tag,
      "managed-workflow-complete",
      String(harness.coreMessages.at(-1)?.content ?? "")
    );
    assert.match(
      String(harness.coreMessages.at(-1)?.content ?? ""),
      DIAGRAM_COMPLETE_MESSAGE_RE
    );
    assert.doesNotMatch(
      String(harness.coreMessages.at(-1)?.content ?? ""),
      USER_ACCEPTANCE_RE
    );

    const stagePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(stagePlan, USER_RETURN_STREAM_RE);
    assert.match(stagePlan, USER_RETURN_TASK_STATE_RE);

    const workspacePlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/workspace.plan.md"
    );
    assert.match(workspacePlan, APPLICATION_ACTIVE_RE);
    assert.match(workspacePlan, DIAGRAM_COMPLETED_RE);
    assert.match(
      await git(workspaceRoot, ["log", "--format=%s"]),
      DIAGRAM_ACCEPTED_COMMIT_RE
    );
    assert.match(
      await git(workspaceRoot, ["log", "--format=%s"]),
      PRODUCT_PART_BOOTSTRAP_COMMIT_RE
    );
    for (const partId of ["local-runtime", "finder-widget-shell"]) {
      const planPath = `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`;
      const briefPath = `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/${partId}/ProductPartDevelopmentBrief.draft.md`;
      await readWorkspaceFile(workspaceRoot, planPath);
      assert.match(
        await readWorkspaceFile(workspaceRoot, briefPath),
        PRODUCT_PART_BRIEF_TITLE_RE
      );
      const managedState = JSON.parse(
        await readWorkspaceFile(
          workspaceRoot,
          `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${partId}.json`
        )
      ) as { readonly reviewState?: string; readonly worktreePath?: string };
      assert.equal(managedState.reviewState, "draft_started");
      assert.equal(managedState.worktreePath, undefined);
    }
    await assert.rejects(
      async () => await stat(`${workspaceRoot}.worktrees`),
      MISSING_FILE_RE
    );
    assert.deepEqual([...createdStages].sort(), [
      "development_tree/materialized/product-parts/finder-widget-shell",
      "development_tree/materialized/product-parts/local-runtime",
    ]);
    assert.deepEqual([...createdWorkspacePaths].sort(), [
      workspaceRoot,
      workspaceRoot,
    ]);
    assert.equal(sentMessages.length, 2);
    assert.match(sentMessages[0] ?? "", PRODUCT_PART_BRIEF_DRAFT_RE);
    assert.deepEqual(gatewayEvents, [
      "create:devtree-1",
      "send:devtree-1",
      "snapshot:1",
      "snapshot:2",
      "create:devtree-2",
      "send:devtree-2",
      "snapshot:3",
      "snapshot:4",
    ]);
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    const unifiedSession = await readFile(unifiedSessionPath, "utf8");
    assert.match(unifiedSession, DIAGRAM_COMPLETE_MESSAGE_RE);
    assert.deepEqual(harness.events, [APPLICATION_SKELETON_ACTIVATION_EVENT]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

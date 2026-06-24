import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import type { CoreConfig } from "../../config";
import { ManagedWorkflowScaffoldInstaller } from "../../managed-workflow-orchestration/managed-workflow-scaffold-installer";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
import { createSessionRequestHandlerRuntime } from "./session-request-handler-runtime";
import {
  createSessionRequestHandlerRuntimeCore,
  resolveClaudeHaikuTranslationServiceForRuntime,
  type SessionRequestHandlerRuntimeCore,
} from "./session-request-handler-runtime-core";
import type { SessionRequestHandlerRuntimeDependencies } from "./session-request-handler-runtime-types";

const createDependencies = (
  adapter: ProviderAdapter | undefined
): SessionRequestHandlerRuntimeDependencies =>
  ({
    providerRegistry: {
      getAdapter: (providerId: string) =>
        providerId === "claudeCodeCli" ? adapter : undefined,
    },
  }) as SessionRequestHandlerRuntimeDependencies;

interface RuntimeContinuityCallbacks {
  readonly createSession: (options: {
    readonly context: {
      readonly initiativeSlug: string | null;
      readonly stage: string | null;
    };
    readonly providerId: string;
    readonly rootSessionId: string;
    readonly workspacePath: string;
  }) => Promise<unknown>;
  readonly sendMessage: (sessionId: string, content: string) => Promise<void>;
}

interface RuntimeContinuityCallbackOwner {
  readonly callbacks: RuntimeContinuityCallbacks;
}

const noop = (): void => undefined;
const execFileAsync = promisify(execFile);
const DIAGRAM_REPAIR_PROMPT_RE =
  /Core rejected the current Diagram Modules subturn/u;
const DIAGRAM_REPAIR_TARGET_RE =
  /\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\/project-manager\.md/u;
const DIAGRAM_REPAIR_HEADING_RE = /# Product Part: project-manager/u;
const DIAGRAM_REPAIR_NOTICE_RE =
  /Core: Diagram Modules требует исправить staged artifact/u;
const DIAGRAM_REPAIR_NOTICE_TARGET_RE =
  /Target artifact: `\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\/project-manager\.md`\./u;
const EMBEDDED_TEMPLATE_HEADING_RE = /Embedded artifact contract templates/u;
const DIAGRAM_REPAIR_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase1\.repair\.task1"/u;
const DIAGRAM_REPAIR_COMMIT_RE =
  /docs: update diagram modules product part index/u;
const DIAGRAM_REVIEW_PHASE_RE = /## Phase 2 — Diagram Modules User Review/u;
const DIAGRAM_REVIEW_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase2\.review\.task1"/u;
const DIAGRAM_PRODUCT_PART_TASK_STATE_RE =
  /"currentTaskId": "diagram-modules\.phase1\.product-part\.project-manager\.task1"/u;
const DIAGRAM_INDEX_COMMIT_RE =
  /docs: update diagram modules product part index/u;
const DIAGRAM_PROJECT_MANAGER_COMMIT_RE =
  /docs: update diagram modules project-manager product part/u;
const DIAGRAM_CONTINUATION_PROMPT_RE =
  /Materialize only Product Part "project-manager"/u;
const DIAGRAM_CORE_CONTINUATION_MESSAGE_RE =
  /Core accepted the current Diagram Modules artifact\.\nNext subturn: project-manager\./u;
const DIAGRAM_CORE_REVIEW_MESSAGE_RE =
  /Core: Diagram Modules перешёл в пользовательскую проверку/u;

const readRuntimeContinuityCallbacks = (
  runtime: SessionRequestHandlerRuntimeCore
): RuntimeContinuityCallbacks =>
  (runtime.continuity as unknown as RuntimeContinuityCallbackOwner).callbacks;

const waitForManagedTurn = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 1000));

const readWorkspaceFile = (
  workspaceRoot: string,
  relativePath: string
): Promise<string> => readFile(path.join(workspaceRoot, relativePath), "utf8");

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const createCoreConfig = (): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 50,
  claudeDefaultModel: "claude-default-model",
  claudeProjectSlug: "runtime-core-test",
  claudeSettingsPath: "/tmp/codeai-hub-runtime-core-test/settings.json",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: "/tmp/codeai-hub-runtime-core-test/templates",
});

const createRuntimeCallbacks =
  (): SessionRequestHandlerRuntimeDependencies["callbacks"] => ({
    createSessionForWorkflow: async () => null,
    emitContinuityLockEvent: noop,
    emitTurnStateEvent: noop,
    finalizeFlowNodeContinuityLock: noop,
    finalizeFlowNodeContinuityLockOnBootstrapGate: noop,
    getDefaultProviderId: () => "codexCli",
    handleFlowNodeContinuityProviderEvent: async () => undefined,
    handleMessage: async () => undefined,
    handleProviderEvent: noop,
    handleProviderFailure: noop,
    handleTurnCompletedWithFlowNodeArbitration: noop,
    isFlowNodeRolloverPending: () => false,
    registerFlowNodeContinuityLockContext: (context) => context,
    resolveContinuityRootSessionId: async ({ sessionId }) => sessionId,
    resolveImmediatePostTurnContextDecision: () => null,
    runTurnCompletedArbitration: noop,
  });

const createRuntimeDependencies = (options: {
  readonly events: BridgeEvent[];
  readonly providerAdapter?: ProviderAdapter;
  readonly providerSessions?: Map<string, unknown>;
  readonly sessionManager: SessionManager;
}): SessionRequestHandlerRuntimeDependencies =>
  ({
    broadcaster: (event: BridgeEvent) => {
      options.events.push(event);
    },
    callbacks: createRuntimeCallbacks(),
    config: createCoreConfig(),
    continuityRootBySessionId: new Map(),
    logger: new Logger("error"),
    providerRegistry: {
      getAdapter: (providerId: string) =>
        providerId === "codexCli" ? options.providerAdapter : undefined,
    } as unknown as ProviderRegistry,
    providerSessions: options.providerSessions ?? new Map(),
    sessionManager: options.sessionManager,
    sessionStorage: {
      appendMessage: async () => undefined,
      appendMessageTranslation: async () => undefined,
    },
    stateBroadcaster: noop,
  }) as unknown as SessionRequestHandlerRuntimeDependencies;

test("resolveClaudeHaikuTranslationServiceForRuntime returns provider-owned service", () => {
  const service = {
    translate: async () => ({ text: "ok" }),
  } as unknown as ClaudeHaikuTranslationService;
  const adapter = {
    getHaikuTranslationService: () => service,
  } as unknown as ProviderAdapter;

  const resolved = resolveClaudeHaikuTranslationServiceForRuntime(
    createDependencies(adapter)
  );

  assert.equal(resolved, service);
});

test("resolveClaudeHaikuTranslationServiceForRuntime returns undefined without provider-owned getter", () => {
  const adapter = {} as ProviderAdapter;

  const resolved = resolveClaudeHaikuTranslationServiceForRuntime(
    createDependencies(adapter)
  );

  assert.equal(resolved, undefined);
});

test("createSessionRequestHandlerRuntimeCore wires deferred continuity callbacks after construction", async () => {
  const events: BridgeEvent[] = [];
  const sessionManager = new SessionManager();
  const session = sessionManager.createSession(
    "codexCli",
    "/tmp/runtime-core-callbacks"
  );
  const runtime = createSessionRequestHandlerRuntimeCore(
    createRuntimeDependencies({ events, sessionManager }),
    {
      clearPendingState: noop,
      clearTokenUsageSnapshot: noop,
    }
  );
  const callbacks = readRuntimeContinuityCallbacks(runtime);

  await assert.doesNotReject(() =>
    callbacks.sendMessage(session.id, "handoff prompt")
  );

  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, "session:error");
  if (events[0]?.type !== "session:error") {
    assert.fail("Expected missing provider binding event");
  }
  assert.equal(
    (events[0].payload as { readonly code?: string }).code,
    "missing_provider_binding"
  );

  const createdSession = await callbacks.createSession({
    context: {
      initiativeSlug: null,
      stage: null,
    },
    providerId: "codexCli",
    rootSessionId: session.id,
    workspacePath: "/tmp/runtime-core-callbacks",
  });

  assert.equal(createdSession, null);
});

test("createSessionRequestHandlerRuntimeCore dispatches repair prompt for invalid Diagram Modules Product Part", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-runtime-core-diagram-repair-")
  );
  const workspaceSlug = "demo-workspace";
  const sentMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const sessionManager = new SessionManager();
  const providerSessions = new Map<string, unknown>();
  const adapter = {
    sendMessage: (_providerSessionId: string, content: string) => {
      sentMessages.push(content);
      return Promise.resolve();
    },
  } as unknown as ProviderAdapter;

  try {
    const installer = new ManagedWorkflowScaffoldInstaller();
    await installer.installDiagramModulesScaffold({ workspaceRoot });
    await installer.checkpointDiagramModulesInputs({
      workspaceRoot,
      workspaceSlug,
    });
    const diagramRoot = path.join(
      workspaceRoot,
      ".codeai-hub",
      workspaceSlug,
      "diagram_modules"
    );
    await mkdir(path.join(diagramRoot, "product-parts"), { recursive: true });
    await writeFile(
      path.join(diagramRoot, "product-parts.index.md"),
      [
        "# Product Parts",
        "",
        "- leadProductPartId: `project-manager`",
        "- productPartLeadershipOrder: `project-manager`",
        "",
        "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
      ].join("\n"),
      "utf8"
    );
    await writeFile(
      path.join(diagramRoot, "product-parts/project-manager.md"),
      "# Project Manager\n\nMissing the required Product Part heading.\n",
      "utf8"
    );

    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: workspaceSlug, stage: "diagram_modules" }
    );
    providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: "provider-session-1",
      unsubscribe: noop,
    });
    const runtime = createSessionRequestHandlerRuntimeCore(
      createRuntimeDependencies({
        events,
        providerAdapter: adapter,
        providerSessions,
        sessionManager,
      }),
      {
        clearPendingState: noop,
        clearTokenUsageSnapshot: noop,
      }
    );

    runtime.providerEventRouter.handleProviderEvent(session.id, {
      eventId: "invalid-product-part",
      type: "turn_completed",
    });

    await waitForManagedTurn();

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_PROMPT_RE);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_TARGET_RE);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_HEADING_RE);
    const validationMessage = session.messages.find(
      (message) => message.tag === "managed-workflow-validation"
    );
    assert.ok(validationMessage);
    assert.match(validationMessage.content, DIAGRAM_REPAIR_NOTICE_RE);
    assert.match(validationMessage.content, DIAGRAM_REPAIR_NOTICE_TARGET_RE);
    assert.doesNotMatch(
      validationMessage.content,
      EMBEDDED_TEMPLATE_HEADING_RE
    );
    const repairPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(repairPlan, DIAGRAM_REPAIR_TASK_STATE_RE);
    const subjects = await git(workspaceRoot, ["log", "--format=%s"]);
    assert.match(subjects, DIAGRAM_REPAIR_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 20,
    });
  }
});

test("createSessionRequestHandlerRuntimeCore commits accepted Diagram Modules subturns before continuation and review", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-runtime-core-diagram-plan-")
  );
  const workspaceSlug = "demo-workspace";
  const sentMessages: string[] = [];
  const events: BridgeEvent[] = [];
  const sessionManager = new SessionManager();
  const providerSessions = new Map<string, unknown>();
  const adapter = {
    sendMessage: (_providerSessionId: string, content: string) => {
      sentMessages.push(content);
      return Promise.resolve();
    },
  } as unknown as ProviderAdapter;

  try {
    const installer = new ManagedWorkflowScaffoldInstaller();
    await installer.installDiagramModulesScaffold({ workspaceRoot });
    await installer.checkpointDiagramModulesInputs({
      workspaceRoot,
      workspaceSlug,
    });
    const diagramRoot = path.join(
      workspaceRoot,
      ".codeai-hub",
      workspaceSlug,
      "diagram_modules"
    );
    await mkdir(path.join(diagramRoot, "product-parts"), { recursive: true });
    await writeFile(
      path.join(diagramRoot, "product-parts.index.md"),
      [
        "# Product Parts",
        "",
        "- leadProductPartId: `project-manager`",
        "- productPartLeadershipOrder: `project-manager`",
        "",
        "1. `project-manager` - `.codeai-hub/demo-workspace/diagram_modules/product-parts/project-manager.md`",
      ].join("\n"),
      "utf8"
    );

    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-1",
      { initiativeSlug: workspaceSlug, stage: "diagram_modules" }
    );
    providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: "provider-session-1",
      unsubscribe: noop,
    });
    const runtime = createSessionRequestHandlerRuntimeCore(
      createRuntimeDependencies({
        events,
        providerAdapter: adapter,
        providerSessions,
        sessionManager,
      }),
      {
        clearPendingState: noop,
        clearTokenUsageSnapshot: noop,
      }
    );

    runtime.providerEventRouter.handleProviderEvent(session.id, {
      eventId: "accepted-index",
      type: "turn_completed",
    });
    await waitForManagedTurn();

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", DIAGRAM_CONTINUATION_PROMPT_RE);
    assert.match(
      session.messages.at(-1)?.content ?? "",
      DIAGRAM_CORE_CONTINUATION_MESSAGE_RE
    );
    const afterIndexPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(afterIndexPlan, DIAGRAM_PRODUCT_PART_TASK_STATE_RE);

    await writeFile(
      path.join(diagramRoot, "product-parts/project-manager.md"),
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
      ].join("\n"),
      "utf8"
    );
    runtime.providerEventRouter.handleProviderEvent(session.id, {
      eventId: "accepted-final-part",
      type: "turn_completed",
    });
    await waitForManagedTurn();

    const finalPlan = await readWorkspaceFile(
      workspaceRoot,
      "doc/TODO/stages/diagram-modules/todo-plan.md"
    );
    assert.match(finalPlan, DIAGRAM_REVIEW_PHASE_RE);
    assert.match(finalPlan, DIAGRAM_REVIEW_TASK_STATE_RE);
    assert.equal(session.messages.at(-1)?.tag, "managed-workflow-user-review");
    assert.match(
      session.messages.at(-1)?.content ?? "",
      DIAGRAM_CORE_REVIEW_MESSAGE_RE
    );

    const subjects = await git(workspaceRoot, ["log", "--format=%s"]);
    assert.match(subjects, DIAGRAM_INDEX_COMMIT_RE);
    assert.match(subjects, DIAGRAM_PROJECT_MANAGER_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, {
      force: true,
      maxRetries: 3,
      recursive: true,
      retryDelay: 20,
    });
  }
});

test("createSessionRequestHandlerRuntime wires rollover bridge after construction", () => {
  const events: BridgeEvent[] = [];
  const sessionManager = new SessionManager();
  const runtime = createSessionRequestHandlerRuntime(
    createRuntimeDependencies({ events, sessionManager })
  );

  assert.doesNotThrow(() =>
    runtime.resumeLifecycle.clearPostTurnContextDecision("session-1")
  );
});

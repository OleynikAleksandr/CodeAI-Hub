import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import type { CoreConfig } from "../../config";
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
const DIAGRAM_REPAIR_PROMPT_RE =
  /Core rejected the current Diagram Modules subturn/u;
const DIAGRAM_REPAIR_TARGET_RE =
  /\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\/project-manager\.md/u;
const DIAGRAM_REPAIR_HEADING_RE = /# Product Part: project-manager/u;

const readRuntimeContinuityCallbacks = (
  runtime: SessionRequestHandlerRuntimeCore
): RuntimeContinuityCallbacks =>
  (runtime.continuity as unknown as RuntimeContinuityCallbackOwner).callbacks;

const createCoreConfig = (): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 50,
  claudeDefaultModel: "claude-default-model",
  claudeProjectSlug: "runtime-core-test",
  claudeSettingsPath: "/tmp/codeai-hub-runtime-core-test/settings.json",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  geminiSettingsPath: "/tmp/codeai-hub-runtime-core-test/settings.json",
  geminiThinkingLevelByModel: {},
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: "/tmp/codeai-hub-runtime-core-test/templates",
});

const createRuntimeCallbacks =
  (): SessionRequestHandlerRuntimeDependencies["callbacks"] => ({
    emitContinuityLockEvent: noop,
    emitTurnStateEvent: noop,
    finalizeFlowNodeContinuityLock: noop,
    finalizeFlowNodeContinuityLockOnBootstrapGate: noop,
    getDefaultProviderId: () => "geminiCli",
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
    "geminiCli",
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
    providerId: "geminiCli",
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

    await new Promise<void>((resolve) => setTimeout(resolve, 20));

    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_PROMPT_RE);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_TARGET_RE);
    assert.match(sentMessages[0] ?? "", DIAGRAM_REPAIR_HEADING_RE);
    assert.equal(session.messages.at(-1)?.tag, "managed-workflow-validation");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
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

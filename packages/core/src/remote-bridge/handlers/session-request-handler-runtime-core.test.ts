import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeHaikuTranslationService } from "@codeai-hub/claude-module";
import type { CoreConfig } from "../../config";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import type { BridgeEvent } from "../types";
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
      getAdapter: () => undefined,
    } as unknown as ProviderRegistry,
    providerSessions: new Map(),
    sessionManager: options.sessionManager,
    sessionStorage: {},
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

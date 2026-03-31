import path from "node:path";
import type { CoreConfig } from "../../config";
import { SessionManager } from "../../session-manager";
import type { BridgeEvent } from "../types";
import {
  type ProviderSessionBinding,
  SessionRequestHandler,
} from "./session-request-handler";
import type { HandlerTestInternals } from "./session-request-handler-types";

export {
  collectTurnStateSequence,
  countContextCheckPendingLockEvents,
  countContinuityUnlocks,
  countIdleTurnStateEvents,
  countNoRolloverUnlockEvents,
} from "./session-request-handler.test-event-helpers";
export type { HandlerTestInternals } from "./session-request-handler-types";

export const internals = (
  handler: SessionRequestHandler
): HandlerTestInternals => handler as unknown as HandlerTestInternals;

const packageRoot = path.resolve(process.cwd(), "packages/core");
export const SOURCE_PATH = path.join(
  packageRoot,
  "src/remote-bridge/handlers/session-request-handler.ts"
);

export interface BindingUpdate {
  readonly providerSessionId: string;
  readonly sessionId: string;
}
export interface RuntimeLockUpdate {
  readonly active: boolean;
  readonly awaitingBootstrapTurn: boolean;
  readonly reason: string | null;
  readonly sessionId: string;
  readonly transitionRolloverId: string | null;
}
interface MutableSessionStorage {
  appendMessage: (...args: unknown[]) => Promise<void>;
  backfillHistory: (...args: unknown[]) => Promise<void>;
  close: (...args: unknown[]) => void;
  promote: (sessionId: string, providerSessionId: string) => void;
  promoteHistoryFile: (...args: unknown[]) => void;
  register: (...args: unknown[]) => void;
}
interface MutableProviderRegistry {
  getAdapter: (...args: unknown[]) => unknown;
  handleRuntimeFailure: (...args: unknown[]) => void;
}

export interface HandlerHarness {
  readonly api: SessionRequestHandler & Record<string, unknown>;
  readonly continuityTracked: BindingUpdate[];
  readonly continuityUpdates: BindingUpdate[];
  readonly events: BridgeEvent[];
  readonly handler: SessionRequestHandler;
  readonly promoted: BindingUpdate[];
  readonly providerRegistry: MutableProviderRegistry;
  readonly providerSessions: Map<string, ProviderSessionBinding>;
  readonly runtimeLockUpdates: RuntimeLockUpdate[];
  readonly sessionManager: SessionManager;
  readonly sessionStorage: MutableSessionStorage;
}

const TEST_CORE_CONFIG: CoreConfig = {
  host: "127.0.0.1",
  port: 8080,
  shutdownGracePeriodMs: 1000,
  idleTtlMinutes: null,
  managedMode: null,
  templatesDir: "/tmp/codeai-hub-test-templates",
  claudeWorkspacePath: "/tmp/codeai-hub-test-workspace",
  claudeProjectSlug: "codeai-hub-tests",
  claudeSettingsPath: "/tmp/codeai-hub-test-claude-settings.json",
  codexWorkspacePath: "/tmp/codeai-hub-test-workspace",
  codexSkipGitRepoCheck: true,
  geminiWorkspacePath: "/tmp/codeai-hub-test-workspace",
  geminiThinkingLevelByModel: {},
  geminiSettingsPath: "/tmp/codeai-hub-test-gemini-settings.json",
  claudeDefaultModel: "sonnet",
  claudeContinuityRemainingPercentThreshold: 30,
  continuityPreemptRemainingPercentThreshold: 50,
};

export const noop = (): void => {
  /* noop */
};

export const flushAsyncWork = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
  await new Promise<void>((resolve) => setImmediate(resolve));
};

export const createHarness = (
  configOverrides: Partial<CoreConfig> = {}
): HandlerHarness => {
  const config: CoreConfig = {
    ...TEST_CORE_CONFIG,
    ...configOverrides,
  };
  const sessionManager = new SessionManager();
  const events: BridgeEvent[] = [];
  const promoted: BindingUpdate[] = [];
  const continuityUpdates: BindingUpdate[] = [];
  const continuityTracked: BindingUpdate[] = [];
  const runtimeLockUpdates: RuntimeLockUpdate[] = [];

  const providerRegistry: MutableProviderRegistry = {
    getAdapter: () => null,
    handleRuntimeFailure: noop,
  };
  const sessionStorage: MutableSessionStorage = {
    appendMessage: async () => Promise.resolve(),
    close: noop,
    promote: (sessionId, providerSessionId) => {
      promoted.push({ sessionId, providerSessionId });
    },
    register: noop,
    backfillHistory: async () => Promise.resolve(),
    promoteHistoryFile: noop,
  };

  const handler = new SessionRequestHandler({
    config,
    sessionManager,
    providerRegistry: providerRegistry as never,
    sessionStorage: sessionStorage as never,
    logger: { info: noop, warn: noop, error: noop } as never,
    broadcaster: (event) => {
      events.push(event);
    },
    stateBroadcaster: noop,
    workspaceRuntime: {
      notifyTurnStateChanged: noop,
      notifyFinalTurnCompleted: noop,
      notifyLockChanged: (
        sessionKey: { readonly sessionId: string },
        options: {
          readonly active: boolean;
          readonly reason?: string | null;
          readonly transition?: {
            readonly rolloverId: string;
            readonly awaitingBootstrapTurn: boolean;
          } | null;
        }
      ) => {
        runtimeLockUpdates.push({
          sessionId: sessionKey.sessionId,
          active: options.active,
          reason: options.reason ?? null,
          transitionRolloverId: options.transition?.rolloverId ?? null,
          awaitingBootstrapTurn:
            options.transition?.awaitingBootstrapTurn ?? false,
        });
      },
      notifySessionCreated: noop,
      notifyBindingChanged: noop,
      notifySessionDeleted: noop,
      notifyArtifactWritten: noop,
      recordHeartbeat: noop,
    } as never,
  });

  const api = handler as SessionRequestHandler & Record<string, unknown>;
  const testApi = internals(handler);
  Object.assign(testApi.continuity, {
    handleProviderEvent: async () => Promise.resolve(),
    ensureTrackedOnOutboundMessage: ({
      sessionId,
      providerSessionId,
    }: BindingUpdate) => {
      continuityTracked.push({ sessionId, providerSessionId });
      return Promise.resolve();
    },
    registerSession: noop,
    updateProviderSessionId: (sessionId: string, providerSessionId: string) => {
      continuityUpdates.push({ sessionId, providerSessionId });
    },
  });
  Object.assign(testApi.flowNodeContinuity, {
    isEligibleForRollover: () => true,
  });
  testApi.handleFlowNodeContinuityProviderEvent = async () => Promise.resolve();
  testApi.handleFlowNodeContinuitySilentPreemptiveRollover = async () => false;

  return {
    handler,
    api,
    sessionManager,
    providerSessions: testApi.providerSessions,
    providerRegistry,
    sessionStorage,
    events,
    promoted,
    continuityUpdates,
    continuityTracked,
    runtimeLockUpdates,
  };
};

export const createDescriptionSession = (
  harness: HandlerHarness,
  workspacePath: string,
  providerSessionId?: string,
  providerId = "claudeCodeCli"
) =>
  harness.sessionManager.createSession(
    providerId,
    workspacePath,
    providerSessionId,
    {
      initiativeSlug: "demo",
      stage: "description",
      runSlug: "reviewer",
    }
  );

export const stubDescriptionDialogSync = (harness: HandlerHarness): void => {
  Object.assign(internals(harness.handler).descriptionDialogSync, {
    resolveDescriptionDialog: async () => null,
    maybePromoteLegacyDescriptionDialogHistory: noop,
    maybeBackfillDescriptionDialogHistory: async () => Promise.resolve(),
    updateDescriptionSessionRef: async () => Promise.resolve(),
  });
};

export const setLifecycle = (
  harness: HandlerHarness,
  sessionId: string,
  mode: "resume_in_place" | "resume_via_rollover" | "no_resume"
): void => {
  internals(harness.handler).resumeLifecycle.sessionResumeLifecycleStates.set(
    sessionId,
    { mode, finalTurnCompleted: false, terminalLockReason: null }
  );
};

export const emitProviderEvent = (
  harness: HandlerHarness,
  sessionId: string,
  event: Record<string, unknown>
): void => {
  internals(harness.handler).providerEventRouter.handleProviderEvent(
    sessionId,
    event
  );
};

export const useProductionFlowNodeHandler = (harness: HandlerHarness): void => {
  const ta = internals(harness.handler).turnArbitration;
  internals(harness.handler).handleFlowNodeContinuityProviderEvent = async (
    sid: string,
    evt: unknown
  ) => {
    await ta.handleFlowNodeContinuityProviderEvent({
      sessionId: sid,
      event: evt,
      resolveLiveContinuityRemainingPercentThreshold: async (s: unknown) =>
        await ta.resolveLiveContinuityRemainingPercentThreshold(s),
    });
  };
};

export const registerBootstrapLock = (
  harness: HandlerHarness,
  sourceSessionId: string,
  targetSessionId: string,
  rolloverId: string
): void => {
  const lockService = internals(harness.handler).continuityLockService;
  lockService.registerFlowNodeContinuityLockContext({
    rolloverId,
    sourceSessionId,
    targetSessionId,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: true,
  });
  lockService.emitContinuityLockEvent({
    sessionId: targetSessionId,
    rolloverId,
    sourceSessionId,
    targetSessionId,
    stageId: "description",
    runSlug: "reviewer",
    state: "locked",
    reason: "resume_bootstrap",
  });
};

export const getHandlerSourceInvariantChecks = (source: string): boolean[] => [
  source.includes("shouldResetDescriptionCollectorArtifacts"),
  source.includes("collectorSession"),
  source.includes("description restart"),
  source.includes('trimmed === "diagram_modules"'),
  source.includes('trimmed === "diagram_facades"'),
  source.includes("private normalizeContinuityStageId"),
];

export const EXPECTED_HANDLER_SOURCE_INVARIANT_CHECKS = [
  false,
  false,
  false,
  false,
  false,
  false,
] as const;

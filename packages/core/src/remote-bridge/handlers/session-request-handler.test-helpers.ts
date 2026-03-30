import path from "node:path";
import type { CoreConfig } from "../../config";
import { SessionManager } from "../../session-manager";
import type { BridgeEvent } from "../types";
import {
  type ProviderSessionBinding,
  SessionRequestHandler,
} from "./session-request-handler";

export const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/handlers/session-request-handler.ts"
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
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  const mutableApi = api as any;
  Object.assign(mutableApi.continuity as Record<string, unknown>, {
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
  Object.assign(mutableApi.flowNodeContinuity as Record<string, unknown>, {
    isEligibleForRollover: () => true,
  });
  Object.assign(mutableApi, {
    handleFlowNodeContinuityProviderEvent: async () => Promise.resolve(),
    handleFlowNodeContinuitySilentPreemptiveRollover: async () => false,
  });

  return {
    handler,
    api,
    sessionManager,
    providerSessions: mutableApi.providerSessions as Map<
      string,
      ProviderSessionBinding
    >,
    providerRegistry,
    sessionStorage,
    events,
    promoted,
    continuityUpdates,
    continuityTracked,
    runtimeLockUpdates,
  };
};

export const collectTurnStateSequence = (
  events: readonly BridgeEvent[]
): string[] =>
  events
    .filter((event) => event.type === "session:stream")
    .map((event) => {
      const payload = event.payload as {
        readonly event?: {
          readonly data?: { readonly kind?: string; readonly state?: string };
        };
      };
      return payload.event?.data?.kind === "turn_state"
        ? (payload.event.data.state ?? null)
        : null;
    })
    .filter((state): state is string => typeof state === "string");

export const countIdleTurnStateEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: { readonly kind?: string; readonly state?: string };
      };
    };
    return (
      payload.event?.data?.kind === "turn_state" &&
      payload.event.data.state === "idle"
    );
  }).length;

export const countNoRolloverUnlockEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === "no_rollover_needed"
    );
  }).length;

export const countContextCheckPendingLockEvents = (
  events: readonly BridgeEvent[]
): number =>
  events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "locked" &&
      payload.event.data.reason === "context_check_pending"
    );
  }).length;

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
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  Object.assign((harness.api as any).descriptionDialogSync, {
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
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  const store = (harness.api as any).resumeLifecycle
    .sessionResumeLifecycleStates as Map<string, unknown>;
  store.set(sessionId, {
    mode,
    finalTurnCompleted: false,
    terminalLockReason: null,
  });
};

export const emitProviderEvent = (
  harness: HandlerHarness,
  sessionId: string,
  event: Record<string, unknown>
): void => {
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  (harness.api as any).providerEventRouter.handleProviderEvent(
    sessionId,
    event
  );
};

export const useProductionFlowNodeHandler = (harness: HandlerHarness): void => {
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  const ta = (harness.api as any).turnArbitration;
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  (harness.api as any).handleFlowNodeContinuityProviderEvent = async (
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
  // biome-ignore lint/suspicious/noExplicitAny: test harness monkey-patching
  const lockService = (harness.api as any).continuityLockService;
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

export const countContinuityUnlocks = (
  harness: HandlerHarness,
  reason: string
): number =>
  harness.events.filter((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: {
        readonly data?: {
          readonly kind?: string;
          readonly state?: string;
          readonly reason?: string;
        };
      };
    };
    return (
      payload.event?.data?.kind === "continuity_lock" &&
      payload.event.data.state === "unlocked" &&
      payload.event.data.reason === reason
    );
  }).length;

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

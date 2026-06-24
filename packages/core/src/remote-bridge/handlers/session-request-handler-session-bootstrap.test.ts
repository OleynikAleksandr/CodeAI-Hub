import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import { SessionManager } from "../../session-manager";
import type { BridgeEvent } from "../types";
import { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";

const noop = (): void => undefined;
const PROVIDER_CREATE_FAILURE_RE = /Failed to create codexCli session/u;

const createAdapter = (): ProviderAdapter =>
  ({
    closeSession: async () => undefined,
    createSession: () =>
      Promise.reject(new Error("Codex startup probe failed")),
    initialize: async () => undefined,
    sendMessage: async () => undefined,
    subscribe: () => () => undefined,
  }) as ProviderAdapter;

test("SessionRequestHandlerSessionBootstrap routes shell startup failures through provider recovery", async () => {
  const events: BridgeEvent[] = [];
  const failures: Array<{
    readonly providerId: string;
    readonly sessionId?: string;
    readonly message: string;
  }> = [];
  const sessionManager = new SessionManager();
  const bootstrap = new SessionRequestHandlerSessionBootstrap({
    appendDialogSegmentBoundaryMeta: async () => undefined,
    bindSessionModel: noop,
    broadcaster: (event: BridgeEvent) => {
      events.push(event);
    },
    broadcastSessionBinding: noop,
    continuity: {
      registerSession: noop,
      updateProviderSessionId: noop,
    },
    continuityRootBySessionId: new Map(),
    handleProviderEvent: noop,
    handleProviderFailure: (
      providerId: string,
      error: unknown,
      sessionId?: string
    ) => {
      failures.push({
        providerId,
        sessionId,
        message: error instanceof Error ? error.message : String(error),
      });
    },
    maybeBackfillDescriptionDialogHistory: async () => undefined,
    maybePromoteLegacyDescriptionDialogHistory: noop,
    providerSessions: new Map(),
    registerInitialSessionLifecycle: noop,
    resolveContinuityRootSessionId: async (options: {
      readonly sessionId: string;
    }) => options.sessionId,
    resolveDescriptionDialog: async () => null,
    resumeLifecycle: {
      registerInitialSessionLifecycle: noop,
    },
    sessionManager,
    sessionStorage: {
      register: noop,
    },
    updateDescriptionSessionRef: async () => undefined,
    updateProviderBinding: noop,
  } as unknown as ConstructorParameters<
    typeof SessionRequestHandlerSessionBootstrap
  >[0]);

  const session = await bootstrap.createAndRegisterSession({
    adapter: createAdapter(),
    context: {
      initiativeSlug: "demo",
      providerSessionId: null,
      runSlug: null,
      stage: "virtual_simulation",
    },
    providerId: "codexCli",
    workspacePath: "/tmp/codex-shell-failure",
  });

  assert.equal(session?.providerId, "codexCli");
  assert.equal(events[0]?.type, "session:created");
  assert.equal(failures.length, 1);
  assert.equal(failures[0]?.providerId, "codexCli");
  assert.equal(failures[0]?.sessionId, session?.id);
  assert.match(failures[0]?.message ?? "", PROVIDER_CREATE_FAILURE_RE);
});

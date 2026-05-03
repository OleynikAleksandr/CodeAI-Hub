import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityIndexEntry } from "../../session-continuity/index-registry";
import { SessionManager } from "../../session-manager";
import { materializeContinuityEntries } from "./session-continuity-materializer";
import type { SessionProviderBindingService } from "./session-provider-binding-service";

interface StubBinding {
  readonly providerId: string;
  providerSessionId: string;
  readonly unsubscribe: () => void;
}

const buildStubBindingService = (): {
  readonly providerSessions: Map<string, StubBinding>;
  readonly service: SessionProviderBindingService;
} => {
  const providerSessions = new Map<string, StubBinding>();
  const service = {
    registerRestoredBinding: (options: {
      readonly sessionId: string;
      readonly providerId: string;
      readonly providerSessionId: string;
    }): void => {
      if (providerSessions.has(options.sessionId)) {
        return;
      }
      providerSessions.set(options.sessionId, {
        providerId: options.providerId,
        providerSessionId: options.providerSessionId,
        unsubscribe: () => {
          // paper binding, nothing to tear down
        },
      });
    },
  } as unknown as SessionProviderBindingService;
  return { providerSessions, service };
};

const entry: ContinuityIndexEntry = {
  dialogId: "codex-abc-diagram-modules",
  latestSessionId: "abc-session-id",
  modelBinding: {
    key: "provider\u001fcodexCli\u001fsession\u001fcodex-abc-diagram-modules",
    providerId: "codexCli",
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "settings_default",
    boundAt: "2026-04-28T12:00:00.000Z",
    updatedAt: "2026-04-28T12:00:00.000Z",
  },
  providerId: "codexCli",
  providerSessionId: "019d-provider-session",
  rootSessionId: "codex-abc-diagram-modules",
  stage: "diagram_modules",
  updatedAt: new Date().toISOString(),
};
const workspaceSlug = "solidworks-workflow";

test("materializeContinuityEntries registers stub session + binding + hydrates workspace runtime", () => {
  const sessionManager = new SessionManager();
  const { providerSessions, service } = buildStubBindingService();
  const notified: { key: unknown; patch: unknown }[] = [];
  const workspaceRuntime = {
    notifySessionCreated: (key: unknown, patch: unknown) => {
      notified.push({ key, patch });
    },
  } as unknown as Parameters<
    typeof materializeContinuityEntries
  >[0]["deps"]["workspaceRuntime"];

  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [entry],
    workspaceRoot: "/tmp/ws",
    workspaceSlug,
  });

  const session = sessionManager.getSession("abc-session-id");
  assert.ok(session, "session must be registered");
  assert.equal(session.providerId, "codexCli");
  assert.equal(session.providerSessionId, "019d-provider-session");
  assert.equal(session.providerSessionStatus, "ready");
  assert.equal(session.stage, "diagram_modules");
  assert.equal(session.initiativeSlug, workspaceSlug);
  assert.equal(session.workspacePath, "/tmp/ws");
  assert.equal(
    session.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );

  const binding = providerSessions.get("abc-session-id");
  assert.ok(binding, "binding must be registered");
  assert.equal(binding.providerId, "codexCli");
  assert.equal(binding.providerSessionId, "019d-provider-session");

  assert.equal(notified.length, 1);
  assert.deepEqual(notified[0]?.key, {
    workspaceRoot: "/tmp/ws",
    nodeId: "diagram_modules",
    sessionId: "abc-session-id",
  });
  assert.deepEqual(notified[0]?.patch, {
    nodeId: "diagram_modules",
    providerId: "codexCli",
    providerSessionId: "019d-provider-session",
    bindingStatus: "ready",
  });
});

test("materializeContinuityEntries is idempotent on repeated dialog:list", () => {
  const sessionManager = new SessionManager();
  const { providerSessions, service } = buildStubBindingService();
  const notified: unknown[] = [];
  const workspaceRuntime = {
    notifySessionCreated: (_key: unknown, _patch: unknown) => {
      notified.push(null);
    },
  } as unknown as Parameters<
    typeof materializeContinuityEntries
  >[0]["deps"]["workspaceRuntime"];

  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [entry],
    workspaceRoot: "/tmp/ws",
    workspaceSlug,
  });
  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [entry],
    workspaceRoot: "/tmp/ws",
    workspaceSlug,
  });

  assert.equal(sessionManager.listSessions().length, 1);
  assert.equal(providerSessions.size, 1);
  assert.equal(
    notified.length,
    1,
    "second call must not re-hydrate workspace runtime for already-materialized session"
  );
});

test("materialized continuity session satisfies handleStop preconditions", () => {
  // SessionRequestHandlerStopAction.handleStop() returns "Session not found"
  // when sessionManager.getSession(sessionId) is undefined, and cannot reach
  // adapter.closeSession() without a binding in providerSessions. Before the
  // materializer, reopened continuity dialogs hit exactly this path because
  // the runtime session object was never created for stages other than the
  // lastActive one. After the materializer runs on dialog:list, both lookups
  // must succeed so Stop correctly invalidates the binding and emits
  // turn_state: "idle" back to PM.
  const sessionManager = new SessionManager();
  const { providerSessions, service } = buildStubBindingService();
  const workspaceRuntime = {
    notifySessionCreated: () => {
      // not exercised by this assertion
    },
  } as unknown as Parameters<
    typeof materializeContinuityEntries
  >[0]["deps"]["workspaceRuntime"];

  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [entry],
    workspaceRoot: "/tmp/ws",
    workspaceSlug,
  });

  // Guard 1 of handleStop: sessionManager.getSession(sessionId).
  const session = sessionManager.getSession("abc-session-id");
  assert.ok(
    session,
    "handleStop must NOT short-circuit as 'Session not found'"
  );

  // Guard 2 of handleStop: providerSessions.get(sessionId) resolves a binding
  // so adapter.closeSession(binding.providerSessionId) is reachable.
  const binding = providerSessions.get("abc-session-id");
  assert.ok(binding, "handleStop must find binding for adapter.closeSession");
  assert.equal(binding.providerSessionId, "019d-provider-session");
});

test("materializeContinuityEntries skips entries without latestSessionId or providerSessionId", () => {
  const sessionManager = new SessionManager();
  const { providerSessions, service } = buildStubBindingService();
  const notified: unknown[] = [];
  const workspaceRuntime = {
    notifySessionCreated: (_key: unknown, _patch: unknown) => {
      notified.push(null);
    },
  } as unknown as Parameters<
    typeof materializeContinuityEntries
  >[0]["deps"]["workspaceRuntime"];

  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [
      { ...entry, latestSessionId: null },
      { ...entry, providerSessionId: null },
      { ...entry, providerId: null },
    ],
    workspaceRoot: "/tmp/ws",
    workspaceSlug,
  });

  assert.equal(sessionManager.listSessions().length, 0);
  assert.equal(providerSessions.size, 0);
  assert.equal(notified.length, 0);
});

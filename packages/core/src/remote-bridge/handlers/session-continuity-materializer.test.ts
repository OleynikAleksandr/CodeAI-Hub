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
  providerId: "codexCli",
  providerSessionId: "019d-provider-session",
  rootSessionId: "codex-abc-diagram-modules",
  stage: "diagram_modules",
  updatedAt: new Date().toISOString(),
};

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
  });

  const session = sessionManager.getSession("abc-session-id");
  assert.ok(session, "session must be registered");
  assert.equal(session.providerId, "codexCli");
  assert.equal(session.providerSessionId, "019d-provider-session");
  assert.equal(session.providerSessionStatus, "ready");
  assert.equal(session.stage, "diagram_modules");
  assert.equal(session.workspacePath, "/tmp/ws");

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
  });
  materializeContinuityEntries({
    deps: {
      sessionManager,
      providerBindingService: service,
      workspaceRuntime,
    },
    entries: [entry],
    workspaceRoot: "/tmp/ws",
  });

  assert.equal(sessionManager.listSessions().length, 1);
  assert.equal(providerSessions.size, 1);
  assert.equal(
    notified.length,
    1,
    "second call must not re-hydrate workspace runtime for already-materialized session"
  );
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
  });

  assert.equal(sessionManager.listSessions().length, 0);
  assert.equal(providerSessions.size, 0);
  assert.equal(notified.length, 0);
});

import assert from "node:assert/strict";
import test from "node:test";
import { type Session, SessionManager } from "../../session-manager";
import { SessionShellFactory } from "./session-shell-factory";

const createFactory = (): SessionShellFactory =>
  new SessionShellFactory(
    {} as ConstructorParameters<typeof SessionShellFactory>[0]
  );

const createHarness = () => {
  const sessionManager = new SessionManager();
  const registerCalls: Array<{
    readonly options: unknown;
    readonly session: Session;
  }> = [];
  const promoteCalls: Array<readonly [string, string]> = [];
  const factory = new SessionShellFactory({
    appendDialogSegmentBoundaryMeta: async () => undefined,
    bindSessionModel: () => undefined,
    broadcaster: () => undefined,
    broadcastSessionBinding: () => undefined,
    continuity: {
      ensureTrackedOnOutboundMessage: async () => undefined,
      registerSession: () => undefined,
    },
    continuityRootBySessionId: new Map(),
    handleProviderEvent: () => undefined,
    maybeBackfillDescriptionDialogHistory: async () => undefined,
    maybePromoteLegacyDescriptionDialogHistory: () => undefined,
    notifyRuntimeSessionCreated: () => undefined,
    providerSessions: new Map(),
    registerInitialSessionLifecycle: () => undefined,
    resolveContinuityRootSessionId: async (options: {
      readonly sessionId: string;
    }) => `root-${options.sessionId}`,
    resolveDescriptionDialog: async () => null,
    sessionManager,
    sessionStorage: {
      promote: (sessionId: string, providerSessionId: string) => {
        promoteCalls.push([sessionId, providerSessionId]);
      },
      register: (session: Session, options: unknown) => {
        registerCalls.push({ session, options });
      },
    },
    updateDescriptionSessionRef: async () => undefined,
    updateProviderBinding: () => undefined,
  } as unknown as ConstructorParameters<typeof SessionShellFactory>[0]);
  return { factory, promoteCalls, registerCalls };
};

test("SessionShellFactory broadcasts early shell sessions for new workflow stages", () => {
  const factory = createFactory();

  assert.equal(
    factory.shouldBroadcastCreatedEarly({
      context: {
        initiativeSlug: "demo",
        providerSessionId: null,
        runSlug: null,
        stage: "virtual_simulation",
      },
    } as Parameters<SessionShellFactory["shouldBroadcastCreatedEarly"]>[0]),
    true
  );
});

test("SessionShellFactory does not create an early shell for explicit provider resumes", () => {
  const factory = createFactory();

  assert.equal(
    factory.shouldBroadcastCreatedEarly({
      context: {
        initiativeSlug: "demo",
        providerSessionId: "provider-session",
        runSlug: null,
        stage: "virtual_simulation",
      },
    } as Parameters<SessionShellFactory["shouldBroadcastCreatedEarly"]>[0]),
    false
  );
});

test("SessionShellFactory leaves standalone chat history unlocked and promotes it after binding", async () => {
  const harness = createHarness();
  const options = {
    adapter: { subscribe: () => () => undefined },
    context: {
      initiativeSlug: null,
      providerSessionId: null,
      runSlug: null,
      stage: null,
    },
    providerId: "codexCli",
    workspacePath: "/tmp/standalone-chat",
  } as unknown as Parameters<SessionShellFactory["createShellSession"]>[0];

  const shell = await harness.factory.createShellSession(options);
  await harness.factory.bindShellSession(
    options,
    shell,
    "provider-thread-1",
    true
  );

  assert.equal(harness.registerCalls[0]?.options, undefined);
  assert.deepEqual(harness.promoteCalls, [
    [shell.session.id, "provider-thread-1"],
  ]);
});

test("SessionShellFactory keeps workflow history locked to continuity root", async () => {
  const harness = createHarness();
  const shell = await harness.factory.createShellSession({
    adapter: { subscribe: () => () => undefined },
    context: {
      initiativeSlug: "demo",
      providerSessionId: null,
      runSlug: null,
      stage: "description",
    },
    providerId: "codexCli",
    workspacePath: "/tmp/workflow-chat",
  } as unknown as Parameters<SessionShellFactory["createShellSession"]>[0]);

  assert.deepEqual(harness.registerCalls[0]?.options, {
    historySessionId: `root-${shell.session.id}`,
  });
});

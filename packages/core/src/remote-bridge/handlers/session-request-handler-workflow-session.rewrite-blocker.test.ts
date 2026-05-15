import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import type { Session } from "../../session-manager";
import { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const createAdapter = (): ProviderAdapter => ({
  closeSession: () => Promise.resolve(),
  createSession: () => Promise.resolve("provider-session"),
  initialize: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  subscribe: () => () => true,
});

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

type CoreMessageCapture = Array<{
  readonly content: string;
  readonly sessionId: string;
}>;

const createManagedWorkflowDeps = (messages: CoreMessageCapture) => ({
  eventMessages: {
    appendCoreMessage: (
      sessionId: string,
      options: { readonly content: string }
    ) => {
      messages.push({ content: options.content, sessionId });
    },
  },
  sessionManager: new SessionManager(),
});

test("createSessionForWorkflow dispatches managed technical stages through managed workflow start policy", async () => {
  const stages = ["diagram_modules", "application_skeleton", "quality_gates"];
  for (const stage of stages) {
    const calls: string[] = [];
    const messages: CoreMessageCapture = [];
    const warnings: unknown[] = [];
    const runtimeSession = { id: `runtime-session:${stage}` } as Session;
    const service = new SessionRequestHandlerWorkflowSession({
      createAndRegisterSession: (options) => {
        calls.push(`create-session:${options.context.stage}`);
        assert.equal(options.providerId, "codexCli");
        assert.equal(options.workspacePath, "/tmp/workspace");
        return Promise.resolve(runtimeSession);
      },
      ...createManagedWorkflowDeps(messages),
      logger: createLogger(warnings),
      providerFailureRecovery: {
        handleProviderFailure: () => undefined,
      } as never,
      providerRegistry: {
        getAdapter: (providerId: string) => {
          calls.push(`get-adapter:${providerId}`);
          return createAdapter();
        },
      } as unknown as ProviderRegistry,
    });

    const session = await service.createSessionForWorkflow({
      providerId: "codexCli",
      workspacePath: "/tmp/workspace",
      context: {
        initiativeSlug: "demo-workspace",
        stage,
      },
    });

    assert.equal(session, runtimeSession);
    assert.deepEqual(calls, [
      "get-adapter:codexCli",
      `create-session:${stage}`,
    ]);
    assert.deepEqual(messages, []);
    assert.deepEqual(warnings, []);
  }
});

test("createSessionForWorkflow still creates sessions for provider-direct preliminary workflows", async () => {
  const calls: string[] = [];
  const messages: CoreMessageCapture = [];
  const warnings: unknown[] = [];
  const sessions = {
    description: { id: "description-session" } as Session,
    virtual_simulation: { id: "virtual-simulation-session" } as Session,
  };
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: (options) => {
      calls.push(`create-session:${options.context.stage}`);
      assert.equal(options.providerId, "codexCli");
      assert.equal(options.workspacePath, "/tmp/workspace");
      return Promise.resolve(
        sessions[options.context.stage as keyof typeof sessions]
      );
    },
    ...createManagedWorkflowDeps(messages),
    logger: createLogger(warnings),
    providerFailureRecovery: {
      handleProviderFailure: () => {
        calls.push("provider-failure");
      },
    } as never,
    providerRegistry: {
      getAdapter: (providerId: string) => {
        calls.push(`get-adapter:${providerId}`);
        return createAdapter();
      },
    } as unknown as ProviderRegistry,
  });

  const descriptionSession = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: { initiativeSlug: "demo-workspace", stage: "description" },
  });
  const virtualSimulationSession = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: { initiativeSlug: "demo-workspace", stage: "virtual_simulation" },
  });

  assert.equal(descriptionSession, sessions.description);
  assert.equal(virtualSimulationSession, sessions.virtual_simulation);
  assert.deepEqual(messages, []);
  assert.deepEqual(calls, [
    "get-adapter:codexCli",
    "create-session:description",
    "get-adapter:codexCli",
    "create-session:virtual_simulation",
  ]);
  assert.deepEqual(warnings, []);
});

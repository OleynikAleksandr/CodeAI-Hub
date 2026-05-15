import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import type { Session } from "../../session-manager";
import { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  SessionRequestHandlerWorkflowSession,
  TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
} from "./session-request-handler-workflow-session";

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

interface ManagedPreviewWarning {
  readonly code?: string;
  readonly controllerId?: string;
  readonly message?: string;
  readonly stage?: string;
  readonly workspaceRoot?: string;
}

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

test("createSessionForWorkflow fails closed before diagram modules provider session during technical-stage rewrite", async () => {
  const calls: string[] = [];
  const messages: CoreMessageCapture = [];
  const warnings: unknown[] = [];
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: () => {
      calls.push("create-session");
      return Promise.resolve({ id: "runtime-session" } as Session);
    },
    ...createManagedWorkflowDeps(messages),
    logger: createLogger(warnings),
    providerFailureRecovery: {
      handleProviderFailure: () => undefined,
    } as never,
    providerRegistry: {
      getAdapter: () => {
        calls.push("get-adapter");
        return createAdapter();
      },
    } as unknown as ProviderRegistry,
  });

  const session = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: {
      initiativeSlug: "demo-workspace",
      stage: "diagram_modules",
    },
  });

  assert.ok(session);
  assert.deepEqual(calls, []);
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.sessionId, session.id);
  const warning = warnings[0] as ManagedPreviewWarning;
  assert.equal(warning.code, TECHNICAL_STAGE_REWRITE_BLOCKER_CODE);
  assert.equal(warning.controllerId, "diagram_modules");
  assert.equal(warning.stage, "diagram_modules");
  assert.equal(warning.workspaceRoot, "/tmp/workspace");
  assert.equal(warning.message?.includes("Diagram Modules"), true);
});

test("createSessionForWorkflow fails closed before technical stage provider sessions during technical-stage rewrite", async () => {
  const stages = ["application_skeleton", "quality_gates"];
  for (const stage of stages) {
    const calls: string[] = [];
    const messages: CoreMessageCapture = [];
    const warnings: unknown[] = [];
    const service = new SessionRequestHandlerWorkflowSession({
      createAndRegisterSession: () => {
        calls.push("create-session");
        return Promise.resolve({ id: `runtime-session:${stage}` } as Session);
      },
      ...createManagedWorkflowDeps(messages),
      logger: createLogger(warnings),
      providerFailureRecovery: {
        handleProviderFailure: () => undefined,
      } as never,
      providerRegistry: {
        getAdapter: () => {
          calls.push("get-adapter");
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

    assert.ok(session);
    assert.deepEqual(calls, []);
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.sessionId, session.id);
    const warning = warnings[0] as ManagedPreviewWarning;
    assert.equal(warning.code, TECHNICAL_STAGE_REWRITE_BLOCKER_CODE);
    assert.equal(warning.controllerId, stage);
    assert.equal(warning.stage, stage);
    assert.equal(warning.workspaceRoot, "/tmp/workspace");
    assert.equal(typeof warning.message, "string");
  }
});

test("createSessionForWorkflow still creates sessions for non-technical stage workflows", async () => {
  const calls: string[] = [];
  const messages: CoreMessageCapture = [];
  const warnings: unknown[] = [];
  const expectedSession = { id: "runtime-session" } as Session;
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: (options) => {
      calls.push(`create-session:${options.context.stage}`);
      assert.equal(options.providerId, "codexCli");
      assert.equal(options.workspacePath, "/tmp/workspace");
      return Promise.resolve(expectedSession);
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

  const session = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: {
      initiativeSlug: "demo-workspace",
      stage: "description",
    },
  });

  assert.equal(session, expectedSession);
  assert.deepEqual(messages, []);
  assert.deepEqual(calls, [
    "get-adapter:codexCli",
    "create-session:description",
  ]);
  assert.deepEqual(warnings, []);
});

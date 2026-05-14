import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
  SessionRequestHandlerWorkflowSession,
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

test("createSessionForWorkflow fails closed before diagram modules provider session during managed rewrite", async () => {
  const calls: string[] = [];
  const warnings: unknown[] = [];
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: () => {
      calls.push("create-session");
      return Promise.resolve({ id: "runtime-session" } as Session);
    },
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

  assert.equal(session, null);
  assert.deepEqual(calls, []);
  assert.deepEqual(warnings, [
    {
      code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
      stage: "diagram_modules",
      workspaceRoot: "/tmp/workspace",
    },
  ]);
});

test("createSessionForWorkflow fails closed before technical stage provider sessions during managed rewrite", async () => {
  const stages = ["application_skeleton", "quality_gates"];
  for (const stage of stages) {
    const calls: string[] = [];
    const warnings: unknown[] = [];
    const service = new SessionRequestHandlerWorkflowSession({
      createAndRegisterSession: () => {
        calls.push("create-session");
        return Promise.resolve({ id: `runtime-session:${stage}` } as Session);
      },
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

    assert.equal(session, null);
    assert.deepEqual(calls, []);
    assert.deepEqual(warnings, [
      {
        code: MANAGED_WORKFLOW_REWRITE_BLOCKER_CODE,
        stage,
        workspaceRoot: "/tmp/workspace",
      },
    ]);
  }
});

test("createSessionForWorkflow still creates sessions for non-managed workflow stages", async () => {
  const calls: string[] = [];
  const warnings: unknown[] = [];
  const expectedSession = { id: "runtime-session" } as Session;
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: (options) => {
      calls.push(`create-session:${options.context.stage}`);
      assert.equal(options.providerId, "codexCli");
      assert.equal(options.workspacePath, "/tmp/workspace");
      return Promise.resolve(expectedSession);
    },
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
  assert.deepEqual(calls, [
    "get-adapter:codexCli",
    "create-session:description",
  ]);
  assert.deepEqual(warnings, []);
});

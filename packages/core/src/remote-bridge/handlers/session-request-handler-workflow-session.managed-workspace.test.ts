import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const createAdapter = (): ProviderAdapter => ({
  closeSession: () => Promise.resolve(),
  createSession: () => Promise.resolve("provider-session"),
  initialize: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  subscribe: () => () => true,
});

const createLogger = (): Logger =>
  ({
    warn: () => undefined,
  }) as unknown as Logger;

test("createSessionForWorkflow prepares managed workspace before diagram modules provider session", async () => {
  const calls: string[] = [];
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: () => {
      calls.push("create-session");
      return Promise.resolve({ id: "runtime-session" } as Session);
    },
    logger: createLogger(),
    managedWorkspaceLifecycle: {
      ensureReady: (workspaceRoot) => {
        calls.push(`managed:${workspaceRoot}`);
        return Promise.resolve({ ok: true, issues: [], workspaceRoot });
      },
    },
    providerFailureRecovery: {
      handleProviderFailure: () => undefined,
    } as never,
    providerRegistry: {
      getAdapter: () => createAdapter(),
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

  assert.equal(session?.id, "runtime-session");
  assert.deepEqual(calls, ["managed:/tmp/workspace", "create-session"]);
});

test("createSessionForWorkflow blocks diagram modules when managed workspace validation fails", async () => {
  let createCalled = false;
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: () => {
      createCalled = true;
      return Promise.resolve({ id: "runtime-session" } as Session);
    },
    logger: createLogger(),
    managedWorkspaceLifecycle: {
      ensureReady: (workspaceRoot) =>
        Promise.resolve({
          ok: false,
          workspaceRoot,
          issues: [
            {
              code: "missing_file",
              message: "Missing file",
              relativePath: "doc/TODO/todo-plan.md",
            },
          ],
        }),
    },
    providerFailureRecovery: {
      handleProviderFailure: () => undefined,
    } as never,
    providerRegistry: {
      getAdapter: () => createAdapter(),
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
  assert.equal(createCalled, false);
});

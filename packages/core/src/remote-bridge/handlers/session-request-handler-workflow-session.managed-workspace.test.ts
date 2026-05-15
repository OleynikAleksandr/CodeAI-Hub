import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

test("managed technical stage starts route through managed dispatch without preview boundary", async () => {
  const calls: string[] = [];
  const coreMessages: Array<{
    readonly content: string;
    readonly sessionId: string;
  }> = [];
  const warnings: unknown[] = [];
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: (options) => {
      calls.push(`create-session:${options.context.stage}`);
      return Promise.resolve({ id: "runtime-session" } as Session);
    },
    eventMessages: {
      appendCoreMessage: (sessionId, options) => {
        coreMessages.push({ content: options.content, sessionId });
      },
    },
    logger: createLogger(warnings),
    providerFailureRecovery: {
      handleProviderFailure: () => undefined,
    } as never,
    providerRegistry: {
      getAdapter: (providerId: string) => {
        calls.push(`get-adapter:${providerId}`);
        return {} as never;
      },
    } as unknown as ProviderRegistry,
    sessionManager: new SessionManager(),
  });

  const session = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: {
      initiativeSlug: "demo-workspace",
      stage: "quality_gates",
    },
  });

  assert.ok(session);
  assert.deepEqual(calls, [
    "get-adapter:codexCli",
    "create-session:quality_gates",
  ]);
  assert.deepEqual(coreMessages, []);
  assert.deepEqual(warnings, []);
});

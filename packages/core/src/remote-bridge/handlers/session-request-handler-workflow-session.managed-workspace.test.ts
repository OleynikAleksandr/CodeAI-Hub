import assert from "node:assert/strict";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

test("managed technical stage starts route through orchestration facade preview boundary", async () => {
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
        return null;
      },
    } as unknown as ProviderRegistry,
  });

  const session = await service.createSessionForWorkflow({
    providerId: "codexCli",
    workspacePath: "/tmp/workspace",
    context: {
      initiativeSlug: "demo-workspace",
      stage: "quality_gates",
    },
  });

  assert.equal(session, null);
  assert.deepEqual(calls, []);
  assert.equal(
    (warnings[0] as { readonly code?: string }).code,
    "managed_workflow_preview_boundary"
  );
  assert.equal(
    (warnings[0] as { readonly controllerId?: string }).controllerId,
    "quality_gates"
  );
});

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const ACTIVE_DIAGRAM_MODULES_RE = /"activeStage": "diagram_modules"/u;
const DIAGRAM_MODULES_INDEX_TASK_RE = /diagram-modules\.phase1\.index\.task1/u;
const MANAGED_WORKSPACE_PLAN_RE = /Managed workspace plan/u;

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

test("Diagram Modules managed start creates workspace scaffold before provider dispatch", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-diagram-scaffold-")
  );
  const calls: string[] = [];
  const service = new SessionRequestHandlerWorkflowSession({
    createAndRegisterSession: (options) => {
      calls.push(`create-session:${options.context.stage}`);
      return Promise.resolve({ id: "diagram-session" } as Session);
    },
    eventMessages: {
      appendCoreMessage: () => undefined,
    },
    logger: createLogger(),
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

  try {
    const session = await service.createSessionForWorkflow({
      providerId: "codexCli",
      workspacePath,
      context: {
        initiativeSlug: "demo-workspace",
        stage: "diagram_modules",
      },
    });

    assert.ok(session);
    assert.deepEqual(calls, [
      "get-adapter:codexCli",
      "create-session:diagram_modules",
    ]);
    const workspacePlan = await readFile(
      path.join(workspacePath, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    const diagramPlan = await readFile(
      path.join(workspacePath, "doc/TODO/stages/diagram-modules/todo-plan.md"),
      "utf8"
    );
    const planScript = await readFile(
      path.join(workspacePath, "scripts/plan-orchestrator/plan-cli.mjs"),
      "utf8"
    );
    const packageJson = JSON.parse(
      await readFile(path.join(workspacePath, "package.json"), "utf8")
    ) as { readonly scripts?: Record<string, string> };

    assert.match(workspacePlan, ACTIVE_DIAGRAM_MODULES_RE);
    assert.match(diagramPlan, DIAGRAM_MODULES_INDEX_TASK_RE);
    assert.match(planScript, MANAGED_WORKSPACE_PLAN_RE);
    assert.equal(
      packageJson.scripts?.["plan:validate"],
      "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
    );
    await readFile(path.join(workspacePath, ".husky/pre-commit"), "utf8");
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

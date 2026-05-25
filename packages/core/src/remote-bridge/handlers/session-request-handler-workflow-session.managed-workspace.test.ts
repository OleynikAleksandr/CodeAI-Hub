import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ProviderRegistry } from "../../provider-registry";
import type { Session } from "../../session-manager";
import { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import type { SessionRequestHandlerSessionBootstrap } from "./session-request-handler-session-bootstrap";
import { SessionRequestHandlerSessionResolution } from "./session-request-handler-session-resolution";
import { SessionRequestHandlerWorkflowSession } from "./session-request-handler-workflow-session";

const execFileAsync = promisify(execFile);

type CreateAndRegisterSessionArgs = Parameters<
  SessionRequestHandlerSessionBootstrap["createAndRegisterSession"]
>[0];
type ResolveRunBoundProviderContextArgs = Parameters<
  SessionRequestHandlerSessionBootstrap["resolveRunBoundProviderContext"]
>[0];

const ACTIVE_DIAGRAM_MODULES_RE = /"activeStage": "diagram_modules"/u;
const ACTIVE_APPLICATION_SKELETON_RE = /"activeStage": "application_skeleton"/u;
const APPLICATION_SKELETON_DRAFT_TASK_RE =
  /"currentTaskId": "application-skeleton\.phase1\.draft\.task1"/u;
const APPLICATION_SKELETON_DRAFT_COMMIT_RE =
  /"expectedCommitMessage": "docs: draft application skeleton contract"/u;
const DIAGRAM_MODULES_INDEX_TASK_RE = /diagram-modules\.phase1\.index\.task1/u;
const INPUT_CHECKPOINT_SUBJECT_RE = /docs: checkpoint managed workflow inputs/u;
const INPUT_CHECKPOINT_DONE_RE =
  /\[DONE\] Git Commit: `docs: checkpoint managed workflow inputs` \(hash: [0-9a-f]{7,}\)/u;
const LEDGER_SUBJECT_RE = /chore: advance managed workflow ledger/u;
const MANAGED_WORKSPACE_PLAN_RE = /Managed workspace plan/u;
const MAC_METADATA_RE = /\.DS_Store/u;

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

const assertMissing = async (targetPath: string): Promise<void> => {
  await assert.rejects(access(targetPath));
};

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
    workflowBoundaryFacade: {
      ensureBoundary: (params) => {
        calls.push(`boundary:${params.stage}`);
        return Promise.resolve({
          boundaryHash: "abc123",
          created: true,
          registryPath: "/tmp/boundaries.json",
          stage: params.stage,
        });
      },
    },
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
    "boundary:quality_gates",
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
    workflowBoundaryFacade: {
      ensureBoundary: async (params) => {
        calls.push(`boundary:${params.stage}`);
        await assertMissing(path.join(workspacePath, "doc", "TODO"));
        await assertMissing(path.join(workspacePath, ".husky"));
        await assertMissing(path.join(workspacePath, "package.json"));
        await assertMissing(path.join(workspacePath, "scripts"));
        return {
          boundaryHash: "abc123",
          created: true,
          registryPath: path.join(workspacePath, "boundaries.json"),
          stage: params.stage,
        };
      },
    },
  });

  try {
    await writeFile(path.join(workspacePath, ".DS_Store"), "mac\n", "utf8");
    await mkdir(path.join(workspacePath, ".codeai-hub"), { recursive: true });
    await writeFile(
      path.join(workspacePath, ".codeai-hub/.DS_Store"),
      "mac\n",
      "utf8"
    );
    await mkdir(
      path.join(workspacePath, ".codeai-hub/demo-workspace/description"),
      { recursive: true }
    );
    await writeFile(
      path.join(
        workspacePath,
        ".codeai-hub/demo-workspace/description/.DS_Store"
      ),
      "mac\n",
      "utf8"
    );

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
      "boundary:diagram_modules",
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
    assert.match(diagramPlan, INPUT_CHECKPOINT_DONE_RE);
    assert.match(planScript, MANAGED_WORKSPACE_PLAN_RE);
    assert.equal(
      packageJson.scripts?.["plan:validate"],
      "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
    );
    await readFile(path.join(workspacePath, ".husky/pre-commit"), "utf8");
    const { stdout: status } = await execFileAsync(
      "git",
      ["status", "--short"],
      { cwd: workspacePath }
    );
    const { stdout: subjects } = await execFileAsync(
      "git",
      ["log", "--format=%s"],
      { cwd: workspacePath }
    );
    const { stdout: tracked } = await execFileAsync("git", ["ls-files"], {
      cwd: workspacePath,
    });
    assert.equal(status.trim(), "");
    assert.doesNotMatch(tracked, MAC_METADATA_RE);
    assert.match(subjects, INPUT_CHECKPOINT_SUBJECT_RE);
    assert.match(subjects, LEDGER_SUBJECT_RE);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("Project Manager-created Application Skeleton sessions open draft before provider dispatch", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-application-skeleton-pm-start-")
  );
  const calls: string[] = [];
  const failures: unknown[] = [];
  const sessionManager = new SessionManager();
  const service = new SessionRequestHandlerSessionResolution({
    broadcaster: () => undefined,
    broadcastSessionBinding: () => undefined,
    getDefaultProviderId: () => "codexCli",
    handleMessage: async () => undefined,
    handleProviderFailure: (_providerId, error) => {
      failures.push(error);
    },
    logger: createLogger(),
    providerRegistry: {
      getAdapter: (providerId: string) => {
        calls.push(`get-adapter:${providerId}`);
        return {} as never;
      },
    } as unknown as ProviderRegistry,
    sessionBootstrap: {
      createAndRegisterSession: async (
        options: CreateAndRegisterSessionArgs
      ) => {
        const applicationPlan = await readFile(
          path.join(
            workspacePath,
            "doc/TODO/stages/application-skeleton/todo-plan.md"
          ),
          "utf8"
        );
        assert.match(applicationPlan, APPLICATION_SKELETON_DRAFT_TASK_RE);
        assert.match(applicationPlan, APPLICATION_SKELETON_DRAFT_COMMIT_RE);
        calls.push(`create-session:${options.context.stage}`);
        return { id: "application-skeleton-session" } as Session;
      },
      resolveRunBoundProviderContext: (
        options: ResolveRunBoundProviderContextArgs
      ) => ({
        providerId: options.providerId,
        providerSessionId: options.requestedProviderSessionId,
      }),
    } as unknown as SessionRequestHandlerSessionBootstrap,
    sessionManager,
    workflowBoundaryFacade: {
      ensureBoundary: (params) => {
        calls.push(`boundary:${params.stage}`);
        return Promise.resolve({
          boundaryHash: "abc123",
          created: true,
          registryPath: path.join(workspacePath, "boundaries.json"),
          stage: params.stage,
        });
      },
    },
  });

  try {
    await service.handleCreate("codexCli", workspacePath, {
      initiativeSlug: "demo-workspace",
      stage: "application_skeleton",
    });

    assert.deepEqual(failures, []);
    assert.deepEqual(calls, [
      "boundary:application_skeleton",
      "get-adapter:codexCli",
      "create-session:application_skeleton",
    ]);
    const workspacePlan = await readFile(
      path.join(workspacePath, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    assert.match(workspacePlan, ACTIVE_APPLICATION_SKELETON_RE);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

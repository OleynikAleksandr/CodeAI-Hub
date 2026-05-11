import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { ProviderRegistry } from "../../provider-registry";
import type { ProviderAdapter } from "../../provider-registry/provider-module-loader.types";
import type { Session } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import {
  DefaultManagedWorkspaceLifecycle,
  SessionRequestHandlerWorkflowSession,
} from "./session-request-handler-workflow-session";

const execFileAsync = promisify(execFile);
const DIAGRAM_MODULES_PLAN_COMMIT_RE =
  /docs: update diagram modules product part index/u;
const APPLICATION_SKELETON_PLAN_RE =
  /doc\/TODO\/stages\/application-skeleton\/todo-plan\.md/u;
const APPLICATION_SKELETON_DRAFT_COMMIT_RE =
  /docs: draft application skeleton contract/u;
const APPLICATION_SKELETON_STAGE_RE = /"activeStage": "application_skeleton"/u;
const APPLICATION_SKELETON_INITIAL_TASK_RE =
  /"currentTaskId": "application-skeleton\.phase1\.draft\.task1"/u;
const APPLICATION_SKELETON_INITIAL_COMMIT_RE =
  /"expectedCommitMessage": "docs: draft application skeleton contract"/u;
const APPLICATION_SKELETON_PHASE1_TASK_RE =
  /application-skeleton\.phase1\.draft\.task1/u;
const APPLICATION_SKELETON_PHASE_BOOTSTRAP_RE =
  /## Phase 1 — Application Skeleton Contract Bootstrap/u;
const APPLICATION_SKELETON_PHASE1_HEADING_RE =
  /### Stream: Core-Gated Initial Draft/u;
const HANDOFF_COMMIT_RE = /chore: switch managed workspace stage/u;
const LIFECYCLE_UPGRADE_COMMIT_RE =
  /chore: update managed workspace lifecycle/u;
const APPLICATION_SKELETON_SHIM_MUTATOR_RE =
  /insertApplicationSkeletonReviewTaskPair/u;

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

test("createSessionForWorkflow prepares managed workspace before technical stage provider sessions", async () => {
  const stages = ["application_skeleton", "quality_gates"];
  for (const stage of stages) {
    const calls: string[] = [];
    const service = new SessionRequestHandlerWorkflowSession({
      createAndRegisterSession: () => {
        calls.push("create-session");
        return Promise.resolve({ id: `runtime-session:${stage}` } as Session);
      },
      logger: createLogger(),
      managedWorkspaceLifecycle: {
        ensureReady: (workspaceRoot) => {
          calls.push(`managed:${workspaceRoot}:${stage}`);
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
        stage,
      },
    });

    assert.equal(session?.id, `runtime-session:${stage}`);
    assert.deepEqual(calls, [
      `managed:/tmp/workspace:${stage}`,
      "create-session",
    ]);
  }
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
              relativePath: "doc/TODO/stages/diagram-modules/todo-plan.md",
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

test("default managed lifecycle creates an adoption commit before diagram modules work", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-managed-adoption-")
  );
  const descriptionPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "description",
    "Final_Description.md"
  );
  const simulationPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "virtual_simulation",
    "virtual-simulation.md"
  );
  const continuityPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "continuity",
    "index.json"
  );
  const workflowStatePath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "demo-workspace",
    "workflow",
    "state.json"
  );

  try {
    await mkdir(path.dirname(descriptionPath), { recursive: true });
    await mkdir(path.dirname(simulationPath), { recursive: true });
    await mkdir(path.dirname(continuityPath), { recursive: true });
    await mkdir(path.dirname(workflowStatePath), { recursive: true });
    await writeFile(descriptionPath, "# Description\n", "utf8");
    await writeFile(simulationPath, "# Simulation\n", "utf8");
    await writeFile(continuityPath, "{}\n", "utf8");
    await writeFile(workflowStatePath, "{}\n", "utf8");

    const result = await new DefaultManagedWorkspaceLifecycle().ensureReady(
      workspaceRoot,
      "diagram_modules"
    );

    assert.equal(result.ok, true);
    assert.equal(
      await git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: initialize managed workflow baseline"
    );
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");

    const trackedFiles = new Set(
      (await git(workspaceRoot, ["ls-files"])).split("\n").filter(Boolean)
    );
    assert.equal(trackedFiles.has(".gitignore"), true);
    assert.equal(trackedFiles.has(".husky/pre-commit"), true);
    assert.equal(trackedFiles.has("doc/TODO/todo-plan.md"), false);
    assert.equal(trackedFiles.has("doc/TODO/workspace.plan.md"), true);
    assert.equal(
      trackedFiles.has("doc/TODO/stages/diagram-modules/todo-plan.md"),
      true
    );
    assert.equal(trackedFiles.has(".codeai-hub/workflow/index.json"), true);
    assert.equal(
      trackedFiles.has(
        ".codeai-hub/demo-workspace/description/Final_Description.md"
      ),
      true
    );
    assert.equal(
      trackedFiles.has(
        ".codeai-hub/demo-workspace/virtual_simulation/virtual-simulation.md"
      ),
      true
    );
    assert.equal(
      trackedFiles.has(".codeai-hub/demo-workspace/continuity/index.json"),
      false
    );
    assert.equal(
      trackedFiles.has(".codeai-hub/demo-workspace/workflow/state.json"),
      false
    );
    assert.match(
      await readFile(
        path.join(
          workspaceRoot,
          "doc/TODO/stages/diagram-modules/todo-plan.md"
        ),
        "utf8"
      ),
      DIAGRAM_MODULES_PLAN_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("default managed lifecycle switches active stage before technical work", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-managed-handoff-")
  );
  try {
    await new DefaultManagedWorkspaceLifecycle().ensureReady(
      workspaceRoot,
      "diagram_modules"
    );

    const result = await new DefaultManagedWorkspaceLifecycle().ensureReady(
      workspaceRoot,
      "application_skeleton"
    );

    assert.equal(result.ok, true);
    assert.equal(
      await git(workspaceRoot, ["log", "-1", "--pretty=%s"]),
      "chore: switch managed workspace stage"
    );
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      APPLICATION_SKELETON_STAGE_RE
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      APPLICATION_SKELETON_PLAN_RE
    );
    const applicationSkeletonPlanText = await readFile(
      path.join(
        workspaceRoot,
        "doc/TODO/stages/application-skeleton/todo-plan.md"
      ),
      "utf8"
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_DRAFT_COMMIT_RE
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_INITIAL_TASK_RE
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_INITIAL_COMMIT_RE
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_PHASE1_TASK_RE
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_PHASE_BOOTSTRAP_RE
    );
    assert.match(
      applicationSkeletonPlanText,
      APPLICATION_SKELETON_PHASE1_HEADING_RE
    );
    assert.match(
      await git(workspaceRoot, ["log", "--pretty=%s", "-2"]),
      HANDOFF_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("default managed lifecycle commits installed shim upgrades before technical stage work", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-managed-lifecycle-upgrade-")
  );
  try {
    await new DefaultManagedWorkspaceLifecycle().ensureReady(
      workspaceRoot,
      "diagram_modules"
    );
    const planCliPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    await writeFile(
      planCliPath,
      "#!/usr/bin/env node\nconsole.log('old managed lifecycle');\n",
      "utf8"
    );
    await execFileAsync(
      "git",
      ["add", "--", "scripts/plan-orchestrator/plan-cli.mjs"],
      { cwd: workspaceRoot }
    );
    await execFileAsync(
      "git",
      [
        "-c",
        "core.hooksPath=",
        "-c",
        "user.name=CodeAI Hub Test",
        "-c",
        "user.email=codeai-hub-test@example.local",
        "commit",
        "-m",
        "test: simulate old managed lifecycle",
      ],
      { cwd: workspaceRoot }
    );

    const result = await new DefaultManagedWorkspaceLifecycle().ensureReady(
      workspaceRoot,
      "application_skeleton"
    );

    assert.equal(result.ok, true);
    assert.equal(await git(workspaceRoot, ["status", "--short"]), "");
    const recentSubjects = await git(workspaceRoot, [
      "log",
      "--pretty=%s",
      "-3",
    ]);
    assert.match(recentSubjects, HANDOFF_COMMIT_RE);
    assert.match(recentSubjects, LIFECYCLE_UPGRADE_COMMIT_RE);
    assert.match(
      await readFile(planCliPath, "utf8"),
      APPLICATION_SKELETON_SHIM_MUTATOR_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout.trim();
};

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
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const execFileAsync = promisify(execFile);
const DIAGRAM_MODULES_EXPECTED_COMMIT_RE =
  /docs: update diagram modules artifacts/u;
const APPLICATION_SKELETON_EXPECTED_COMMIT_RE =
  /feat: materialize application skeleton/u;
const ROOT_TODO_PLAN_PATH = path.join("doc", "TODO", "todo-plan.md");
const WORKSPACE_PLAN_PATH = path.join("doc", "TODO", "workspace.plan.md");
const DIAGRAM_MODULES_STAGE_PLAN_PATH = path.join(
  "doc",
  "TODO",
  "stages",
  "diagram-modules",
  "todo-plan.md"
);
const APPLICATION_SKELETON_STAGE_PLAN_PATH = path.join(
  "doc",
  "TODO",
  "stages",
  "application-skeleton",
  "todo-plan.md"
);
const DIAGRAM_MODULES_ACTIVE_PLAN_PATH_RE =
  /"activePlanPath": "doc\/TODO\/stages\/diagram-modules\/todo-plan\.md"/u;
const APPLICATION_SKELETON_ACTIVE_PLAN_PATH_RE =
  /"activePlanPath": "doc\/TODO\/stages\/application-skeleton\/todo-plan\.md"/u;

const assertDirectoryExists = async (directoryPath: string): Promise<void> => {
  await access(directoryPath);
};

test("session:create prepares diagram modules lifecycle baseline before provider session", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-stage-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  const expectedRoot = path.join(workspacePath, ".codeai-hub", workspaceSlug);
  const descriptionPath = path.join(
    expectedRoot,
    "description",
    "Final_Description.md"
  );

  try {
    await mkdir(path.dirname(descriptionPath), { recursive: true });
    await writeFile(descriptionPath, "# Accepted description\n", "utf8");

    let handleCreateCalled = false;
    const sessionHandler = {
      async handleCreate(
        _providerId: string | undefined,
        _workspacePath: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(context?.stage, "diagram_modules");
        await assertDirectoryExists(path.join(expectedRoot, "diagram_modules"));
        await assertDirectoryExists(
          path.join(expectedRoot, "diagram_modules", "product-parts")
        );
        assert.equal(
          await git(workspacePath, ["log", "-1", "--pretty=%s"]),
          "chore: initialize managed workflow baseline"
        );
        assert.equal(await git(workspacePath, ["status", "--short"]), "");
        assert.equal(
          await git(workspacePath, [
            "ls-files",
            ".codeai-hub/demo-workspace/description/Final_Description.md",
          ]),
          ".codeai-hub/demo-workspace/description/Final_Description.md"
        );
        assert.match(
          await readFile(
            path.join(workspacePath, DIAGRAM_MODULES_STAGE_PLAN_PATH),
            "utf8"
          ),
          DIAGRAM_MODULES_EXPECTED_COMMIT_RE
        );
        assert.match(
          await readFile(path.join(workspacePath, WORKSPACE_PLAN_PATH), "utf8"),
          DIAGRAM_MODULES_ACTIVE_PLAN_PATH_RE
        );
        await assert.rejects(
          access(path.join(workspacePath, ROOT_TODO_PLAN_PATH))
        );
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const workflowRuntime = {
      connectWorkspace: () => Promise.resolve(),
    } as unknown as WorkflowRuntime;
    const logger = {
      warn(): void {
        return;
      },
    } as unknown as Logger;

    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger,
      sessionHandler,
      workflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        stage: "diagram_modules",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("session:create bootstraps managed workspace before application skeleton session", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-managed-session-create-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    let handleCreateCalled = false;
    const sessionHandler = {
      async handleCreate(
        _providerId: string | undefined,
        _workspacePath: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(context?.stage, "application_skeleton");
        await assertDirectoryExists(path.join(workspacePath, ".git"));
        await assertDirectoryExists(
          path.join(workspacePath, ".codeai-hub", "workflow")
        );
        await access(path.join(workspacePath, ".husky", "pre-commit"));
        await access(path.join(workspacePath, WORKSPACE_PLAN_PATH));
        await access(
          path.join(workspacePath, APPLICATION_SKELETON_STAGE_PLAN_PATH)
        );
        await assert.rejects(
          access(path.join(workspacePath, ROOT_TODO_PLAN_PATH))
        );
        assert.equal(
          (
            await readFile(
              path.join(workspacePath, APPLICATION_SKELETON_STAGE_PLAN_PATH),
              "utf8"
            )
          ).includes("feat: materialize application skeleton"),
          true
        );
        assert.equal(
          await git(workspacePath, ["log", "-1", "--pretty=%s"]),
          "chore: initialize managed workflow baseline"
        );
        assert.equal(await git(workspacePath, ["status", "--short"]), "");
        assert.match(
          await readFile(
            path.join(workspacePath, APPLICATION_SKELETON_STAGE_PLAN_PATH),
            "utf8"
          ),
          APPLICATION_SKELETON_EXPECTED_COMMIT_RE
        );
        assert.match(
          await readFile(path.join(workspacePath, WORKSPACE_PLAN_PATH), "utf8"),
          APPLICATION_SKELETON_ACTIVE_PLAN_PATH_RE
        );
        await access(
          path.join(
            workspacePath,
            "scripts",
            "plan-orchestrator",
            "plan-cli.mjs"
          )
        );
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const workflowRuntime = {
      connectWorkspace: () => Promise.resolve(),
    } as unknown as WorkflowRuntime;
    const logger = {
      warn(): void {
        return;
      },
    } as unknown as Logger;

    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger,
      sessionHandler,
      workflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        stage: "application_skeleton",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], { cwd });
  return stdout.trim();
};

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { handleManagedContextBundleRead } from "./managed-context-bundle-http-handler";

const ACTIVE_STAGE_RE = /"activeStage": "diagram_modules"/u;
const PLAN_STATUS_ACTIVE_STAGE_RE = /activeStage: "diagram_modules"/u;
const WORKSPACE_PLAN_TEXT = `# Managed Workspace Plan

<!-- codeai-workspace-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-workspace-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "activeStage": "diagram_modules",
  "activePlanPath": "doc/TODO/stages/diagram-modules/todo-plan.md",
  "stagePlans": {
    "diagram_modules": "doc/TODO/stages/diagram-modules/todo-plan.md",
    "application_skeleton": "doc/TODO/stages/application-skeleton/todo-plan.md",
    "quality_gates": "doc/TODO/stages/quality-gates/todo-plan.md"
  },
  "lastAcceptedCommitHash": null,
  "lastAcceptedCommitMessage": null,
  "acceptedCommits": [],
  "blockers": []
}
\`\`\`
<!-- codeai-workspace-plan-state:end -->
`;
const STAGE_PLAN_TEXT = `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-diagram-modules",
  "currentTaskId": "diagram-modules.stream1.task1",
  "expectedCommitMessage": "docs: update diagram modules product part index",
  "lastRecordedCommit": "TBD",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->
`;

interface MockResponseState {
  body: unknown;
  statusCode: number;
}

const buildMockResponse = (state: MockResponseState): Response =>
  ({
    status: (code: number) => {
      state.statusCode = code;
      return {
        json: (payload: unknown) => {
          state.body = payload;
        },
      };
    },
    json: (payload: unknown) => {
      state.body = payload;
    },
  }) as unknown as Response;

const seedManagedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await mkdir(path.join(workspaceRoot, "doc/TODO"), { recursive: true });
  await mkdir(path.join(workspaceRoot, "doc/TODO/stages/diagram-modules"), {
    recursive: true,
  });
  await writeFile(
    path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
    WORKSPACE_PLAN_TEXT,
    "utf8"
  );
  await writeFile(
    path.join(workspaceRoot, "doc/TODO/stages/diagram-modules/todo-plan.md"),
    STAGE_PLAN_TEXT,
    "utf8"
  );
};

test("managed context bundle endpoint returns assembled bundle with live activeStage", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-context-bundle-handler-")
  );
  try {
    await seedManagedWorkspace(workspaceRoot);
    const req = {
      query: {
        stage: "diagram_modules",
        workspacePath: workspaceRoot,
        workspaceSlug: "demo",
        providerId: "codexCli",
      },
    } as unknown as Request;
    const state: MockResponseState = { statusCode: 200, body: null };
    const res = buildMockResponse(state);

    await handleManagedContextBundleRead(req, res);

    assert.equal(state.statusCode, 200);
    const payload = state.body as {
      readonly stage?: string;
      readonly content?: string;
    };
    assert.equal(payload?.stage, "diagram_modules");
    assert.match(payload?.content ?? "", PLAN_STATUS_ACTIVE_STAGE_RE);
    assert.match(payload?.content ?? "", ACTIVE_STAGE_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed context bundle endpoint rejects unsupported stage", async () => {
  const req = {
    query: {
      stage: "description",
      workspacePath: "/tmp/whatever",
      workspaceSlug: "demo",
      providerId: "codexCli",
    },
  } as unknown as Request;
  const state: MockResponseState = { statusCode: 200, body: null };
  const res = buildMockResponse(state);
  await handleManagedContextBundleRead(req, res);
  assert.equal(state.statusCode, 400);
});

test("managed context bundle endpoint rejects missing workspacePath", async () => {
  const req = {
    query: {
      stage: "diagram_modules",
      workspaceSlug: "demo",
      providerId: "codexCli",
    },
  } as unknown as Request;
  const state: MockResponseState = { statusCode: 200, body: null };
  const res = buildMockResponse(state);
  await handleManagedContextBundleRead(req, res);
  assert.equal(state.statusCode, 400);
});

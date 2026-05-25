import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import type { Logger } from "../../telemetry/logger";
import type { SessionRequestHandler } from "./session-request-handler";
import { handleWorkspaceActivate } from "./workspace-activate-service";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/handlers/workspace-activate-service.ts"
);
const DESCRIPTION_BOUNDARY_RE = /codeai-boundary: Description/u;
const execFileAsync = promisify(execFile);

const createResponseRecorder = (): {
  readonly body: () => unknown;
  readonly res: Response;
  readonly statusCode: () => number;
} => {
  let statusCode = 200;
  let body: unknown = null;
  const res = {
    json(payload: unknown) {
      body = payload;
      return this;
    },
    status(nextStatus: number) {
      statusCode = nextStatus;
      return this;
    },
  } as Response;

  return {
    body: () => body,
    res,
    statusCode: () => statusCode,
  };
};

const logger = {
  error() {
    return undefined;
  },
  warn() {
    return undefined;
  },
} as unknown as Logger;

const sessionHandler = {
  handleCreate() {
    return Promise.resolve();
  },
} as unknown as SessionRequestHandler;

test("workspace-activate-service preserves deterministic resume/reopen path after restart", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("if (!path.isAbsolute(workspacePath))"),
    true,
    "workspace activation must keep absolute-path guard for scope identity"
  );
  assert.equal(
    source.includes('stage: "description",'),
    true,
    "workspace activation must resume description branch session"
  );
  assert.equal(
    source.includes("providerSessionId: collector.providerSessionId"),
    true,
    "workspace activation must resume description via primarySession"
  );
  assert.equal(
    source.includes("description: descriptionSnapshot"),
    true,
    "workspace activation response must include description snapshot for PM visibility"
  );
  assert.equal(
    source.includes(
      'stage: "description",\n      workspaceRoot: workspacePath'
    ),
    true,
    "workspace activation must create the Description Git boundary before PM workflow work"
  );
  assert.equal(
    source.indexOf("ensureBoundary({") <
      source.indexOf("params.onWorkspaceActivated?."),
    true,
    "Description boundary must be created before activation side effects"
  );
  assert.equal(
    source.indexOf("ensureBoundary({") < source.indexOf("await fs.mkdir"),
    true,
    "Description boundary must be created before workspace directory bootstrap"
  );
});

test("workspace activation creates Description boundary before new workspace bootstrap", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "codeai-activate-"));
  const workspaceSlug = "new-workspace";
  const recorder = createResponseRecorder();

  await handleWorkspaceActivate({
    logger,
    req: {
      body: { workspacePath, workspaceSlug },
    } as Request,
    res: recorder.res,
    sessionHandler,
  });

  assert.equal(recorder.statusCode(), 200);
  const body = recorder.body() as {
    readonly description?: unknown;
    readonly lastActive?: {
      readonly artifactPath?: unknown;
      readonly stage?: unknown;
      readonly updatedAt?: unknown;
    };
    readonly workspaceSlug?: unknown;
  };
  assert.equal(body.workspaceSlug, workspaceSlug);
  assert.equal(body.description, null);
  assert.equal(body.lastActive?.stage, "description");
  assert.equal(
    body.lastActive?.artifactPath,
    `.codeai-hub/${workspaceSlug}/description/questionnaire.md`
  );
  assert.equal(typeof body.lastActive?.updatedAt, "string");

  const registry = await readFile(
    path.join(
      workspacePath,
      ".codeai-hub",
      workspaceSlug,
      "workflow",
      "boundaries.json"
    ),
    "utf8"
  );
  assert.match(registry, DESCRIPTION_BOUNDARY_RE);

  const { stdout } = await execFileAsync("git", ["log", "--oneline"], {
    cwd: workspacePath,
  });
  assert.match(stdout, DESCRIPTION_BOUNDARY_RE);
});

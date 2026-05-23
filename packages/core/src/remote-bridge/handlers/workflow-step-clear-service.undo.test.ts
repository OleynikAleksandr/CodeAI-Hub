import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSessionFilePath } from "@codeai-hub/unified-session";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStepUndoLedgerStore } from "../../workflow/undo/workflow-step-undo-ledger";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const exists = async (targetPath: string): Promise<boolean> =>
  Boolean(await stat(targetPath).catch(() => null));

const readJson = async <T>(targetPath: string): Promise<T> =>
  JSON.parse(await readFile(targetPath, "utf8")) as T;

const writeFileInWorkspace = async (
  workspaceRoot: string,
  relativePath: string,
  content = "test\n"
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runClear = async (params: {
  readonly body: unknown;
  readonly resetCalls: string[];
  readonly sessionManager: SessionManager;
}) => {
  let statusCode = 200;
  let payload: unknown = null;
  const response = {
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status(nextStatusCode: number) {
      statusCode = nextStatusCode;
      return this;
    },
  } as unknown as Response;
  await handleWorkflowStepClear({ body: params.body } as Request, response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) =>
      params.resetCalls.push(workspaceSlug),
    sessionManager: params.sessionManager,
  });
  return { payload, statusCode };
};

test("workflow step clear preserves Description questionnaire and removes generated outputs plus index entries", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-description-")
  );
  const homeRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-home-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  const resetCalls: string[] = [];
  const previousHome = process.env.HOME;
  try {
    process.env.HOME = homeRoot;
    const descriptionRoot = `.codeai-hub/${workspaceSlug}/description`;
    await writeFileInWorkspace(
      workspaceRoot,
      `${descriptionRoot}/questionnaire.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `${descriptionRoot}/Final_Description.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `${descriptionRoot}/Description_Draft.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `${descriptionRoot}/description-step.json`,
      JSON.stringify(
        {
          workspaceSlug,
          workspacePath: workspaceRoot,
          createdAt: "2026-05-23T08:00:00.000Z",
          updatedAt: "2026-05-23T08:00:00.000Z",
          questionnairePath: `${descriptionRoot}/questionnaire.md`,
          draftPath: `${descriptionRoot}/Description_Draft.md`,
          finalPath: `${descriptionRoot}/Final_Description.md`,
          primarySession: {
            providerId: "codexCli",
            providerSessionId: "description-provider",
            jsonlPath: "session.jsonl",
          },
        },
        null,
        2
      )
    );
    const indexPath = path.join(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/index.json`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/index.json`,
      JSON.stringify({
        version: 1,
        workspaceSlug,
        updatedAt: "2026-05-23T08:00:00.000Z",
        entries: [
          {
            stage: "description",
            rootSessionId: "description-root",
            providerId: "codexCli",
            providerSessionId: "description-provider",
          },
          {
            stage: "virtual_simulation",
            rootSessionId: "virtual-root",
            providerId: "codexCli",
            providerSessionId: "virtual-provider",
          },
        ],
      })
    );
    const descriptionHistoryPath = buildSessionFilePath({
      provider: "codexCli",
      rootDirectory: path.join(homeRoot, ".codeai-hub", "sessions"),
      sessionId: "description-provider",
      workspaceSlug,
    });
    await mkdir(path.dirname(descriptionHistoryPath), { recursive: true });
    await writeFile(descriptionHistoryPath, "test\n", "utf8");

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug,
        target: { kind: "workflow_stage", stage: "description" },
      },
      resetCalls,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(
      await exists(
        path.join(workspaceRoot, `${descriptionRoot}/questionnaire.md`)
      ),
      true
    );
    assert.equal(
      await exists(
        path.join(workspaceRoot, `${descriptionRoot}/Final_Description.md`)
      ),
      false
    );
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          ".codeai-hub",
          workspaceSlug,
          "virtual_simulation"
        )
      ),
      false
    );
    assert.equal(await exists(descriptionHistoryPath), false);
    const descriptionState = await readJson<Record<string, unknown>>(
      path.join(workspaceRoot, `${descriptionRoot}/description-step.json`)
    );
    assert.equal(
      descriptionState.questionnairePath,
      `${descriptionRoot}/questionnaire.md`
    );
    assert.equal("finalPath" in descriptionState, false);
    assert.equal("primarySession" in descriptionState, false);
    const index = await readJson<{ readonly entries: readonly unknown[] }>(
      indexPath
    );
    assert.equal(index.entries.length, 0);
    assert.deepEqual(resetCalls, [workspaceSlug]);
  } finally {
    process.env.HOME = previousHome;
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(homeRoot, { force: true, recursive: true });
  }
});

test("workflow step clear uses persisted undo ledger entries after restart", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-ledger-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  const resetCalls: string[] = [];
  try {
    const descriptionPath = `.codeai-hub/${workspaceSlug}/description/Final_Description.md`;
    const virtualPath = `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    await writeFileInWorkspace(workspaceRoot, descriptionPath);
    await writeFileInWorkspace(workspaceRoot, virtualPath);
    await new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
      clock: () => "2026-05-23T08:30:00.000Z",
    }).append([
      {
        kind: "write_file",
        relativePath: descriptionPath,
        source: "artifact_upsert",
        stage: "description",
      },
      {
        kind: "write_file",
        relativePath: virtualPath,
        source: "artifact_upsert",
        stage: "virtual_simulation",
      },
    ]);

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug,
        target: { kind: "workflow_stage", stage: "virtual_simulation" },
      },
      resetCalls,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(await exists(path.join(workspaceRoot, descriptionPath)), true);
    assert.equal(await exists(path.join(workspaceRoot, virtualPath)), false);
    const ledger = await new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
    }).read();
    assert.deepEqual(
      ledger?.entries.map((entry) => entry.stage),
      ["description"]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Session } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { DialogListService } from "./dialog-list-service";

const createRuntimeSession = (params: {
  readonly id: string;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly workspacePath: string;
  readonly updatedAt: string;
}): Session => ({
  id: params.id,
  providerId: params.providerId,
  workspacePath: params.workspacePath,
  initiativeSlug: null,
  stage: "description-reviewer",
  runSlug: "reviewer",
  continuationParentId: null,
  continuationIndex: 1,
  title: "runtime",
  createdAt: params.updatedAt,
  updatedAt: params.updatedAt,
  messages: [],
  providerSessionId: params.providerSessionId,
  providerSessionStatus: "ready",
});

test("DialogListService reconciles latestSessionId from runtime session by providerSessionId", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "dialog-list-service-")
  );
  const workspaceSlug = "workspace";
  const indexPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "continuity",
    "index.json"
  );
  try {
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(
      indexPath,
      `${JSON.stringify(
        {
          version: 1,
          workspaceSlug,
          updatedAt: "2026-02-22T08:00:00.000Z",
          entries: [
            {
              stage: "description-reviewer",
              rootSessionId: "root-session",
              dialogId: "dialog-session",
              updatedAt: "2026-02-22T08:00:00.000Z",
              latestSessionId: "stale-session-id",
              providerId: "claudeCodeCli",
              providerSessionId: "provider-session-1",
            },
          ],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const service = new DialogListService({ logger: new Logger("error") });
    const runtimeSession = createRuntimeSession({
      id: "runtime-session-id",
      providerId: "claudeCodeCli",
      providerSessionId: "provider-session-1",
      workspacePath: workspaceRoot,
      updatedAt: "2026-02-22T08:01:00.000Z",
    });
    const dialogs = await service.listDialogs({
      workspaceRoot,
      workspaceSlug,
      runtimeSessions: [runtimeSession],
    });

    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.latestSessionId, "runtime-session-id");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DialogListService keeps continuity latestSessionId when provider differs", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "dialog-list-service-")
  );
  const workspaceSlug = "workspace";
  const indexPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    workspaceSlug,
    "continuity",
    "index.json"
  );
  try {
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(
      indexPath,
      `${JSON.stringify(
        {
          version: 1,
          workspaceSlug,
          updatedAt: "2026-02-22T08:00:00.000Z",
          entries: [
            {
              stage: "description-reviewer",
              rootSessionId: "root-session",
              dialogId: "dialog-session",
              updatedAt: "2026-02-22T08:00:00.000Z",
              latestSessionId: "continuity-session-id",
              providerId: "claudeCodeCli",
              providerSessionId: "provider-session-1",
            },
          ],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    const service = new DialogListService({ logger: new Logger("error") });
    const runtimeSession = createRuntimeSession({
      id: "runtime-session-id",
      providerId: "codexCli",
      providerSessionId: "provider-session-1",
      workspacePath: workspaceRoot,
      updatedAt: "2026-02-22T08:01:00.000Z",
    });
    const dialogs = await service.listDialogs({
      workspaceRoot,
      workspaceSlug,
      runtimeSessions: [runtimeSession],
    });

    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.latestSessionId, "continuity-session-id");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

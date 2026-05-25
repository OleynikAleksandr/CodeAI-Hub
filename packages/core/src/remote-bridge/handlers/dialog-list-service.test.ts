import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSessionFilePath } from "@codeai-hub/unified-session";
import type { Session } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG } from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { DialogHistoryService } from "./dialog-history-service";
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

const writeContinuityIndex = async (params: {
  readonly entries: readonly Record<string, unknown>[];
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const indexPath = path.join(
    params.workspaceRoot,
    ".codeai-hub",
    params.workspaceSlug,
    "continuity",
    "index.json"
  );
  await mkdir(path.dirname(indexPath), { recursive: true });
  await writeFile(
    indexPath,
    `${JSON.stringify(
      {
        version: 1,
        workspaceSlug: params.workspaceSlug,
        updatedAt: "2026-02-22T08:00:00.000Z",
        entries: params.entries,
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

const writeCapsuleHistory = async (params: {
  readonly content?: string;
  readonly dialogId: string;
  readonly providerId: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: params.workspaceRoot,
    workspaceSlug: params.workspaceSlug,
  });
  const historyPath = buildSessionFilePath({
    rootDirectory: capsule.sessionsRoot.absolutePath,
    workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    provider: params.providerId,
    sessionId: params.dialogId,
  });
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(
    historyPath,
    [
      JSON.stringify({
        type: "session-open",
        timestamp: "2026-02-22T08:00:00.000Z",
        provider: params.providerId,
        sessionId: params.dialogId,
      }),
      JSON.stringify({
        type: "message",
        timestamp: "2026-02-22T08:01:00.000Z",
        provider: params.providerId,
        messageId: "message-1",
        role: "assistant",
        content: params.content ?? "Capsule history",
      }),
    ].join("\n"),
    "utf8"
  );
};

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

test("DialogListService prefers duplicate dialog entries that have capsule history", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "dialog-list-capsule-")
  );
  const workspaceSlug = "workspace";
  try {
    await writeContinuityIndex({
      workspaceRoot,
      workspaceSlug,
      entries: [
        {
          stage: "description",
          rootSessionId: "older-root",
          dialogId: "dialog-with-history",
          updatedAt: "2026-02-22T08:00:00.000Z",
          latestSessionId: "older-session",
          providerId: "codexCli",
          providerSessionId: "provider-session-1",
        },
        {
          stage: "description",
          rootSessionId: "newer-root",
          dialogId: "dialog-without-history",
          updatedAt: "2026-02-22T08:05:00.000Z",
          latestSessionId: "newer-session",
          providerId: "codexCli",
          providerSessionId: "provider-session-1",
        },
      ],
    });
    await writeCapsuleHistory({
      workspaceRoot,
      workspaceSlug,
      providerId: "codexCli",
      dialogId: "dialog-with-history",
    });

    const dialogs = await new DialogListService({
      logger: new Logger("error"),
    }).listDialogs({ workspaceRoot, workspaceSlug });

    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.dialogId, "dialog-with-history");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DialogHistoryService reads workflow dialog messages from capsule history", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "dialog-history-capsule-")
  );
  const workspaceSlug = "workspace";
  try {
    await writeContinuityIndex({
      workspaceRoot,
      workspaceSlug,
      entries: [
        {
          stage: "description",
          rootSessionId: "root-session",
          dialogId: "dialog-session",
          updatedAt: "2026-02-22T08:00:00.000Z",
          latestSessionId: "runtime-session",
          providerId: "codexCli",
          providerSessionId: "provider-session-1",
        },
      ],
    });
    await writeCapsuleHistory({
      workspaceRoot,
      workspaceSlug,
      providerId: "codexCli",
      dialogId: "dialog-session",
      content: "Capsule answer",
    });

    const history = await new DialogHistoryService({
      logger: new Logger("error"),
    }).readHistory({
      workspaceRoot,
      workspaceSlug,
      dialogId: "dialog-session",
    });

    assert.equal(history.messages.length, 1);
    assert.equal(history.messages[0]?.content, "Capsule answer");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

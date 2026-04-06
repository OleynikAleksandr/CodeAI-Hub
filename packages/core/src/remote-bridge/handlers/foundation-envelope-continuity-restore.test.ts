import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { ContinuityChainStore } from "../../session-continuity/continuity-store";

const originalHome = process.env.HOME;
let tempHome = "";

const noop = (): void => {
  // noop
};

const createLoggerStub = () =>
  ({
    info: noop,
    warn: noop,
    error: noop,
  }) as never;

const createSessionStorageStub = () =>
  ({
    promoteHistoryFile: noop,
  }) as never;

const writeDialogHistory = async (options: {
  readonly dialogId: string;
  readonly providerId: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const filePath = buildSessionFilePath({
    rootDirectory: path.join(tempHome, ".codeai-hub", "sessions"),
    workspaceSlug: sanitizeWorkspaceSlug(options.workspaceRoot),
    provider: options.providerId,
    sessionId: sanitizeWorkspaceSlug(options.dialogId),
  });
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `${JSON.stringify(
      {
        type: "session-open",
        timestamp: "2026-04-05T16:38:45.396Z",
        provider: options.providerId,
        sessionId: options.dialogId,
      },
      null,
      0
    )}\n`,
    "utf8"
  );
};

before(async () => {
  tempHome = await mkdtemp(path.join(tmpdir(), "codeai-hub-home-"));
  process.env.HOME = tempHome;
});

after(async () => {
  if (originalHome === undefined) {
    process.env.HOME = undefined;
  } else {
    process.env.HOME = originalHome;
  }
  if (tempHome) {
    await rm(tempHome, { recursive: true, force: true });
  }
});

test("SessionRequestHandlerContinuityRoot reuses the history-backed Foundation Envelope dialog", {
  concurrency: false,
}, async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "foundation-envelope-continuity-root-")
  );
  const workspaceSlug = "workspace";
  const providerId = "codexCli";
  const providerSessionId = "provider-session-foundation-envelope";
  const olderDialogId =
    "codex-older-foundation-envelope-dialog-foundation-envelope";
  const newerDialogId =
    "codex-newer-foundation-envelope-dialog-foundation-envelope";

  try {
    const olderStore = new ContinuityChainStore({
      workspaceRoot,
      workspaceSlug,
      stage: "foundation_envelope",
      rootSessionId: olderDialogId,
      clock: () => "2026-04-05T16:41:27.498Z",
    });
    await olderStore.save({
      rootSessionId: olderDialogId,
      dialogId: olderDialogId,
      workspaceSlug,
      stage: "foundation_envelope",
      segments: [
        {
          sessionId: "older-runtime-session",
          providerId,
          providerSessionId,
          createdAt: "2026-04-05T16:38:45.384Z",
        },
      ],
      updatedAt: "2026-04-05T16:41:27.498Z",
    });

    const newerStore = new ContinuityChainStore({
      workspaceRoot,
      workspaceSlug,
      stage: "foundation_envelope",
      rootSessionId: newerDialogId,
      clock: () => "2026-04-06T06:18:05.391Z",
    });
    await newerStore.save({
      rootSessionId: newerDialogId,
      dialogId: newerDialogId,
      workspaceSlug,
      stage: "foundation_envelope",
      segments: [
        {
          sessionId: "newer-runtime-session",
          providerId,
          providerSessionId,
          createdAt: "2026-04-06T06:18:05.386Z",
        },
      ],
      updatedAt: "2026-04-06T06:18:05.391Z",
    });

    await writeDialogHistory({
      dialogId: olderDialogId,
      providerId,
      workspaceRoot,
    });

    const { SessionRequestHandlerContinuityRoot } = await import(
      "./session-request-handler-continuity-root"
    );
    const continuityRoot = new SessionRequestHandlerContinuityRoot({
      logger: createLoggerStub(),
      sessionStorage: createSessionStorageStub(),
    });

    const resolved = await continuityRoot.resolveContinuityRootSessionId({
      providerId,
      rootSessionIdOverride: null,
      sessionId: "fresh-runtime-session",
      workspaceRoot,
      context: {
        initiativeSlug: workspaceSlug,
        providerSessionId,
        runSlug: null,
        stage: "foundation_envelope",
      },
    });

    assert.equal(resolved, olderDialogId);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DialogListService collapses duplicate Foundation Envelope dialogs to the history-backed entry", {
  concurrency: false,
}, async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "foundation-envelope-dialog-list-")
  );
  const workspaceSlug = "workspace";
  const providerId = "codexCli";
  const providerSessionId = "provider-session-foundation-envelope";
  const olderDialogId =
    "codex-older-foundation-envelope-dialog-foundation-envelope";
  const newerDialogId =
    "codex-newer-foundation-envelope-dialog-foundation-envelope";
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
          updatedAt: "2026-04-06T06:18:05.391Z",
          entries: [
            {
              stage: "foundation_envelope",
              rootSessionId: newerDialogId,
              dialogId: newerDialogId,
              updatedAt: "2026-04-06T06:18:05.391Z",
              latestSessionId: "newer-runtime-session",
              providerId,
              providerSessionId,
            },
            {
              stage: "foundation_envelope",
              rootSessionId: olderDialogId,
              dialogId: olderDialogId,
              updatedAt: "2026-04-05T16:41:27.498Z",
              latestSessionId: "older-runtime-session",
              providerId,
              providerSessionId,
            },
          ],
        },
        null,
        2
      )}\n`,
      "utf8"
    );

    await writeDialogHistory({
      dialogId: olderDialogId,
      providerId,
      workspaceRoot,
    });

    const { DialogListService } = await import("./dialog-list-service");
    const service = new DialogListService({ logger: createLoggerStub() });
    const dialogs = await service.listDialogs({
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.dialogId, olderDialogId);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

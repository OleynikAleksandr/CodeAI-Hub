import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import type { WorkflowWatcherEvent } from "./watcher-types";
import { WorkflowWatcher } from "./workflow-watcher";

const WORKSPACE_SLUG = "demo-workspace";
const TIMESTAMP = "2026-05-26T18:45:32.393Z";

const logger = new Logger("error");

const createWatchRoot = async (): Promise<string> =>
  await mkdtemp(path.join(tmpdir(), "codeai-workflow-watcher-"));

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const emitFsEvent = (
  watcher: WorkflowWatcher,
  eventType: "change" | "rename",
  fileName: string
): void => {
  (
    watcher as unknown as {
      handleFsEvent: (eventType: "change" | "rename", fileName: string) => void;
    }
  ).handleFsEvent(eventType, fileName);
};

test("WorkflowWatcher ignores deleted workflow artifacts", async () => {
  const watchRoot = await createWatchRoot();
  try {
    const fileName = path.join("diagram_modules", "product-parts.index.md");
    const artifactPath = path.join(watchRoot, fileName);
    const events: WorkflowWatcherEvent[] = [];
    const watcher = new WorkflowWatcher({
      clock: () => TIMESTAMP,
      enableFsWatch: false,
      logger,
      watchRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    watcher.subscribe((event) => events.push(event));

    emitFsEvent(watcher, "rename", fileName);
    assert.deepEqual(events, []);

    await writeText(artifactPath, "# Product Parts\n");
    emitFsEvent(watcher, "rename", fileName);
    assert.deepEqual(events, [
      {
        type: "workflow.artifact.written",
        timestamp: TIMESTAMP,
        workspaceSlug: WORKSPACE_SLUG,
        stage: "diagram_modules",
        filePath: fileName,
      },
    ]);

    await unlink(artifactPath);
    emitFsEvent(watcher, "rename", fileName);
    assert.equal(events.length, 1);
  } finally {
    await rm(watchRoot, { force: true, recursive: true });
  }
});

test("WorkflowWatcher ignores deleted workflow stage directories", async () => {
  const watchRoot = await createWatchRoot();
  try {
    const stageDir = "diagram_modules";
    const events: WorkflowWatcherEvent[] = [];
    const watcher = new WorkflowWatcher({
      clock: () => TIMESTAMP,
      enableFsWatch: false,
      logger,
      watchRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    watcher.subscribe((event) => events.push(event));

    emitFsEvent(watcher, "rename", stageDir);
    assert.deepEqual(events, []);

    await mkdir(path.join(watchRoot, stageDir), { recursive: true });
    emitFsEvent(watcher, "rename", stageDir);
    assert.deepEqual(events, [
      {
        type: "workflow.run.created",
        timestamp: TIMESTAMP,
        workspaceSlug: WORKSPACE_SLUG,
        stage: "diagram_modules",
      },
    ]);
  } finally {
    await rm(watchRoot, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkbenchIndexRebuilder } from "./workbench-index-rebuilder";
import { WorkbenchStatePersistenceHandler } from "./workbench-state-persistence-handler";
import type { WorkbenchSelectionFile } from "./workbench-state-types";

test("WorkbenchStatePersistenceHandler saves and loads selection state", async () => {
  const settingsDir = await mkdtemp(path.join(tmpdir(), "workbench-state-"));
  const handler = new WorkbenchStatePersistenceHandler({ settingsDir });
  const selection: WorkbenchSelectionFile = {
    version: 1,
    selection: {
      step: "description",
      provider: "claude",
      model: "sonnet",
      reasoning: "thinking-high",
    },
    updatedAt: "2026-05-02T10:00:00.000Z",
  };

  try {
    await handler.save("selection", selection);
    assert.deepEqual(await handler.load("selection"), selection);
  } finally {
    await rm(settingsDir, { force: true, recursive: true });
  }
});

test("WorkbenchStatePersistenceHandler rebuilds a missing index from capture_start records", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "workbench-rebuild-"));
  const settingsDir = path.join(rootDir, "settings");
  const captureLogsDir = path.join(rootDir, "logs", "native-request-capture");
  await mkdir(captureLogsDir, { recursive: true });
  await writeCaptureStart(captureLogsDir, {
    artifactId: "current",
    capturedAt: "2026-05-02T12:00:00.000Z",
    mode: "managed",
    releaseVersion: "1.2.123",
  });
  await writeCaptureStart(captureLogsDir, {
    artifactId: "previous",
    capturedAt: "2026-05-02T11:00:00.000Z",
    mode: "managed",
    releaseVersion: "1.2.122",
  });
  const handler = new WorkbenchStatePersistenceHandler({
    indexRebuilder: new WorkbenchIndexRebuilder({ captureLogsDir }),
    settingsDir,
  });

  try {
    const index = await handler.load("index");
    assert.equal(index?.slots.length, 1);
    const slot = index?.slots[0];
    assert.equal(slot?.step, "description");
    assert.equal(slot?.provider, "claude");
    assert.equal(slot?.model, "sonnet");
    assert.equal(slot?.reasoning, "thinking-high");
    assert.equal(slot?.managed.current?.artifactId, "current");
    assert.equal(slot?.managed.previous?.artifactId, "previous");
    assert.equal(slot?.managed.current?.releaseVersion, "1.2.123");
    const persisted = JSON.parse(
      await readFile(path.join(settingsDir, "workbench-index.json"), "utf8")
    ) as unknown;
    assert.deepEqual(persisted, index);
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

const writeCaptureStart = async (
  captureLogsDir: string,
  options: {
    readonly artifactId: string;
    readonly capturedAt: string;
    readonly mode: "managed" | "vanilla";
    readonly releaseVersion: string;
  }
): Promise<void> => {
  await writeFile(
    path.join(captureLogsDir, `${options.artifactId}.jsonl`),
    `${JSON.stringify({
      type: "capture_start",
      timestamp: options.capturedAt,
      providerId: "claude",
      selectedModelId: "sonnet",
      mode: options.mode,
      releaseVersion: options.releaseVersion,
      appliedTurnConfig: {
        modelId: "sonnet",
        providerId: "claudeCodeCli",
        reasoningEffort: "high",
        source: "switch_request",
        thinkingEnabled: true,
      },
      scenarioMetadata: { id: "description" },
    })}\n`,
    "utf8"
  );
};

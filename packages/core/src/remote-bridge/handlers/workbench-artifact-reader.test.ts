import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { WorkbenchArtifactReader } from "./workbench-artifact-reader";

test("WorkbenchArtifactReader reads JSONL records inside capture logs", async () => {
  const captureLogsDir = await mkdtemp(
    path.join(tmpdir(), "workbench-artifact-")
  );
  const jsonlPath = path.join(captureLogsDir, "capture.jsonl");
  await writeFile(
    jsonlPath,
    `${JSON.stringify({ type: "capture_start" })}\n${JSON.stringify({
      type: "applied_input_envelope",
    })}\n`,
    "utf8"
  );
  const reader = new WorkbenchArtifactReader({ captureLogsDir });

  try {
    const result = await reader.read({ jsonlPath });
    assert.equal(result.ok, true);
    assert.deepEqual(result.ok ? result.records : [], [
      { type: "capture_start" },
      { type: "applied_input_envelope" },
    ]);
  } finally {
    await rm(captureLogsDir, { force: true, recursive: true });
  }
});

test("WorkbenchArtifactReader rejects paths outside capture logs", async () => {
  const rootDir = await mkdtemp(path.join(tmpdir(), "workbench-artifact-"));
  const captureLogsDir = path.join(rootDir, "logs");
  await mkdir(captureLogsDir, { recursive: true });
  const outsidePath = path.join(rootDir, "outside.jsonl");
  await writeFile(outsidePath, "{}\n", "utf8");
  const reader = new WorkbenchArtifactReader({ captureLogsDir });

  try {
    assert.deepEqual(await reader.read({ jsonlPath: outsidePath }), {
      ok: false,
      error: "path_outside_capture_logs",
    });
  } finally {
    await rm(rootDir, { force: true, recursive: true });
  }
});

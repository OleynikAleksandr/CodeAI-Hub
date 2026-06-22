import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { CaptureWorkbenchRunnerTransport } from "../../services/capture-workbench-runner";
import type { WorkbenchStateClientApi } from "../../services/workbench-state-client";
import { CaptureWorkbenchSnapshotCard } from "./snapshot-card";
import { CaptureWorkbenchSnapshotCardsRow } from "./snapshot-cards-row";

const ROW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/snapshot-cards-row.tsx"
);
const CARD_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/snapshot-card.tsx"
);

test("CaptureWorkbenchSnapshotCardsRow renders empty snapshot recapture actions", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchSnapshotCardsRow
      captureTransport={CAPTURE_TRANSPORT}
      context={{
        workspacePath: "/workspace/demo",
        workspaceSlug: "demo",
      }}
      selection={{
        step: "description",
        provider: "claude",
        model: "sonnet",
        reasoning: "thinking-high",
      }}
      stateClient={STATE_CLIENT}
    />
  );

  assert.equal(markup.includes("Vanilla snapshot"), true);
  assert.equal(markup.includes("Managed snapshot"), true);
  assert.equal(markup.includes("No current artifact"), true);
  assert.equal(markup.includes("Re-capture Vanilla"), true);
  assert.equal(markup.includes("Re-capture Managed"), true);
  assert.equal(markup.includes("Delete captures"), true);
  assert.equal(markup.includes("Vanilla capture is deferred"), false);
});

test("CaptureWorkbenchSnapshotCard renders artifact links and previous metadata", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchSnapshotCard
      current={slotEntry("current", "2026-05-02T14:32:00.000Z", "1.2.123")}
      mode="managed"
      onRecapture={() => undefined}
      previous={slotEntry("previous", "2026-05-02T11:08:00.000Z", "1.2.122")}
    />
  );

  assert.equal(markup.includes("captured 2026-05-02 14:32 - v1.2.123"), true);
  assert.equal(markup.includes("previous: 2026-05-02 11:08 - v1.2.122"), true);
  assert.equal(markup.includes("managed.md"), true);
  assert.equal(markup.includes("managed.jsonl"), true);
  assert.equal(markup.includes("open prev"), true);
});

test("CaptureWorkbench snapshot row keeps runner, rotation, and file-link wiring", async () => {
  const rowSource = await readFile(ROW_SOURCE_PATH, "utf8");
  const cardSource = await readFile(CARD_SOURCE_PATH, "utf8");

  assert.equal(rowSource.includes("runner.runManagedCapture"), true);
  assert.equal(rowSource.includes("runner.runVanillaCapture"), true);
  assert.equal(rowSource.includes("indexStore.rotateCapture({"), true);
  assert.equal(rowSource.includes('mode: "vanilla"'), true);
  assert.equal(rowSource.includes('mode: "managed"'), true);
  assert.equal(rowSource.includes("setIndex(nextIndex)"), true);
  assert.equal(rowSource.includes("stateClient.saveIndex(EMPTY_INDEX)"), true);
  assert.equal(rowSource.includes("setError(normalizeError(captureError))"), true);
  assert.equal(cardSource.includes("openProjectManagerFileLink({"), true);
  assert.equal(cardSource.includes("filePath: path"), true);
});

const STATE_CLIENT: WorkbenchStateClientApi = {
  loadIndex: async () => null,
  loadSelection: async () => null,
  readArtifactRecords: async () => [],
  saveIndex: async () => undefined,
  saveSelection: async () => undefined,
};

const CAPTURE_TRANSPORT: CaptureWorkbenchRunnerTransport = {
  captureNativeRequest: () => undefined,
  getLastSettingsPayload: () => null,
  getWorkflowState: async () => null,
  onCoreEvent: () => () => undefined,
};

const slotEntry = (artifactId: string, capturedAt: string, releaseVersion: string) => ({
  artifactId,
  capturedAt,
  jsonlPath: `/tmp/${artifactId}.jsonl`,
  markdownPath: `/tmp/${artifactId}.md`,
  releaseVersion,
});

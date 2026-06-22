import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SlotEntryRecord } from "../../services/workbench-bridge-types";
import { CaptureWorkbenchDiffRenderer } from "./diff-renderer";

const RENDERER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/diff-renderer.tsx"
);
const SECTION_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/diff-section.tsx"
);

test("CaptureWorkbenchDiffRenderer renders prototype mode tabs and snapshot labels", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchDiffRenderer
      provider="claude"
      slot={{
        managed: {
          current: slotEntry("current", "2026-05-02T14:32:00.000Z", "1.2.124"),
          previous: slotEntry("previous", "2026-05-02T11:08:00.000Z", "1.2.123"),
        },
        model: "sonnet",
        provider: "claude",
        reasoning: "thinking-high",
        step: "description",
        vanilla: {
          current: slotEntry("vanilla", "2026-05-02T14:01:00.000Z", "1.2.124"),
          previous: null,
        },
      }}
      stateClient={{
        readArtifactRecords: async () => [],
      }}
    />
  );

  assert.equal(markup.includes("Managed vs Vanilla"), true);
  assert.equal(markup.includes("Managed: current vs previous"), true);
  assert.equal(markup.includes("Vanilla: current vs previous"), true);
  assert.equal(markup.includes("Previous - 2026-05-02 11:08 - v1.2.123"), true);
  assert.equal(markup.includes("Current - 2026-05-02 14:32 - v1.2.124"), true);
});

test("CaptureWorkbenchDiffRenderer keeps artifact-read and extractor wiring", async () => {
  const rendererSource = await readFile(RENDERER_SOURCE_PATH, "utf8");
  const sectionSource = await readFile(SECTION_SOURCE_PATH, "utf8");

  assert.equal(
    rendererSource.includes("stateClient.readArtifactRecords(pair.left.jsonlPath)"),
    true
  );
  assert.equal(
    rendererSource.includes("stateClient.readArtifactRecords(pair.right.jsonlPath)"),
    true
  );
  assert.equal(rendererSource.includes("extractCodexDiffSections"), true);
  assert.equal(rendererSource.includes("extractClaudeDiffSections"), true);
  assert.equal(rendererSource.includes("buildCaptureWorkbenchDiffSection"), true);
  assert.equal(rendererSource.includes('setMode("managed-vs-vanilla")'), true);
  assert.equal(rendererSource.includes("slot?.vanilla.current"), true);
  assert.equal(rendererSource.includes('leftLabel: "Vanilla"'), true);
  assert.equal(sectionSource.includes("section.collapsedByDefault"), true);
  assert.equal(sectionSource.includes("setExpanded((current) => !current)"), true);
});

const slotEntry = (
  artifactId: string,
  capturedAt: string,
  releaseVersion: string
): SlotEntryRecord => ({
  artifactId,
  capturedAt,
  jsonlPath: `/tmp/${artifactId}.jsonl`,
  markdownPath: `/tmp/${artifactId}.md`,
  releaseVersion,
});

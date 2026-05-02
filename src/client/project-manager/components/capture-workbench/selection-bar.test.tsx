import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CaptureWorkbenchSelectionBar } from "./selection-bar";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/selection-bar.tsx"
);

test("CaptureWorkbenchSelectionBar renders four selector controls with Gemini disabled", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchSelectionBar
      stateClient={{
        loadSelection: async () => null,
        saveSelection: async () => undefined,
      }}
    />
  );

  assert.equal(markup.includes("Step"), true);
  assert.equal(markup.includes("Provider"), true);
  assert.equal(markup.includes("Model"), true);
  assert.equal(markup.includes("Reasoning"), true);
  assert.equal(markup.includes("Gemini"), true);
  assert.equal(markup.includes("disabled=\"\""), true);
  assert.equal(markup.includes("thinking-high"), true);
});

test("CaptureWorkbenchSelectionBar keeps sticky load/save and selection callback wiring", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes(".loadSelection()"), true);
  assert.equal(source.includes("stateClient.saveSelection({"), true);
  assert.equal(source.includes("onSelectionChange?.(nextSelection)"), true);
  assert.equal(source.includes("onReasoningChange={(reasoning) =>"), true);
});

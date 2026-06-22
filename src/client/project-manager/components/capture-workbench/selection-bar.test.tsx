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
const SELECTOR_SOURCE_PATHS = [
  "dom-listbox-selector.tsx",
  "step-selector.tsx",
  "provider-selector.tsx",
  "model-reasoning-selectors.tsx",
].map((fileName) =>
  path.resolve(
    process.cwd(),
    "src/client/project-manager/components/capture-workbench",
    fileName
  )
);

test("CaptureWorkbenchSelectionBar renders four selector controls with Gemini disabled", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchSelectionBar
      selection={{
        step: "description",
        provider: "codex",
        model: "gpt-5.5",
        reasoning: "reasoning-xhigh",
      }}
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
  assert.equal(markup.includes("GPT-5.5"), true);
  assert.equal(markup.includes("GPT-5.3-Codex-Spark"), true);
  assert.equal(markup.includes("reasoning xhigh"), true);
  assert.equal(markup.includes("aria-haspopup=\"listbox\""), true);
  assert.equal(markup.includes("<select"), false);
  assert.equal(markup.includes("<option"), false);
});

test("CaptureWorkbenchSelectionBar renders current Kimi registry models", () => {
  const markup = renderToStaticMarkup(
    <CaptureWorkbenchSelectionBar
      selection={{
        step: "description",
        provider: "kimi",
        model: "kimi-k2.7-code-highspeed",
        reasoning: "default",
      }}
      stateClient={{
        loadSelection: async () => null,
        saveSelection: async () => undefined,
      }}
    />
  );

  assert.equal(markup.includes("Kimi K2.7 Code High Speed"), true);
});

test("CaptureWorkbenchSelectionBar selector source avoids native HTML selects", async () => {
  const sources = await Promise.all(
    SELECTOR_SOURCE_PATHS.map((sourcePath) => readFile(sourcePath, "utf8"))
  );

  for (const source of sources) {
    assert.equal(source.includes("<select"), false);
    assert.equal(source.includes("<option"), false);
    assert.equal(source.includes("<optgroup"), false);
  }
});

test("CaptureWorkbenchSelectionBar keeps sticky load/save and selection callback wiring", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes(".loadSelection()"), true);
  assert.equal(source.includes(".saveSelection({"), true);
  assert.equal(source.includes("onSelectionChange?.(nextSelection)"), true);
  assert.equal(source.includes("onReasoningChange={(reasoning) =>"), true);
  assert.equal(source.includes("useState<WorkbenchSelectionState>"), false);
  assert.equal(
    source.includes("readonly selection: WorkbenchSelectionState"),
    true
  );
  assert.equal(
    source.includes("> = ({ onSelectionChange, selection, stateClient }) =>"),
    true
  );
});

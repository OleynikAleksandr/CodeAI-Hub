import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildCaptureWorkbenchDiffSection } from "./diff-section-normalizer";
import { CaptureWorkbenchDiffSection } from "./diff-section";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/capture-workbench/diff-section.tsx"
);

test("CaptureWorkbenchDiffSection renders expanded side-by-side content", () => {
  const section = buildCaptureWorkbenchDiffSection({
    id: "system_prompt",
    left: "old system",
    right: "new system",
  });
  assert.ok(section);

  const markup = renderToStaticMarkup(
    <CaptureWorkbenchDiffSection
      initiallyExpanded={true}
      leftLabel="Previous"
      rightLabel="Current"
      section={section}
    />
  );

  assert.equal(markup.includes("System Prompt"), true);
  assert.equal(markup.includes("changed"), true);
  assert.equal(markup.includes("Previous"), true);
  assert.equal(markup.includes("Current"), true);
  assert.equal(markup.includes("old system"), true);
  assert.equal(markup.includes("new system"), true);
});

test("CaptureWorkbenchDiffSection keeps equal sections collapsed by default", () => {
  const section = buildCaptureWorkbenchDiffSection({
    id: "tools",
    left: [{ name: "Read" }],
    right: [{ name: "Read" }],
  });
  assert.ok(section);

  const markup = renderToStaticMarkup(
    <CaptureWorkbenchDiffSection
      leftLabel="Previous"
      rightLabel="Current"
      section={section}
    />
  );

  assert.equal(markup.includes("Tools"), true);
  assert.equal(markup.includes("equal"), true);
  assert.equal(markup.includes("Read"), false);
});

test("CaptureWorkbenchDiffSection has local expand/collapse wiring", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("useState("), true);
  assert.equal(source.includes("section.collapsedByDefault"), true);
  assert.equal(source.includes("setExpanded((current) => !current)"), true);
  assert.equal(source.includes("aria-expanded={expanded}"), true);
});

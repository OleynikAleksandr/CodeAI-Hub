import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DetachedCaptureWorkbench } from "./detached-capture-workbench";

const APP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/app.tsx"
);

test("Project Manager app routes detached capture mode through transport/localization wrapper", async () => {
  const source = await readFile(APP_SOURCE_PATH, "utf8");

  assert.equal(source.includes('"detached-capture"'), true);
  assert.equal(source.includes("<DetachedCaptureWorkbenchApp"), true);
  assert.equal(source.includes("api.connect();"), true);
  assert.equal(source.includes("<LocalizationProvider value={localization}>"), true);
});

test("DetachedCaptureWorkbench renders the prototype shell landmarks", () => {
  const markup = renderToStaticMarkup(
    <DetachedCaptureWorkbench
      workspacePath="/Users/example/workspace"
      workspaceSlug="workspace"
    />
  );

  assert.equal(markup.includes("Capture Workbench"), true);
  assert.equal(markup.includes("Description"), true);
  assert.equal(markup.includes("Managed: current vs previous"), true);
  assert.equal(markup.includes("/Users/example/workspace"), true);
});

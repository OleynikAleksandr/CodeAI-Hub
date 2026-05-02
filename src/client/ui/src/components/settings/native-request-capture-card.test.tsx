import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NativeRequestCaptureCard, {
  NATIVE_REQUEST_CAPTURE_SCENARIO_OPTIONS,
} from "./native-request-capture-card";

test("NativeRequestCaptureCard exposes Translation as a selectable capture scenario", () => {
  assert.equal(
    NATIVE_REQUEST_CAPTURE_SCENARIO_OPTIONS.some(
      (scenario) =>
        scenario.id === "translation" && scenario.label === "Translation"
    ),
    true
  );
});

test("NativeRequestCaptureCard renders only the Capture Workbench launcher", () => {
  (globalThis as typeof globalThis & { React: typeof React }).React = React;
  const markup = renderToStaticMarkup(
    <NativeRequestCaptureCard onOpenWorkbench={() => undefined} />
  );

  assert.equal(markup.includes("Provider Native Request Capture"), true);
  assert.equal(markup.includes("Open Capture Workbench"), true);
  assert.equal(markup.includes("<select"), false);
  assert.equal(markup.includes("Translation"), false);
  assert.equal(markup.includes("Virtual Simulation"), false);
});

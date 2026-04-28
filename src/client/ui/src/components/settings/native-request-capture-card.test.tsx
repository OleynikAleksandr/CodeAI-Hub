import assert from "node:assert/strict";
import test from "node:test";
import { NATIVE_REQUEST_CAPTURE_SCENARIO_OPTIONS } from "./native-request-capture-card";

test("NativeRequestCaptureCard exposes Translation as a selectable capture scenario", () => {
  assert.equal(
    NATIVE_REQUEST_CAPTURE_SCENARIO_OPTIONS.some(
      (scenario) =>
        scenario.id === "translation" && scenario.label === "Translation"
    ),
    true
  );
});

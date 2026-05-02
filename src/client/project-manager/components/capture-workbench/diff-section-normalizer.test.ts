import assert from "node:assert/strict";
import test from "node:test";
import { CAPTURE_WORKBENCH_DIFF_SECTIONS } from "./diff-section-model";
import {
  buildCaptureWorkbenchDiffSection,
  normalizeDiffContent,
  resolveDiffStatus,
} from "./diff-section-normalizer";

test("Capture Workbench diff model excludes deferred provider-home section", () => {
  assert.equal(
    CAPTURE_WORKBENCH_DIFF_SECTIONS.some((section) =>
      section.title.includes("Provider-home")
    ),
    false
  );
  assert.equal(
    CAPTURE_WORKBENCH_DIFF_SECTIONS.some(
      (section) => section.id === "process_profile_codex"
    ),
    true
  );
});

test("Capture Workbench diff normalizer compares stable structured content", () => {
  const left = normalizeDiffContent({ b: 2, a: { z: true, y: "value" } });
  const right = normalizeDiffContent({ a: { y: "value", z: true }, b: 2 });

  assert.equal(left, right);
  assert.equal(resolveDiffStatus(left, right), "equal");
});

test("Capture Workbench diff section status follows left/right presence", () => {
  assert.equal(
    buildCaptureWorkbenchDiffSection({
      id: "system_prompt",
      left: null,
      right: "system",
    })?.status,
    "added"
  );
  assert.equal(
    buildCaptureWorkbenchDiffSection({
      id: "tools",
      left: ["a"],
      right: ["b"],
    })?.collapsedByDefault,
    false
  );
  assert.equal(
    buildCaptureWorkbenchDiffSection({
      id: "endpoint",
      left: null,
      right: null,
    }),
    null
  );
});

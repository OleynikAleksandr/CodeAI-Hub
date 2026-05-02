import assert from "node:assert/strict";
import test from "node:test";
import {
  isWorkbenchArtifactReadPayload,
  isWorkbenchIndexFile,
  isWorkbenchSelectionFile,
  isWorkbenchStateKind,
  isWorkbenchStatePayload,
} from "./workbench-state-types";

test("workbench state validators accept index, selection and artifact read payloads", () => {
  assert.equal(
    isWorkbenchIndexFile({
      version: 1,
      slots: [
        {
          step: "description",
          provider: "claude",
          model: "sonnet",
          reasoning: "thinking-high",
          managed: {
            current: {
              markdownPath: "/tmp/current.md",
              jsonlPath: "/tmp/current.jsonl",
              artifactId: "current",
              capturedAt: "2026-05-02T10:00:00.000Z",
              releaseVersion: "1.2.123",
            },
            previous: null,
          },
          vanilla: { current: null, previous: null },
        },
      ],
    }),
    true
  );
  assert.equal(
    isWorkbenchSelectionFile({
      version: 1,
      selection: {
        step: "description",
        provider: "codex",
        model: "gpt-5.3-codex",
        reasoning: "reasoning-high",
      },
      updatedAt: "2026-05-02T10:00:00.000Z",
    }),
    true
  );
  assert.equal(
    isWorkbenchArtifactReadPayload({ jsonlPath: "/tmp/current.jsonl" }),
    true
  );
  assert.equal(isWorkbenchStateKind("index"), true);
  assert.equal(
    isWorkbenchStatePayload("selection", {
      version: 1,
      selection: null,
    }),
    true
  );
});

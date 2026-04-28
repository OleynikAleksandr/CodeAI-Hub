import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeSession } from "./normalizers";

test("sanitizeSession preserves serialized Core model binding", () => {
  const session = sanitizeSession({
    id: "session-1",
    title: "Session 1",
    providerId: "codexCli",
    workspacePath: "/workspace",
    createdAt: "2026-04-28T12:00:00.000Z",
    providerSessionId: "provider-session-1",
    providerSessionStatus: "ready",
    modelBinding: {
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex-spark",
      modelId: "gpt-5.3-codex-spark reasoning:xhigh",
      reasoningEffort: "xhigh",
      source: "settings_default",
      boundAt: "2026-04-28T12:00:00.000Z",
      updatedAt: "2026-04-28T12:00:00.000Z",
    },
  });

  assert.ok(session);
  assert.deepEqual(session.modelBinding, {
    providerId: "codexCli",
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "settings_default",
    boundAt: "2026-04-28T12:00:00.000Z",
    updatedAt: "2026-04-28T12:00:00.000Z",
  });
});

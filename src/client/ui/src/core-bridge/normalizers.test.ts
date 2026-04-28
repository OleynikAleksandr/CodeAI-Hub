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

test("sanitizeSession keeps same-provider sessions on distinct model bindings", () => {
  const first = sanitizeSession({
    id: "description-session",
    title: "Description",
    providerId: "codexCli",
    modelBinding: {
      providerId: "codexCli",
      modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    },
  });
  const second = sanitizeSession({
    id: "simulation-session",
    title: "Virtual Simulation",
    providerId: "codexCli",
    modelBinding: {
      providerId: "codexCli",
      modelId: "gpt-5.5 reasoning:medium",
    },
  });

  assert.equal(
    first?.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );
  assert.equal(second?.modelBinding?.modelId, "gpt-5.5 reasoning:medium");
  assert.notEqual(first?.modelBinding?.modelId, second?.modelBinding?.modelId);
});

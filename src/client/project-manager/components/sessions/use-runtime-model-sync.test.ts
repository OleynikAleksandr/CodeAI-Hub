import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import { applyRuntimeModelUpdate } from "./use-runtime-model-sync";

const createSnapshot = (
  modelId: string,
  source: "binding" | "runtime" | "settings"
): SessionSnapshot => ({
  binding: {
    providerSessionId: "provider-session",
    status: "ready",
  },
  draft: "",
  messages: [],
  status: {
    connectionState: "idle",
    models: [
      {
        modelDisplayName: modelId,
        modelId,
        providerId: "codexCli",
        providerName: "Codex",
        source,
      },
    ],
    providerSummary: "Codex",
    tokenUsage: { used: 0, limit: 200_000 },
    updatedAt: 1,
  },
  todos: [],
});

test("applyRuntimeModelUpdate does not overwrite binding-owned labels without binding payload", () => {
  const previous = {
    session: createSnapshot("gpt-5.3-codex-spark reasoning:xhigh", "binding"),
  };

  const next = applyRuntimeModelUpdate(previous, "session", {
    modelId: "gpt-5.5 reasoning:medium",
    providerId: "codexCli",
    sessionId: "other-session",
  });

  assert.equal(next, previous);
});

test("applyRuntimeModelUpdate applies explicit binding payload", () => {
  const previous = {
    session: createSnapshot("gpt-5.3-codex-spark reasoning:xhigh", "binding"),
  };

  const next = applyRuntimeModelUpdate(previous, "session", {
    modelBinding: {
      modelId: "gpt-5.5 reasoning:medium",
      providerId: "codexCli",
      reasoningEffort: "medium",
    },
    modelId: "gpt-5.5 reasoning:medium",
    providerId: "codexCli",
    sessionId: "session",
  });

  assert.notEqual(next, previous);
  assert.equal(
    next.session?.status.models?.[0]?.modelId,
    "gpt-5.5 reasoning:medium"
  );
  assert.equal(next.session?.status.models?.[0]?.source, "binding");
});

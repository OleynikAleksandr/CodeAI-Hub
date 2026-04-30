import assert from "node:assert/strict";
import test from "node:test";
import type {
  ModelInfo,
  SessionSnapshot,
} from "../../../../types/session";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import { createDefaultSettings } from "../../../ui/src/components/settings/settings-state-model";
import {
  createSessionModelSwitchHandlers,
  useSessionModelSwitch,
} from "./use-session-model-switch";

const createSnapshot = (model: ModelInfo): SessionSnapshot =>
  ({
    binding: { providerSessionId: null, status: "ready" },
    draft: "",
    messages: [],
    status: {
      connectionState: "idle",
      models: [model],
      providerSummary: model.providerName,
      tokenUsage: { used: 0, limit: 200_000 },
      updatedAt: 0,
    },
    todos: [],
  }) as SessionSnapshot;

const createCodexModel = (modelId: string, reasoning: string): ModelInfo => ({
  modelDisplayName: modelId,
  modelId,
  providerId: "codexCli",
  providerName: "Codex",
  reasoning,
  source: "binding",
});

const createHarness = (snapshots: Record<string, SessionSnapshot>) => {
  const savedSettings: Settings[] = [];
  const modelUpdates: Array<{
    readonly sessionId: string;
    readonly targetReasoningId?: string | null;
    readonly targetModelId: string;
  }> = [];
  const handlers = createSessionModelSwitchHandlers({
    saveSettings: (settings) => savedSettings.push(settings),
    setSessionModel: (sessionId, targetModelId, targetReasoningId) =>
      modelUpdates.push({ sessionId, targetModelId, targetReasoningId }),
    settings: createDefaultSettings(),
    snapshots,
  });

  return { handlers, modelUpdates, savedSettings };
};

test("createSessionModelSwitchHandlers routes reasoning changes through current base model", () => {
  const { handlers, modelUpdates, savedSettings } = createHarness({
    "session-1": createSnapshot(
      createCodexModel("gpt-5.3-codex-spark reasoning:medium", "medium")
    ),
  });

  handlers.onSelectSessionReasoning("session-1", "xhigh");

  assert.equal(
    savedSettings[0]?.providers.codex.reasoningByModel[
      "gpt-5.3-codex-spark"
    ],
    "xhigh"
  );
  assert.deepEqual(modelUpdates, [
    {
      sessionId: "session-1",
      targetModelId: "gpt-5.3-codex-spark",
      targetReasoningId: "xhigh",
    },
  ]);
});

test("createSessionModelSwitchHandlers routes model changes to selected model", () => {
  const { handlers, modelUpdates, savedSettings } = createHarness({
    "session-2": createSnapshot(
      createCodexModel("gpt-5.3-codex reasoning:high", "high")
    ),
  });

  handlers.onSelectSessionModel("session-2", "gpt-5.4-mini");

  assert.equal(savedSettings[0]?.providers.codex.defaultModel, "gpt-5.4-mini");
  assert.deepEqual(modelUpdates, [
    {
      sessionId: "session-2",
      targetModelId: "gpt-5.4-mini",
      targetReasoningId:
        savedSettings[0]?.providers.codex.reasoningByModel["gpt-5.4-mini"],
    },
  ]);
});

test("createSessionModelSwitchHandlers keeps pending model for immediate reasoning change", () => {
  const { handlers, modelUpdates, savedSettings } = createHarness({
    "session-3": createSnapshot(
      createCodexModel("gpt-5.3-codex reasoning:medium", "medium")
    ),
  });

  handlers.onSelectSessionModel("session-3", "gpt-5.4-mini");
  handlers.onSelectSessionReasoning("session-3", "xhigh");

  assert.equal(
    savedSettings[1]?.providers.codex.reasoningByModel["gpt-5.4-mini"],
    "xhigh"
  );
  assert.deepEqual(modelUpdates.at(-1), {
    sessionId: "session-3",
    targetModelId: "gpt-5.4-mini",
    targetReasoningId: "xhigh",
  });
});

test("createSessionModelSwitchHandlers ignores missing session snapshots", () => {
  const { handlers, modelUpdates, savedSettings } = createHarness({});

  handlers.onSelectSessionModel("missing", "gpt-5.4-mini");
  handlers.onSelectSessionReasoning("missing", "xhigh");

  assert.equal(savedSettings.length, 0);
  assert.equal(modelUpdates.length, 0);
});

test("useSessionModelSwitch stays exported for React wiring", () => {
  assert.equal(typeof useSessionModelSwitch, "function");
});

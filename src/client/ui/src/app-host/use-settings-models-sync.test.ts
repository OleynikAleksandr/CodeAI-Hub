import assert from "node:assert/strict";
import test from "node:test";
import type {
  ModelInfo,
  SessionRecord,
  SessionSnapshot,
} from "../../../../types/session";
import {
  createDefaultSettings,
  type Settings,
} from "../components/settings/settings-state-model";
import type { SessionSnapshots } from "../session/helpers";
import { applySettingsModels } from "./use-settings-models-sync";

const createSettingsWithCodexReasoning = (
  reasoning: Settings["providers"]["codex"]["reasoningByModel"][string]
): Settings => {
  const settings = createDefaultSettings();
  return {
    ...settings,
    providers: {
      ...settings.providers,
      codex: {
        ...settings.providers.codex,
        reasoningByModel: {
          ...settings.providers.codex.reasoningByModel,
          "gpt-5.3-codex": reasoning,
        },
      },
    },
  };
};

const createSettingsWithCodexDefault = (
  defaultModel: Settings["providers"]["codex"]["defaultModel"]
): Settings => {
  const settings = createDefaultSettings();
  return {
    ...settings,
    providers: {
      ...settings.providers,
      codex: {
        ...settings.providers.codex,
        defaultModel,
      },
    },
  };
};

const createSession = (
  overrides: Partial<SessionRecord> = {}
): SessionRecord => ({
  binding: {
    providerSessionId: "provider-session",
    status: "ready",
  },
  createdAt: 1,
  id: "session-1",
  providerIds: ["codexCli"],
  title: "Codex Session",
  workspacePath: "/workspace",
  ...overrides,
});

const createCodexModel = (
  params: Pick<ModelInfo, "modelId" | "modelDisplayName"> & {
    readonly reasoning?: string;
    readonly source?: ModelInfo["source"];
  }
): ModelInfo => ({
  providerId: "codexCli",
  providerName: "Codex",
  ...params,
});

const createSnapshot = (model: ModelInfo): SessionSnapshot => ({
  binding: {
    providerSessionId: "provider-session",
    status: "ready",
  },
  draft: "",
  messages: [],
  status: {
    connectionState: "idle",
    continuityLock: {
      active: false,
      updatedAt: 1,
    },
    models: [model],
    providerSummary: "Codex",
    tokenUsage: { used: 0, limit: 200_000 },
    updatedAt: 1,
  },
  todos: [],
});

test("applySettingsModels preserves session-bound model snapshots", () => {
  const session = createSession({
    modelBinding: {
      modelId: "gpt-5.3-codex reasoning:xhigh",
      providerId: "codexCli",
      reasoningEffort: "xhigh",
    },
  });
  const previous: SessionSnapshots = {
    [session.id]: createSnapshot(
      createCodexModel({
        modelDisplayName: "GPT 5.3 Codex",
        modelId: "gpt-5.3-codex reasoning:xhigh",
        reasoning: "xhigh",
        source: "binding",
      })
    ),
  };

  const next = applySettingsModels(
    previous,
    [session],
    createSettingsWithCodexDefault("gpt-5.4")
  );

  assert.equal(next, previous);
});

test("applySettingsModels preserves runtime-owned model snapshots", () => {
  const session = createSession();
  const previous: SessionSnapshots = {
    [session.id]: createSnapshot(
      createCodexModel({
        modelDisplayName: "GPT 5.3 Codex",
        modelId: "gpt-5.3-codex",
        source: "runtime",
      })
    ),
  };

  const next = applySettingsModels(
    previous,
    [session],
    createSettingsWithCodexDefault("gpt-5.4")
  );

  assert.equal(next, previous);
});

test("applySettingsModels still refreshes settings-owned reasoning", () => {
  const session = createSession();
  const previous: SessionSnapshots = {
    [session.id]: createSnapshot(
      createCodexModel({
        modelDisplayName: "GPT 5.3 Codex",
        modelId: "gpt-5.3-codex",
        reasoning: "reasoning medium",
        source: "settings",
      })
    ),
  };

  const next = applySettingsModels(
    previous,
    [session],
    createSettingsWithCodexReasoning("xhigh")
  );

  assert.notEqual(next, previous);
  assert.equal(
    next[session.id]?.status.models?.[0]?.reasoning,
    "reasoning xhigh"
  );
  assert.equal(next[session.id]?.status.models?.[0]?.source, "settings");
});

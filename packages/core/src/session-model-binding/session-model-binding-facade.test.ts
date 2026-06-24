import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSessionModelBindingKey,
  SessionModelBindingFacade,
} from "./index";
import { SessionModelBindingResolver } from "./session-model-binding-resolver";

const createTempSettingsPath = async (): Promise<{
  readonly homeDirectory: string;
  readonly settingsPath: string;
}> => {
  const homeDirectory = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-session-model-binding-")
  );
  return {
    homeDirectory,
    settingsPath: path.join(
      homeDirectory,
      ".codeai-hub",
      "settings",
      "settings.json"
    ),
  };
};

const writeSettings = async (
  settingsPath: string,
  settings: Record<string, unknown>
): Promise<void> => {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, {
    encoding: "utf8",
    flag: "w",
  });
};

const createResolver = (settingsPath: string): SessionModelBindingResolver =>
  new SessionModelBindingResolver({
    facade: new SessionModelBindingFacade({
      clock: () => "2026-04-28T12:00:00.000Z",
    }),
    providerTurnConfig: {
      env: {},
      fallbackClaudeModel: "sonnet",
      fallbackCodexModel: "gpt-5.3-codex",
      fallbackCodexReasoningEffort: "medium",
      settingsPath,
    },
  });

const createSettingsSnapshot = (): Record<string, unknown> => ({
  providers: {
    codex: {
      defaultModel: "gpt-5.4-mini",
      reasoningByModel: {
        "gpt-5.3-codex": "xhigh",
        "gpt-5.4-mini": "high",
      },
    },
    openRouter: {
      defaultModel: "openai/gpt-5-nano",
      endpointTag: "azure/swedencentral",
    },
  },
});

test("SessionModelBindingResolver binds settings default as full effective identity", async () => {
  const { homeDirectory, settingsPath } = await createTempSettingsPath();

  try {
    await writeSettings(settingsPath, createSettingsSnapshot());
    const resolver = createResolver(settingsPath);

    const binding = resolver.bindFromSettingsDefault({
      providerId: "codexCli",
      sessionId: "session-a",
      workspacePath: "/tmp/workspace-a",
    });

    assert.ok(binding);
    assert.equal(binding.providerId, "codexCli");
    assert.equal(binding.baseModelId, "gpt-5.4-mini");
    assert.equal(binding.modelId, "gpt-5.4-mini reasoning:high");
    assert.equal(binding.reasoningEffort, "high");
    assert.equal(binding.source, "settings_default");
    assert.equal(
      binding.key,
      buildSessionModelBindingKey({
        providerId: "codexCli",
        sessionId: "session-a",
        workspacePath: "/tmp/workspace-a",
      })
    );
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionModelBindingResolver binds explicit selection without changing settings default", async () => {
  const { homeDirectory, settingsPath } = await createTempSettingsPath();

  try {
    await writeSettings(settingsPath, createSettingsSnapshot());
    const resolver = createResolver(settingsPath);

    const binding = resolver.bindFromExplicitSelection({
      providerId: "codexCli",
      sessionId: "session-b",
      targetModelId: "gpt-5.3-codex",
      workspacePath: "/tmp/workspace-b",
    });

    assert.ok(binding);
    assert.equal(binding.baseModelId, "gpt-5.3-codex");
    assert.equal(binding.modelId, "gpt-5.3-codex reasoning:xhigh");
    assert.equal(binding.reasoningEffort, "xhigh");
    assert.equal(binding.source, "start_step_selection");
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

test("SessionModelBindingResolver binds OpenRouter settings model slug", async () => {
  const { homeDirectory, settingsPath } = await createTempSettingsPath();

  try {
    await writeSettings(settingsPath, createSettingsSnapshot());
    const resolver = createResolver(settingsPath);

    const binding = resolver.bindFromSettingsDefault({
      providerId: "openRouter",
      sessionId: "session-openrouter",
      workspacePath: "/tmp/workspace-openrouter",
    });

    assert.ok(binding);
    assert.equal(binding.baseModelId, "openai/gpt-5-nano");
    assert.equal(binding.modelId, "openai/gpt-5-nano");
    assert.equal(binding.source, "settings_default");
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
  }
});

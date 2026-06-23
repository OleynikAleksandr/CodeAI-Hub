import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { CoreConfig } from "../../config";
import type { SessionModelBinding } from "../../session-model-binding";
import { readAppliedProviderTurnConfig } from "../types";
import { SessionRequestHandlerAppliedTurnConfig } from "./session-request-handler-applied-turn-config";

const writeSettings = async (settingsPath: string): Promise<void> => {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify({
      providers: {
        openRouter: {
          defaultModel: "openai/gpt-5-nano",
          endpointTag: "azure/swedencentral",
        },
      },
    })}\n`,
    "utf8"
  );
};

const createConfig = (workspacePath: string): CoreConfig =>
  ({
    claudeDefaultModel: "sonnet",
    claudeProjectSlug: "workspace",
    claudeSettingsPath: "",
    claudeWorkspacePath: workspacePath,
    codexSkipGitRepoCheck: false,
    continuityPreemptRemainingPercentThreshold: 50,
    geminiSettingsPath: "",
    geminiThinkingLevelByModel: {},
    host: "127.0.0.1",
    idleTtlMinutes: null,
    managedMode: null,
    port: 8080,
    shutdownGracePeriodMs: 0,
    templatesDir: "",
  }) as CoreConfig;

test("OpenRouter applied turn config includes selected endpoint tag", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-openrouter-")
  );
  const settingsPath = path.join(
    workspacePath,
    ".codeai-hub",
    "runtime",
    "settings.json"
  );

  try {
    await writeSettings(settingsPath);
    const binding: SessionModelBinding = {
      boundAt: "2026-06-23T00:00:00.000Z",
      key: "openrouter",
      modelId: "openai/gpt-5-nano",
      providerId: "openRouter",
      settingsPath,
      source: "settings_default",
      updatedAt: "2026-06-23T00:00:00.000Z",
    };
    const handler = new SessionRequestHandlerAppliedTurnConfig(
      createConfig(workspacePath)
    );

    const turnOptions = handler.attachToTurnOptions({
      providerId: "openRouter",
      sessionModelBinding: binding,
    });

    assert.equal(turnOptions?.openRouterEndpointTag, "azure/swedencentral");
    assert.equal(
      readAppliedProviderTurnConfig(turnOptions)?.modelId,
      "openai/gpt-5-nano"
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGlmClaudeCodeRuntimeProbeProfile } from "./glm-claude-code-runtime-profile";

test("GLM-Claude-Code probe profile resolves non-empty workspace settings without persisting secrets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-settings-inline-"));
  try {
    const profile = await buildGlmClaudeCodeRuntimeProbeProfile({
      env: {
        ANTHROPIC_API_KEY: " ",
        CODEAI_GLM_CLAUDE_CODE_API_KEY: " ",
        CODEAI_GLM_CLAUDE_CODE_CONFIG_PATH: path.join(
          dir,
          "global-config.json"
        ),
        GLM_CLAUDE_CODE_API_KEY: " ",
        ZAI_API_KEY: " ",
      },
      home: "/tmp/glm-provider-home",
      workspaceSettings: {
        apiKey: "workspace-secret",
        baseUrl: "https://workspace.example/anthropic",
        haikuModel: "workspace-haiku",
        sonnetModel: "workspace-sonnet",
      },
    });

    assert.equal(profile.diagnostics.apiKeySource, "workspace_settings");
    assert.equal(profile.env.ANTHROPIC_API_KEY, "workspace-secret");
    assert.equal(
      profile.env.ANTHROPIC_BASE_URL,
      "https://workspace.example/anthropic"
    );
    assert.equal(profile.env.ANTHROPIC_DEFAULT_HAIKU_MODEL, "workspace-haiku");
    assert.equal(
      profile.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      "workspace-sonnet"
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("GLM-Claude-Code probe profile reads persisted workspace settings path", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-settings-"));
  const settingsPath = path.join(dir, "settings.json");
  try {
    await writeFile(
      settingsPath,
      JSON.stringify({
        providers: {
          glmClaudeCode: {
            apiKey: "persisted-secret",
            baseUrl: "https://persisted.example/anthropic",
            haikuModel: "persisted-haiku",
            sonnetModel: "persisted-sonnet",
          },
        },
      }),
      "utf8"
    );

    const profile = await buildGlmClaudeCodeRuntimeProbeProfile({
      env: {
        CODEAI_GLM_CLAUDE_CODE_CONFIG_PATH: path.join(
          dir,
          "global-config.json"
        ),
        CODEAI_GLM_CLAUDE_CODE_WORKSPACE_SETTINGS_PATH: settingsPath,
      },
      home: path.join(dir, "home"),
    });

    assert.equal(profile.diagnostics.apiKeyAvailable, true);
    assert.equal(profile.diagnostics.apiKeySource, "workspace_settings");
    assert.equal(profile.env.ANTHROPIC_API_KEY, "persisted-secret");
    assert.equal(
      profile.env.ANTHROPIC_BASE_URL,
      "https://persisted.example/anthropic"
    );
    assert.equal(profile.env.ANTHROPIC_DEFAULT_HAIKU_MODEL, "persisted-haiku");
    assert.equal(
      profile.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
      "persisted-sonnet"
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("GLM-Claude-Code probe profile upgrades legacy persisted model aliases", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-legacy-settings-"));
  const settingsPath = path.join(dir, "settings.json");
  try {
    await writeFile(
      settingsPath,
      JSON.stringify({
        providers: {
          glmClaudeCode: {
            apiKey: "persisted-secret",
            haikuModel: "glm-4.5-air",
            opusModel: "glm-5.1",
            sonnetModel: "glm-5-turbo",
          },
        },
      }),
      "utf8"
    );

    const profile = await buildGlmClaudeCodeRuntimeProbeProfile({
      env: {
        CODEAI_GLM_CLAUDE_CODE_CONFIG_PATH: path.join(
          dir,
          "global-config.json"
        ),
        CODEAI_GLM_CLAUDE_CODE_WORKSPACE_SETTINGS_PATH: settingsPath,
      },
      home: path.join(dir, "home"),
    });

    assert.equal(profile.env.ANTHROPIC_DEFAULT_HAIKU_MODEL, "glm-5.2");
    assert.equal(profile.env.ANTHROPIC_DEFAULT_OPUS_MODEL, "glm-5.2");
    assert.equal(profile.env.ANTHROPIC_DEFAULT_SONNET_MODEL, "glm-5.2");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

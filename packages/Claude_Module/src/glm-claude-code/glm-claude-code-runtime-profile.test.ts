import assert from "node:assert/strict";
import test from "node:test";
import { buildGlmClaudeCodeRuntimeProbeProfile } from "./glm-claude-code-runtime-profile";

test("GLM-Claude-Code probe profile resolves non-empty workspace settings without persisting secrets", async () => {
  const profile = await buildGlmClaudeCodeRuntimeProbeProfile({
    env: {
      ANTHROPIC_API_KEY: " ",
      CODEAI_GLM_CLAUDE_CODE_API_KEY: " ",
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
  assert.equal(profile.env.ANTHROPIC_DEFAULT_SONNET_MODEL, "workspace-sonnet");
});

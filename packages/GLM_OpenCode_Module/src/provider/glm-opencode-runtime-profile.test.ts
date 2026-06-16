import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildGlmOpenCodeRuntimeProfile,
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
} from "./glm-opencode-runtime-profile";

test("runtime profile reads config and keeps glm-5.2 as OpenCode selector", () => {
  const root = mkdtempSync(path.join(tmpdir(), "glm-opencode-profile-"));
  const configPath = path.join(root, "config.json");
  const providerHomePath = path.join(root, "home");
  writeFileSync(
    configPath,
    JSON.stringify({
      apiKey: "secret-key",
      model: "glm-5.2",
      providerHomePath,
    })
  );

  const profile = buildGlmOpenCodeRuntimeProfile({
    configPath,
    environment: { PATH: "" },
  });

  assert.equal(profile.apiKey, "secret-key");
  assert.equal(profile.modelSelector, GLM_OPENCODE_DEFAULT_MODEL_SELECTOR);
  assert.equal(profile.providerHomePath, providerHomePath);
  assert.equal(profile.environment.ZAI_API_KEY, "secret-key");
  assert.equal(profile.environment.HOME, path.join(providerHomePath, "home"));
  const openCodeConfig = JSON.parse(
    readFileSync(
      path.join(providerHomePath, "config", "opencode", "opencode.json"),
      "utf8"
    )
  );
  const openCodeAuth = JSON.parse(
    readFileSync(
      path.join(providerHomePath, "data", "opencode", "auth.json"),
      "utf8"
    )
  );
  assert.equal(openCodeConfig.model, "zai-coding-plan/glm-5.2");
  assert.equal(
    openCodeConfig.provider["zai-coding-plan"].options.baseURL,
    "https://api.z.ai/api/coding/paas/v4"
  );
  assert.equal(
    openCodeConfig.provider["zai-coding-plan"].options.timeout,
    120_000
  );
  assert.equal(
    openCodeConfig.provider["zai-coding-plan"].options.chunkTimeout,
    60_000
  );
  assert.equal(openCodeAuth["zai-coding-plan"].key, "secret-key");
});

test("runtime profile prefers environment key over config key", () => {
  const root = mkdtempSync(path.join(tmpdir(), "glm-opencode-profile-"));
  const configPath = path.join(root, "config.json");
  writeFileSync(configPath, JSON.stringify({ apiKey: "config-key" }));

  const profile = buildGlmOpenCodeRuntimeProfile({
    configPath,
    environment: { PATH: "", ZAI_API_KEY: "env-key" },
    providerHomePath: path.join(root, "home"),
  });

  assert.equal(profile.apiKey, "env-key");
});

test("runtime profile reads api key and model from workspace settings", () => {
  const root = mkdtempSync(path.join(tmpdir(), "glm-opencode-profile-"));
  const settingsPath = path.join(root, "settings.json");
  const providerHomePath = path.join(root, "home");
  writeFileSync(
    settingsPath,
    JSON.stringify({
      providers: {
        glmOpenCode: {
          apiKey: "settings-key",
          configPath: path.join(root, "missing-config.json"),
          defaultModel: "glm-5.2",
        },
      },
    })
  );

  const profile = buildGlmOpenCodeRuntimeProfile({
    environment: { PATH: "" },
    providerHomePath,
    settingsPath,
  });

  assert.equal(profile.apiKey, "settings-key");
  assert.equal(profile.modelSelector, GLM_OPENCODE_DEFAULT_MODEL_SELECTOR);
});

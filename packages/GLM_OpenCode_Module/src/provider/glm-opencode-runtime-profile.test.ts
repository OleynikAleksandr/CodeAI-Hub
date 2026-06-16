import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildGlmOpenCodeRuntimeProfile,
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
} from "./glm-opencode-runtime-profile";

test("runtime profile reads config and maps glm-5.2 to OpenCode selector", () => {
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

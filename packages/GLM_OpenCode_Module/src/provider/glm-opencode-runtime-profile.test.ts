import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  buildGlmOpenCodeRuntimeProfile,
  DEFAULT_GLM_OPENCODE_CONFIG_PATH,
  DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH,
  GLM_OPENCODE_DEFAULT_MODEL_SELECTOR,
  KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR,
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
  assert.equal(existsSync(path.join(providerHomePath, "home")), true);
  assert.equal(existsSync(path.join(providerHomePath, "cache")), true);
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
  assert.equal(openCodeConfig.small_model, "zai-coding-plan/glm-5.2");
  assert.equal(openCodeConfig.agent["codeai-hub"].mode, "primary");
  assert.equal(openCodeConfig.provider, undefined);
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

test("runtime profile reads api key and kimi model from workspace settings", () => {
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
          defaultModel: "kimi-k2.7-code",
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
  assert.equal(profile.modelSelector, KIMI_OPENCODE_DEFAULT_MODEL_SELECTOR);
});

test("runtime profile copies OpenCode app auth", () => {
  const root = mkdtempSync(path.join(tmpdir(), "glm-opencode-profile-"));
  const dataHome = path.join(root, "xdg-data");
  const providerHomePath = path.join(root, "home");
  mkdirSync(path.join(dataHome, "opencode"), { recursive: true });
  writeFileSync(
    path.join(dataHome, "opencode", "auth.json"),
    JSON.stringify({
      "zai-coding-plan": {
        key: "opencode-app-key",
        type: "api",
      },
      "kimi-for-coding": {
        key: "kimi-opencode-app-key",
        type: "api",
      },
    })
  );

  const profile = buildGlmOpenCodeRuntimeProfile({
    configPath: path.join(root, "missing-config.json"),
    environment: { PATH: "", XDG_DATA_HOME: dataHome },
    providerHomePath,
    settingsPath: path.join(root, "missing-settings.json"),
  });

  assert.equal(profile.apiKey, undefined);
  assert.equal(profile.environment.ZAI_API_KEY, undefined);
  const openCodeAuth = JSON.parse(
    readFileSync(
      path.join(providerHomePath, "data", "opencode", "auth.json"),
      "utf8"
    )
  );
  assert.equal(openCodeAuth["zai-coding-plan"].key, "opencode-app-key");
  assert.equal(openCodeAuth["kimi-for-coding"].key, "kimi-opencode-app-key");
});

test("runtime profile falls back to legacy glm-opencode paths when canonical opencode paths are absent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "glm-opencode-profile-"));
  const legacyConfigRoot = path.join(
    root,
    ".codeai-hub",
    "providers",
    "glm-opencode"
  );
  const legacyConfigPath = path.join(legacyConfigRoot, "config.json");
  const legacyProviderHomePath = path.join(legacyConfigRoot, "home");
  mkdirSync(legacyConfigRoot, { recursive: true });
  writeFileSync(
    legacyConfigPath,
    JSON.stringify({
      apiKey: "legacy-key",
      providerHomePath: legacyProviderHomePath,
    })
  );

  const profile = buildGlmOpenCodeRuntimeProfile({
    environment: { HOME: root, PATH: "" },
  });

  assert.equal(profile.configPath, legacyConfigPath);
  assert.equal(profile.providerHomePath, legacyProviderHomePath);
  assert.equal(profile.apiKey, "legacy-key");
  assert.equal(
    profile.environment.HOME,
    path.join(legacyProviderHomePath, "home")
  );
  assert.equal(
    DEFAULT_GLM_OPENCODE_CONFIG_PATH,
    "~/.codeai-hub/providers/opencode/config.json"
  );
  assert.equal(
    DEFAULT_GLM_OPENCODE_PROVIDER_HOME_PATH,
    "~/.codeai-hub/providers/opencode/home"
  );
});

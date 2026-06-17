import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { buildGlmRuntimeProfile } from "./glm-native-runtime-profile";

test("buildGlmRuntimeProfile reads GLM connection settings from global settings", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-runtime-profile-"));
  const globalSettingsPath = path.join(dir, "global", "settings.json");
  const workspaceSettingsPath = path.join(dir, "workspace", "settings.json");
  const previousGlobalSettingsPath = process.env.CODEAI_GLOBAL_SETTINGS_PATH;
  process.env.CODEAI_GLOBAL_SETTINGS_PATH = globalSettingsPath;
  try {
    await mkdir(path.dirname(globalSettingsPath), { recursive: true });
    await mkdir(path.dirname(workspaceSettingsPath), { recursive: true });
    await writeFile(
      globalSettingsPath,
      JSON.stringify({
        providers: {
          glmNative: {
            apiKey: "zai-global-key",
            baseUrl: "https://global.z.ai/api/coding/paas/v4",
          },
        },
      }),
      "utf8"
    );
    await writeFile(
      workspaceSettingsPath,
      JSON.stringify({
        providers: {
          glmNative: {
            defaultModel: "glm-5.2",
            reasoningEffort: "high",
          },
        },
      }),
      "utf8"
    );

    const profile = buildGlmRuntimeProfile({
      settingsPath: workspaceSettingsPath,
    });

    assert.equal(profile.apiKey, "zai-global-key");
    assert.equal(profile.baseUrl, "https://global.z.ai/api/coding/paas/v4");
    assert.equal(profile.reasoningEffort, "high");
  } finally {
    if (previousGlobalSettingsPath === undefined) {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = undefined;
    } else {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = previousGlobalSettingsPath;
    }
    await rm(dir, { force: true, recursive: true });
  }
});

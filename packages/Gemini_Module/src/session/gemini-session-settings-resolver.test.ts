import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { GeminiCliModules } from "../runtime/cli-types";
import { GeminiSessionSettingsResolver } from "./gemini-session-settings-resolver";

const createModules = (): GeminiCliModules =>
  ({
    contentGenerator: {
      AuthType: {
        LEGACY_CLOUD_SHELL: "legacy_cloud_shell",
        LOGIN_WITH_GOOGLE: "login_with_google",
        USE_GEMINI: "use_gemini",
        USE_VERTEX_AI: "use_vertex_ai",
      },
    },
    settings: {
      loadSettings: () => ({
        merged: {
          security: {
            auth: {
              selectedType: "gemini-api-key",
            },
          },
        },
      }),
      migrateDeprecatedSettings: () => {
        // noop
      },
    },
  }) as unknown as GeminiCliModules;

const writeGeminiSettings = async (
  settingsPath: string,
  options: {
    readonly contextWindowTokenLimit: number;
    readonly defaultModel: string;
    readonly thinkingLevel: string;
  }
): Promise<void> => {
  await writeFile(
    settingsPath,
    `${JSON.stringify(
      {
        providers: {
          gemini: {
            defaultModel: options.defaultModel,
            sessionContinuity: {
              contextWindowTokenLimit: options.contextWindowTokenLimit,
            },
            thinkingLevelByModel: {
              [options.defaultModel]: options.thinkingLevel,
            },
          },
        },
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

test("GeminiSessionSettingsResolver reuses cached settings until cache expiry", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "gemini-settings-cache-"));
  const settingsPath = path.join(tempDir, "settings.json");

  try {
    await writeGeminiSettings(settingsPath, {
      contextWindowTokenLimit: 123_456,
      defaultModel: "gemini-2.5-pro",
      thinkingLevel: "high",
    });
    const resolver = new GeminiSessionSettingsResolver(createModules());

    const first = resolver.resolve({
      settingsPath,
      workspacePath: "/tmp/codeai-workspace",
    });

    await writeGeminiSettings(settingsPath, {
      contextWindowTokenLimit: 654_321,
      defaultModel: "gemini-3-pro",
      thinkingLevel: "low",
    });
    const cached = resolver.resolve({
      settingsPath,
      workspacePath: "/tmp/codeai-workspace",
    });

    const cacheOwner = resolver as unknown as {
      settingsSnapshotCache: { expiresAtMs: number } | null;
    };
    if (cacheOwner.settingsSnapshotCache) {
      cacheOwner.settingsSnapshotCache.expiresAtMs = 0;
    }
    const expired = resolver.resolve({
      settingsPath,
      workspacePath: "/tmp/codeai-workspace",
    });

    assert.equal(first.resolvedModel, "gemini-2.5-pro");
    assert.equal(first.resolvedThinkingLevel, "high");
    assert.equal(first.contextWindowTokenLimit, 123_456);
    assert.equal(cached.resolvedModel, "gemini-2.5-pro");
    assert.equal(cached.resolvedThinkingLevel, "high");
    assert.equal(cached.contextWindowTokenLimit, 123_456);
    assert.equal(expired.resolvedModel, "gemini-3-pro");
    assert.equal(expired.resolvedThinkingLevel, "low");
    assert.equal(expired.contextWindowTokenLimit, 654_321);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

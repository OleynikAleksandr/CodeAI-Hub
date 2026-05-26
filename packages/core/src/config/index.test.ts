import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig, resolvePreferredCodexDefaultModel } from "./index";

type ConfigEnvName =
  | "CLAUDE_PROJECT_SLUG"
  | "CLAUDE_SETTINGS_PATH"
  | "CLAUDE_WORKSPACE_PATH";

const CONFIG_ENV_NAMES: readonly ConfigEnvName[] = [
  "CLAUDE_PROJECT_SLUG",
  "CLAUDE_SETTINGS_PATH",
  "CLAUDE_WORKSPACE_PATH",
] as const;

const withConfigEnv = async (
  values: Partial<Record<ConfigEnvName, string>>,
  callback: () => Promise<void> | void
): Promise<void> => {
  const previousValues = new Map<ConfigEnvName, string | undefined>();
  for (const name of CONFIG_ENV_NAMES) {
    previousValues.set(name, process.env[name]);
    const nextValue = values[name];
    if (nextValue === undefined) {
      Reflect.deleteProperty(process.env, name);
    } else {
      process.env[name] = nextValue;
    }
  }

  try {
    await callback();
  } finally {
    for (const [name, previousValue] of previousValues) {
      if (previousValue === undefined) {
        Reflect.deleteProperty(process.env, name);
      } else {
        process.env[name] = previousValue;
      }
    }
  }
};

test("resolvePreferredCodexDefaultModel prefers saved settings over stale env", () => {
  const model = resolvePreferredCodexDefaultModel({
    settingsDefaultModel: "gpt-5.4",
    envDefaultModel: "gpt-5.3-codex",
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.4");
});

test("resolvePreferredCodexDefaultModel falls back to env when settings are absent", () => {
  const model = resolvePreferredCodexDefaultModel({
    envDefaultModel: "gpt-5.4",
    fallbackModel: "gpt-5.3-codex",
  });

  assert.equal(model, "gpt-5.4");
});

test("loadConfig ignores legacy global settings env path", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "core-config-"));
  try {
    await withConfigEnv(
      {
        CLAUDE_PROJECT_SLUG: "demo-workspace",
        CLAUDE_SETTINGS_PATH: path.join(
          homedir(),
          ".codeai-hub",
          "settings",
          "settings.json"
        ),
        CLAUDE_WORKSPACE_PATH: workspacePath,
      },
      () => {
        const config = loadConfig();

        assert.equal(
          config.claudeSettingsPath,
          path.join(
            workspacePath,
            ".codeai-hub",
            "demo-workspace",
            "runtime",
            "settings",
            "settings.json"
          )
        );
      }
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("loadConfig preserves explicit non-legacy settings env path", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "core-config-"));
  const settingsPath = path.join(workspacePath, "custom-settings.json");
  try {
    await withConfigEnv(
      {
        CLAUDE_PROJECT_SLUG: "demo-workspace",
        CLAUDE_SETTINGS_PATH: settingsPath,
        CLAUDE_WORKSPACE_PATH: workspacePath,
      },
      () => {
        const config = loadConfig();

        assert.equal(config.claudeSettingsPath, settingsPath);
      }
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { LmsCommandRunner } from "./local-models-cli";
import { warmSelectedLocalModels } from "./local-models-warmup-service";

const createModelListJson = (): string =>
  JSON.stringify([
    {
      displayName: "Reasoning Local",
      maxContextLength: 262_144,
      modelKey: "reasoning-local",
      type: "llm",
    },
    {
      displayName: "Workflow Local",
      maxContextLength: 262_144,
      modelKey: "workflow-local",
      type: "llm",
    },
    {
      displayName: "Shared Local",
      maxContextLength: 262_144,
      modelKey: "shared-local",
      type: "llm",
    },
  ]);

const createLoadedModelsJson = (
  records: readonly Record<string, unknown>[]
): string =>
  JSON.stringify(records.map((record) => ({ ...record, type: "llm" })));

const withSettings = async (
  params: {
    readonly reasoningEngineId?: string;
    readonly workflowModel?: string;
  },
  run: (settingsPath: string) => void
): Promise<void> => {
  const dir = await mkdtemp(path.join(tmpdir(), "lm-warmup-"));
  const settingsPath = path.join(dir, "settings.json");
  const globalSettingsPath = path.join(dir, "global-settings.json");
  const previousGlobalSettingsPath = process.env.CODEAI_GLOBAL_SETTINGS_PATH;
  try {
    await writeFile(
      settingsPath,
      JSON.stringify({
        providers: {
          localModels: {
            defaultModel: params.workflowModel,
          },
        },
      }),
      "utf8"
    );
    await writeFile(
      globalSettingsPath,
      JSON.stringify({
        general: {
          localization: {
            reasoningEngineId: params.reasoningEngineId,
          },
        },
      }),
      "utf8"
    );
    process.env.CODEAI_GLOBAL_SETTINGS_PATH = globalSettingsPath;
    run(settingsPath);
  } finally {
    if (previousGlobalSettingsPath === undefined) {
      Reflect.deleteProperty(process.env, "CODEAI_GLOBAL_SETTINGS_PATH");
    } else {
      process.env.CODEAI_GLOBAL_SETTINGS_PATH = previousGlobalSettingsPath;
    }
    await rm(dir, { force: true, recursive: true });
  }
};

test("warmSelectedLocalModels preloads reasoning and defers workflow models", async () => {
  await withSettings(
    {
      reasoningEngineId: "lmstudio:reasoning-local",
      workflowModel: "workflow-local",
    },
    (settingsPath) => {
      const commandCalls: string[][] = [];
      const commandRunner: LmsCommandRunner = (args) => {
        commandCalls.push([...args]);
        if (args[0] === "server" && args[1] === "status") {
          return "Server: ON (port: 1234)";
        }
        if (args[0] === "ls") {
          return createModelListJson();
        }
        if (args[0] === "ps") {
          return "[]";
        }
        return "";
      };

      const result = warmSelectedLocalModels({
        commandRunner,
        settingsPath,
      });

      assert.deepEqual(
        result.loaded.map((record) => [
          record.modelKey,
          record.purpose,
          record.identifier,
        ]),
        [
          [
            "reasoning-local",
            "translation-reasoning",
            "codeaihub-translation-reasoning-reasoning-local-8192",
          ],
        ]
      );
      assert.deepEqual(
        result.skipped.map((record) => [
          record.modelKey,
          record.purpose,
          record.reason,
        ]),
        [["workflow-local", "workflow-agent", "deferred_until_turn"]]
      );
      assert.deepEqual(
        commandCalls.filter((args) => args[0] === "load"),
        [
          [
            "load",
            "reasoning-local",
            "--context-length",
            "8192",
            "--identifier",
            "codeaihub-translation-reasoning-reasoning-local-8192",
          ],
        ]
      );
      assert.equal(
        commandCalls.some((args) => args[0] === "unload"),
        false
      );
    }
  );
});

test("warmSelectedLocalModels dedupes the same reasoning and workflow model", async () => {
  await withSettings(
    {
      reasoningEngineId: "lmstudio:shared-local",
      workflowModel: "shared-local",
    },
    (settingsPath) => {
      const commandCalls: string[][] = [];
      const result = warmSelectedLocalModels({
        commandRunner: ((args) => {
          commandCalls.push([...args]);
          if (args[0] === "server" && args[1] === "status") {
            return "Server: ON (port: 1234)";
          }
          if (args[0] === "ls") {
            return createModelListJson();
          }
          if (args[0] === "ps") {
            return "[]";
          }
          return "";
        }) as LmsCommandRunner,
        settingsPath,
      });

      assert.equal(result.loaded.length, 1);
      assert.deepEqual(result.loaded[0], {
        identifier: "codeaihub-translation-reasoning-shared-local-8192",
        modelKey: "shared-local",
        purpose: "translation-reasoning",
        sources: ["reasoning", "workflow"],
      });
      assert.equal(commandCalls.filter((args) => args[0] === "load").length, 1);
    }
  );
});

test("warmSelectedLocalModels unloads stale idle CodeAI workers after reconcile", async () => {
  await withSettings(
    {
      reasoningEngineId: "lmstudio:reasoning-local",
      workflowModel: "workflow-local",
    },
    (settingsPath) => {
      const commandCalls: string[][] = [];
      warmSelectedLocalModels({
        commandRunner: ((args) => {
          commandCalls.push([...args]);
          if (args[0] === "server" && args[1] === "status") {
            return "Server: ON (port: 1234)";
          }
          if (args[0] === "ls") {
            return createModelListJson();
          }
          if (args[0] === "ps") {
            return createLoadedModelsJson([
              {
                contextLength: 16_384,
                identifier: "codeaihub-workflow-agent-workflow-local-16384",
                modelKey: "workflow-local",
                status: "idle",
              },
              {
                contextLength: 8192,
                identifier: "codeaihub-translation-reasoning-old-local-8192",
                modelKey: "old-local",
                status: "idle",
              },
            ]);
          }
          return "";
        }) as LmsCommandRunner,
        settingsPath,
      });

      assert.deepEqual(
        commandCalls.filter((args) => args[0] === "unload"),
        [["unload", "codeaihub-translation-reasoning-old-local-8192"]]
      );
    }
  );
});

test("warmSelectedLocalModels skips softly when LM Studio server is unavailable", async () => {
  await withSettings(
    {
      reasoningEngineId: "lmstudio:reasoning-local",
      workflowModel: "workflow-local",
    },
    (settingsPath) => {
      const warnings: string[] = [];
      const result = warmSelectedLocalModels({
        commandRunner: ((args) => {
          if (args[0] === "server" && args[1] === "status") {
            return "Server: OFF";
          }
          if (args[0] === "server" && args[1] === "start") {
            throw new Error("start failed");
          }
          return "";
        }) as LmsCommandRunner,
        reporter: {
          warn(message) {
            warnings.push(message);
          },
        },
        settingsPath,
      });

      assert.deepEqual(result.loaded, []);
      assert.deepEqual(
        result.skipped.map((record) => [
          record.modelKey,
          record.reason,
          record.error,
        ]),
        [
          [
            "reasoning-local",
            "server_unavailable",
            "lmstudio_server_start_failed",
          ],
          [
            "workflow-local",
            "server_unavailable",
            "lmstudio_server_start_failed",
          ],
        ]
      );
      assert.equal(warnings.includes("LM Studio warmup skipped"), true);
    }
  );
});

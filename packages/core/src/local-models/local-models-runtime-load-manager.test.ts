import assert from "node:assert/strict";
import test from "node:test";
import type { LocalModelDescriptor } from "./local-models-facade";
import { LocalModelsRuntimeLoadManager } from "./local-models-runtime-load-manager";

const createModel = (
  modelKey: string,
  maxContextLength = 262_144
): LocalModelDescriptor => ({
  displayName: modelKey,
  engineId: `lmstudio:${modelKey}`,
  maxContextLength,
  modelKey,
});

const createLoadedModelsJson = (
  records: readonly {
    readonly contextLength: number;
    readonly identifier: string;
    readonly modelKey: string;
    readonly status?: string;
  }[]
): string =>
  JSON.stringify(
    records.map((record) => ({
      ...record,
      type: "llm",
    }))
  );

test("LocalModelsRuntimeLoadManager uses a bounded adaptive context for localization", () => {
  const commandCalls: string[][] = [];
  const manager = new LocalModelsRuntimeLoadManager({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      return args[0] === "ps" ? "[]" : "";
    },
  });

  const identifier = manager.ensureModelLoaded({
    maxTokens: 4096,
    model: createModel("hy-mt2-30b-a3b-mlx"),
    purpose: "translation-localization",
    sourceTextLength: 10_000,
  });

  assert.equal(
    identifier,
    "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-16384"
  );
  assert.deepEqual(commandCalls, [
    ["ps", "--json"],
    [
      "load",
      "hy-mt2-30b-a3b-mlx",
      "--context-length",
      "16384",
      "--identifier",
      "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-16384",
    ],
  ]);
});

test("LocalModelsRuntimeLoadManager keeps reasoning translation on the small profile", () => {
  const commandCalls: string[][] = [];
  const manager = new LocalModelsRuntimeLoadManager({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      return args[0] === "ps" ? "[]" : "";
    },
  });

  const identifier = manager.ensureModelLoaded({
    model: createModel("gemma-4-26b-a4b-it"),
    purpose: "translation-reasoning",
    sourceTextLength: 400,
  });

  assert.equal(
    identifier,
    "codeaihub-translation-reasoning-gemma-4-26b-a4b-it-8192"
  );
  assert.equal(commandCalls[1]?.[3], "8192");
});

test("LocalModelsRuntimeLoadManager reuses sufficient loads and unloads only idle duplicate clones", () => {
  const commandCalls: string[][] = [];
  const manager = new LocalModelsRuntimeLoadManager({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ps") {
        return createLoadedModelsJson([
          {
            contextLength: 32_768,
            identifier:
              "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-32768",
            modelKey: "hy-mt2-30b-a3b-mlx",
            status: "idle",
          },
          {
            contextLength: 8192,
            identifier: "hy-mt2-30b-a3b-mlx",
            modelKey: "hy-mt2-30b-a3b-mlx",
            status: "idle",
          },
          {
            contextLength: 8192,
            identifier: "hy-mt2-30b-a3b-mlx:2",
            modelKey: "hy-mt2-30b-a3b-mlx",
            status: "idle",
          },
          {
            contextLength: 8192,
            identifier: "hy-mt2-30b-a3b-mlx:3",
            modelKey: "hy-mt2-30b-a3b-mlx",
            status: "generating",
          },
        ]);
      }
      return "";
    },
  });

  const identifier = manager.ensureModelLoaded({
    maxTokens: 4096,
    model: createModel("hy-mt2-30b-a3b-mlx"),
    purpose: "translation-localization",
    sourceTextLength: 10_000,
  });

  assert.equal(
    identifier,
    "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-32768"
  );
  assert.equal(
    commandCalls.some((args) => args[0] === "load"),
    false
  );
  assert.deepEqual(
    commandCalls.filter((args) => args[0] === "unload"),
    [
      ["unload", "hy-mt2-30b-a3b-mlx"],
      ["unload", "hy-mt2-30b-a3b-mlx:2"],
    ]
  );
});

test("LocalModelsRuntimeLoadManager unloads idle CodeAI workers across model keys", () => {
  const commandCalls: string[][] = [];
  const manager = new LocalModelsRuntimeLoadManager({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ps") {
        return createLoadedModelsJson([
          {
            contextLength: 16_384,
            identifier:
              "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-16384",
            modelKey: "hy-mt2-30b-a3b-mlx",
            status: "idle",
          },
          {
            contextLength: 16_384,
            identifier: "codeaihub-workflow-agent-qwen3.6-27b-mlx-16384",
            modelKey: "qwen3.6-27b-mlx",
            status: "generating",
          },
          {
            contextLength: 16_384,
            identifier: "rugpt-3.5-13b",
            modelKey: "rugpt-3.5-13b",
            status: "idle",
          },
        ]);
      }
      return "";
    },
  });

  const identifier = manager.ensureModelLoaded({
    model: createModel("gemma-4-26b-a4b-it"),
    purpose: "workflow-agent",
  });

  assert.equal(identifier, "codeaihub-workflow-agent-gemma-4-26b-a4b-it-16384");
  assert.deepEqual(
    commandCalls.filter((args) => args[0] === "unload"),
    [["unload", "codeaihub-translation-localization-hy-mt2-30b-a3b-mlx-16384"]]
  );
  assert.deepEqual(commandCalls.at(-1), [
    "load",
    "gemma-4-26b-a4b-it",
    "--context-length",
    "16384",
    "--identifier",
    "codeaihub-workflow-agent-gemma-4-26b-a4b-it-16384",
  ]);
});

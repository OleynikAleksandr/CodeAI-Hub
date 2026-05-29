import assert from "node:assert/strict";
import test from "node:test";
import { withAppliedProviderTurnConfig } from "../remote-bridge/types";
import { LocalModelsProviderAdapter } from "./local-models-provider-adapter";

const createModelListJson = (): string =>
  JSON.stringify([
    {
      displayName: "Gemma Local",
      modelKey: "gemma-local",
      type: "llm",
    },
    {
      displayName: "Qwen Local",
      modelKey: "qwen-local",
      type: "llm",
    },
  ]);

test("LocalModelsProviderAdapter uses selected local model and emits terminal events", async () => {
  const commandCalls: string[][] = [];
  const requestedModels: string[] = [];
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      return args[0] === "ls" ? createModelListJson() : "";
    },
    fetchImplementation: ((_url, init) => {
      const body = JSON.parse(String(init?.body)) as { readonly model: string };
      requestedModels.push(body.model);
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Локальный ответ." } }],
          }),
        ok: true,
        status: 200,
      } as Response);
    }) as typeof fetch,
  });

  const sessionId = await adapter.createSession();
  const events: unknown[] = [];
  adapter.subscribe(sessionId, (event) => events.push(event));

  await adapter.sendMessage(
    sessionId,
    "Translate this workflow note.",
    withAppliedProviderTurnConfig(undefined, {
      providerId: "localModels",
      source: "session_binding",
      modelId: "qwen-local",
    })
  );

  assert.deepEqual(commandCalls[1], [
    "load",
    "qwen-local",
    "--context-length",
    "8192",
  ]);
  assert.deepEqual(requestedModels, ["qwen-local"]);
  assert.deepEqual(
    events.map((event) => (event as { readonly type?: string }).type),
    ["turn_started", "assistant", "turn_completed"]
  );
});

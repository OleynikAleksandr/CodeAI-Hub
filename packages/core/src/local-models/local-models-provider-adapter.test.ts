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
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
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

  assert.deepEqual(commandCalls[1], ["server", "status"]);
  assert.deepEqual(commandCalls[2], [
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

test("LocalModelsProviderAdapter starts LM Studio server before provider turns", async () => {
  const commandCalls: string[][] = [];
  const requestedModels: string[] = [];
  let statusChecks = 0;
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ls") {
        return createModelListJson();
      }
      if (args[0] === "server" && args[1] === "status") {
        statusChecks += 1;
        return statusChecks === 1 ? "Server: OFF" : "Server: ON (port: 1234)";
      }
      return "";
    },
    fetchImplementation: ((_url, init) => {
      const body = JSON.parse(String(init?.body)) as { readonly model: string };
      requestedModels.push(body.model);
      return Promise.resolve({
        json: () =>
          Promise.resolve({
            choices: [{ message: { content: "Ответ после старта сервера." } }],
          }),
        ok: true,
        status: 200,
      } as Response);
    }) as typeof fetch,
  });
  const sessionId = await adapter.createSession();

  await adapter.sendMessage(sessionId, "Answer locally.");

  assert.deepEqual(commandCalls.slice(1, 5), [
    ["server", "status"],
    ["server", "start"],
    ["server", "status"],
    ["load", "gemma-local", "--context-length", "8192"],
  ]);
  assert.deepEqual(requestedModels, ["gemma-local"]);
});

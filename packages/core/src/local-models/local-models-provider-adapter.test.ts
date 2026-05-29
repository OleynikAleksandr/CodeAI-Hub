import assert from "node:assert/strict";
import test from "node:test";
import { withAppliedProviderTurnConfig } from "../remote-bridge/types";
import { LocalModelsProviderAdapter } from "./local-models-provider-adapter";

const CONTEXT_LENGTH_ERROR_PATTERN = /context length exceeded/;
const NO_FINAL_MESSAGE_PATTERN = /no final assistant message/;
const SOCKET_CAUSE_PATTERN = /UND_ERR_SOCKET/;

const createNativeMessageResponse = (content: string): Response =>
  ({
    json: () =>
      Promise.resolve({
        output: [{ content, type: "message" }],
      }),
    ok: true,
    status: 200,
  }) as Response;

const createModelListJson = (): string =>
  JSON.stringify([
    {
      displayName: "Gemma Local",
      maxContextLength: 262_144,
      modelKey: "gemma-local",
      type: "llm",
    },
    {
      displayName: "Qwen Local",
      maxContextLength: 262_144,
      modelKey: "qwen-local",
      type: "llm",
    },
  ]);

const createLoadedModelJson = (
  identifier = "codeaihub-workflow-agent-qwen-local-16384",
  contextLength = 16_384,
  modelKey = "qwen-local"
): string =>
  JSON.stringify([
    {
      contextLength,
      identifier,
      modelKey,
      type: "llm",
    },
  ]);

test("LocalModelsProviderAdapter uses selected local model and emits terminal events", async () => {
  const commandCalls: string[][] = [];
  const requestedModels: string[] = [];
  const requestedUrls: string[] = [];
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "ps") {
        return "[]";
      }
      return args[0] === "ls" ? createModelListJson() : "";
    },
    fetchImplementation: ((url, init) => {
      requestedUrls.push(String(url));
      const body = JSON.parse(String(init?.body)) as { readonly model: string };
      requestedModels.push(body.model);
      return Promise.resolve(createNativeMessageResponse("Локальный ответ."));
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
  assert.deepEqual(commandCalls[2], ["ps", "--json"]);
  assert.deepEqual(commandCalls[3], [
    "load",
    "qwen-local",
    "--context-length",
    "16384",
    "--identifier",
    "codeaihub-workflow-agent-qwen-local-16384",
    "--ttl",
    "1800",
  ]);
  assert.deepEqual(requestedModels, [
    "codeaihub-workflow-agent-qwen-local-16384",
  ]);
  assert.deepEqual(requestedUrls, ["http://127.0.0.1:1234/api/v1/chat"]);
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
      if (args[0] === "ps") {
        return "[]";
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
      return Promise.resolve(
        createNativeMessageResponse("Ответ после старта сервера.")
      );
    }) as typeof fetch,
  });
  const sessionId = await adapter.createSession();

  await adapter.sendMessage(sessionId, "Answer locally.");

  assert.deepEqual(commandCalls.slice(1, 5), [
    ["server", "status"],
    ["server", "start"],
    ["server", "status"],
    ["ps", "--json"],
  ]);
  assert.deepEqual(commandCalls[5], [
    "load",
    "gemma-local",
    "--context-length",
    "16384",
    "--identifier",
    "codeaihub-workflow-agent-gemma-local-16384",
    "--ttl",
    "1800",
  ]);
  assert.deepEqual(requestedModels, [
    "codeaihub-workflow-agent-gemma-local-16384",
  ]);
});

test("LocalModelsProviderAdapter reuses CodeAI-owned loaded identifier with enough context", async () => {
  const commandCalls: string[][] = [];
  const requestedModels: string[] = [];
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ls") {
        return createModelListJson();
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "ps") {
        return createLoadedModelJson(
          "codeaihub-workflow-agent-gemma-local-16384",
          16_384,
          "gemma-local"
        );
      }
      return "";
    },
    fetchImplementation: ((_url, init) => {
      const body = JSON.parse(String(init?.body)) as { readonly model: string };
      requestedModels.push(body.model);
      return Promise.resolve(
        createNativeMessageResponse("Ответ без перезагрузки.")
      );
    }) as typeof fetch,
  });

  const sessionId = await adapter.createSession();
  await adapter.sendMessage(sessionId, "Answer locally.");

  assert.equal(
    commandCalls.some((args) => args[0] === "load"),
    false
  );
  assert.deepEqual(requestedModels, [
    "codeaihub-workflow-agent-gemma-local-16384",
  ]);
});

test("LocalModelsProviderAdapter cleans idle CodeAI-owned workers on initialize and dispose", async () => {
  const commandCalls: string[][] = [];
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ps") {
        return JSON.stringify([
          {
            contextLength: 16_384,
            identifier: "codeaihub-workflow-agent-gemma-local-16384",
            modelKey: "gemma-local",
            status: "idle",
            type: "llm",
          },
          {
            contextLength: 8192,
            identifier: "codeaihub-translation-reasoning-qwen-local-8192",
            modelKey: "qwen-local",
            status: "generating",
            type: "llm",
          },
          {
            contextLength: 16_384,
            identifier: "gemma-local",
            modelKey: "gemma-local",
            status: "idle",
            type: "llm",
          },
        ]);
      }
      return "";
    },
    fetchImplementation: (() =>
      Promise.resolve(createNativeMessageResponse("unused"))) as typeof fetch,
  });

  await adapter.initialize();
  adapter.dispose();

  assert.deepEqual(
    commandCalls.filter((args) => args[0] === "unload"),
    [
      ["unload", "codeaihub-workflow-agent-gemma-local-16384"],
      ["unload", "codeaihub-workflow-agent-gemma-local-16384"],
    ]
  );
});

test("LocalModelsProviderAdapter includes LM Studio non-OK body in diagnostics", async () => {
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      if (args[0] === "ls") {
        return createModelListJson();
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "ps") {
        return "[]";
      }
      return "";
    },
    fetchImplementation: (() =>
      Promise.resolve({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"error":"context length exceeded"}'),
      } as Response)) as typeof fetch,
  });

  const sessionId = await adapter.createSession();

  await assert.rejects(
    () => adapter.sendMessage(sessionId, "Answer locally."),
    CONTEXT_LENGTH_ERROR_PATTERN
  );
});

test("LocalModelsProviderAdapter reports reasoning-only native chat responses", async () => {
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      if (args[0] === "ls") {
        return createModelListJson();
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "ps") {
        return createLoadedModelJson();
      }
      return "";
    },
    fetchImplementation: (() =>
      Promise.resolve({
        json: () =>
          Promise.resolve({
            output: [
              {
                content: "Reasoning without a final answer.",
                type: "reasoning",
              },
            ],
            stats: {
              reasoning_output_tokens: 2047,
              total_output_tokens: 2047,
            },
          }),
        ok: true,
        status: 200,
      } as Response)) as typeof fetch,
  });

  const sessionId = await adapter.createSession();

  await assert.rejects(
    () => adapter.sendMessage(sessionId, "Answer locally."),
    NO_FINAL_MESSAGE_PATTERN
  );
});

test("LocalModelsProviderAdapter includes fetch cause diagnostics", async () => {
  const fetchFailure = new TypeError("fetch failed") as TypeError & {
    cause?: unknown;
  };
  fetchFailure.cause = {
    code: "UND_ERR_SOCKET",
    message: "other side closed",
  };
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      if (args[0] === "ls") {
        return createModelListJson();
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "ps") {
        return createLoadedModelJson();
      }
      return "";
    },
    fetchImplementation: (() => Promise.reject(fetchFailure)) as typeof fetch,
  });

  const sessionId = await adapter.createSession();

  await assert.rejects(
    () => adapter.sendMessage(sessionId, "Answer locally."),
    SOCKET_CAUSE_PATTERN
  );
});

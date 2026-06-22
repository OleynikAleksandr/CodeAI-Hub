import assert from "node:assert/strict";
import test from "node:test";
import type { NormalizedTranslationRequest } from "@codeai-hub/translation";
import { LocalModelsFacade } from "./local-models-facade";

interface RecordedChatPayload {
  readonly messages?: readonly {
    readonly content?: string;
    readonly role?: string;
  }[];
  readonly model?: string;
}

const createRequest = (
  engineId: string,
  text = "Open Settings and keep {providerId} unchanged."
): NormalizedTranslationRequest => ({
  category: "reasoning",
  engineId,
  sourceLanguage: "en",
  targetLanguage: "ru",
  text,
  timeoutMs: 5000,
});

const createModelListJson = (params: {
  readonly architecture?: string;
  readonly displayName: string;
  readonly modelKey: string;
}): string =>
  JSON.stringify([
    {
      architecture: params.architecture,
      displayName: params.displayName,
      maxContextLength: 16_384,
      modelKey: params.modelKey,
      paramsString: "7B",
      publisher: "mlx-community",
      sizeBytes: 4_294_967_296,
      type: "llm",
    },
    {
      displayName: "Embedding Model",
      modelKey: "embedding-model",
      type: "embedding",
    },
  ]);

const parseRecordedPayload = (init?: RequestInit): RecordedChatPayload => {
  const body = init?.body;
  if (typeof body !== "string") {
    throw new Error("Expected JSON string request body");
  }
  return JSON.parse(body) as RecordedChatPayload;
};

const createCompletionsStreamResponse = (content: string): Response => {
  const frame = `data: ${JSON.stringify({
    choices: [{ delta: { content } }],
  })}\n\ndata: [DONE]\n\n`;
  const encoded = new TextEncoder().encode(frame);
  return {
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded);
        controller.close();
      },
    }),
    ok: true,
    status: 200,
  } as Response;
};

test("LocalModelsFacade discovers LM Studio LLMs and exposes localization catalogs", () => {
  const facade = new LocalModelsFacade({
    commandRunner: () =>
      createModelListJson({
        displayName: "Gemma Local",
        modelKey: "mlx-community/gemma-local",
      }),
  });

  const models = facade.listModels();
  const catalogs = facade.createLocalizationEngineCatalogs();
  const localCatalog = catalogs.find(
    (catalog) => catalog.engineId === "lmstudio:mlx-community/gemma-local"
  );

  assert.equal(models.length, 1);
  assert.equal(models[0]?.engineId, "lmstudio:mlx-community/gemma-local");
  assert.equal(
    catalogs.some((catalog) => catalog.engineId === "google-gtx"),
    true
  );
  assert.equal(
    localCatalog?.languages.some((language) => language.code === "ru"),
    true
  );
});

test("LocalModelsFacade sends OpenAI-compatible translation requests through LM Studio", async () => {
  const commandCalls: readonly string[][] = [];
  const payloads: RecordedChatPayload[] = [];
  const modelKey = "mlx-community/gemma-request-test";
  const facade = new LocalModelsFacade({
    commandRunner: (args) => {
      (commandCalls as string[][]).push([...args]);
      if (args[0] === "ls") {
        return createModelListJson({
          displayName: "Gemma Request Test",
          modelKey,
        });
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      return "";
    },
    fetchImplementation: ((_url, init) => {
      payloads.push(parseRecordedPayload(init));
      return Promise.resolve(
        createCompletionsStreamResponse("Откройте Settings.")
      );
    }) as typeof fetch,
  });

  const engine = facade.createTranslationEngines()[0];
  assert.ok(engine);
  const result = await engine.translate(
    createRequest(`lmstudio:${modelKey}`, "Open Settings.")
  );

  assert.equal(result.status, "translated");
  assert.equal(result.finalText, "Откройте Settings.");
  assert.deepEqual(commandCalls[1], ["server", "status"]);
  assert.deepEqual(commandCalls[2], ["ps", "--json"]);
  assert.deepEqual(commandCalls[3], [
    "load",
    modelKey,
    "--context-length",
    "8192",
    "--identifier",
    "codeaihub-translation-reasoning-mlx-community-gemma-request-test-8192",
    "--ttl",
    "600",
  ]);
  assert.equal(
    payloads[0]?.model,
    "codeaihub-translation-reasoning-mlx-community-gemma-request-test-8192"
  );
  assert.equal(
    payloads[0]?.messages?.[0]?.content?.includes("Russian (ru)"),
    true
  );
  assert.equal(
    payloads[0]?.messages?.[1]?.content?.includes(
      "<text>\nOpen Settings.\n</text>"
    ),
    true
  );
});

test("LocalModelsFacade disables Qwen thinking and fails closed when model load fails", async () => {
  const qwenPayloads: RecordedChatPayload[] = [];
  const qwenModelKey = "bogdanminko/ruadapt-qwen-test";
  const qwenFacade = new LocalModelsFacade({
    commandRunner: (args) => {
      if (args[0] === "ls") {
        return createModelListJson({
          architecture: "qwen",
          displayName: "Ruadapt Qwen Test",
          modelKey: qwenModelKey,
        });
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      return "";
    },
    fetchImplementation: ((_url, init) => {
      qwenPayloads.push(parseRecordedPayload(init));
      return Promise.resolve(
        createCompletionsStreamResponse("Быстрый перевод.")
      );
    }) as typeof fetch,
  });

  const qwenEngine = qwenFacade.createTranslationEngines()[0];
  assert.ok(qwenEngine);
  await qwenEngine.translate(
    createRequest(`lmstudio:${qwenModelKey}`, "Fast translation.")
  );

  assert.equal(
    qwenPayloads[0]?.messages?.[1]?.content?.startsWith("/no_think\n"),
    true
  );
  assert.equal(
    qwenPayloads[0]?.messages?.[1]?.content?.includes(
      "<text>\nFast translation.\n</text>"
    ),
    true
  );

  const failingModelKey = "mlx-community/load-failure-test";
  const failingFacade = new LocalModelsFacade({
    commandRunner: (args) => {
      if (args[0] === "ls") {
        return createModelListJson({
          displayName: "Load Failure Test",
          modelKey: failingModelKey,
        });
      }
      if (args[0] === "server" && args[1] === "status") {
        return "Server: ON (port: 1234)";
      }
      if (args[0] === "load") {
        throw new Error("cannot load model");
      }
      return "";
    },
    fetchImplementation: (() => {
      return Promise.reject(new Error("fetch should not be called"));
    }) as typeof fetch,
  });

  const failingEngine = failingFacade.createTranslationEngines()[0];
  assert.ok(failingEngine);
  const result = await failingEngine.translate(
    createRequest(`lmstudio:${failingModelKey}`)
  );

  assert.equal(result.status, "fallback");
  assert.equal(result.errorCode, "lmstudio_model_load_failed");
});

test("LocalModelsFacade starts LM Studio server before translation when it is offline", async () => {
  const commandCalls: string[][] = [];
  let statusChecks = 0;
  const modelKey = "mlx-community/server-start-test";
  const facade = new LocalModelsFacade({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      if (args[0] === "ls") {
        return createModelListJson({
          displayName: "Server Start Test",
          modelKey,
        });
      }
      if (args[0] === "server" && args[1] === "status") {
        statusChecks += 1;
        return statusChecks === 1 ? "Server: OFF" : "Server: ON (port: 1234)";
      }
      return "";
    },
    fetchImplementation: (() =>
      Promise.resolve(
        createCompletionsStreamResponse("Проверка сервера.")
      )) as typeof fetch,
  });

  const engine = facade.createTranslationEngines()[0];
  assert.ok(engine);
  const result = await engine.translate(
    createRequest(`lmstudio:${modelKey}`, "Server check.")
  );

  assert.equal(result.status, "translated");
  assert.deepEqual(commandCalls.slice(1, 5), [
    ["server", "status"],
    ["server", "start"],
    ["server", "status"],
    ["ps", "--json"],
  ]);
  assert.deepEqual(commandCalls[5], [
    "load",
    modelKey,
    "--context-length",
    "8192",
    "--identifier",
    "codeaihub-translation-reasoning-mlx-community-server-start-test-8192",
    "--ttl",
    "600",
  ]);
});

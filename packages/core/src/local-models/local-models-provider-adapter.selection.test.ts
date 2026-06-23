import assert from "node:assert/strict";
import test from "node:test";
import { withAppliedProviderTurnConfig } from "../remote-bridge/types";
import { LocalModelsProviderAdapter } from "./local-models-provider-adapter";

const UNAVAILABLE_MODEL_PATTERN =
  /Requested LM Studio model "missing-local" is not available/;

const createNativeMessageResponse = (content: string): Response => {
  const frame = `event: chat.end\ndata: ${JSON.stringify({
    result: { output: [{ content, type: "message" }] },
    type: "chat.end",
  })}\n\n`;
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

test("LocalModelsProviderAdapter honors lmstudio-prefixed selected model ids", async () => {
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
      return args[0] === "ps" ? "[]" : "";
    },
    fetchImplementation: ((_url, init) => {
      const body = JSON.parse(String(init?.body)) as { readonly model: string };
      requestedModels.push(body.model);
      return Promise.resolve(createNativeMessageResponse("done"));
    }) as typeof fetch,
  });

  const sessionId = await adapter.createSession();
  await adapter.sendMessage(
    sessionId,
    "Run with the selected model.",
    withAppliedProviderTurnConfig(undefined, {
      providerId: "localModels",
      source: "session_binding",
      modelId: "lmstudio:qwen-local",
    })
  );

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
});

test("LocalModelsProviderAdapter rejects unavailable explicit model ids", async () => {
  const commandCalls: string[][] = [];
  const fetchCalls: string[] = [];
  const adapter = new LocalModelsProviderAdapter({
    commandRunner: (args) => {
      commandCalls.push([...args]);
      return args[0] === "ls" ? createModelListJson() : "";
    },
    fetchImplementation: ((url) => {
      fetchCalls.push(String(url));
      return Promise.resolve(createNativeMessageResponse("unexpected"));
    }) as typeof fetch,
  });

  const sessionId = await adapter.createSession();
  await assert.rejects(
    () =>
      adapter.sendMessage(
        sessionId,
        "Run with a missing model.",
        withAppliedProviderTurnConfig(undefined, {
          providerId: "localModels",
          source: "session_binding",
          modelId: "missing-local",
        })
      ),
    UNAVAILABLE_MODEL_PATTERN
  );

  assert.deepEqual(commandCalls, [["ls", "--json"]]);
  assert.deepEqual(fetchCalls, []);
});

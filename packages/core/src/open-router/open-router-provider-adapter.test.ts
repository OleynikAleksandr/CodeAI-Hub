import assert from "node:assert/strict";
import test from "node:test";
import { withAppliedProviderTurnConfig } from "../remote-bridge/types";
import { OpenRouterProviderAdapter } from "./open-router-provider-adapter";
import { createOpenRouterChatCompletionRequest } from "./open-router-sse-reader";

const createStreamResponse = (chunks: readonly unknown[]): Response => {
  const encoded = new TextEncoder().encode(
    `${chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("")}data: [DONE]\n\n`
  );
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

test("createOpenRouterChatCompletionRequest includes strict provider routing only when endpoint tag is selected", () => {
  assert.deepEqual(
    createOpenRouterChatCompletionRequest({
      endpointTag: "azure/swedencentral",
      messages: [{ content: "Hello", role: "user" }],
      model: "openai/gpt-5-nano",
    }),
    {
      messages: [{ content: "Hello", role: "user" }],
      model: "openai/gpt-5-nano",
      provider: {
        allow_fallbacks: false,
        order: ["azure/swedencentral"],
      },
      stream: true,
    }
  );

  assert.deepEqual(
    createOpenRouterChatCompletionRequest({
      messages: [{ content: "Hello", role: "user" }],
      model: "openai/gpt-5-nano",
    }),
    {
      messages: [{ content: "Hello", role: "user" }],
      model: "openai/gpt-5-nano",
      stream: true,
    }
  );
});

test("OpenRouterProviderAdapter sends selected model and endpoint tag, then emits live and final assistant events", async () => {
  const requestBodies: unknown[] = [];
  const adapter = new OpenRouterProviderAdapter({
    apiKey: "test-key",
    fetchImplementation: ((_url, init) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        createStreamResponse([
          { choices: [{ delta: { content: "Hel" } }] },
          { choices: [{ delta: { content: "lo" } }] },
        ])
      );
    }) as typeof fetch,
  });
  const sessionId = await adapter.createSession();
  const events: unknown[] = [];
  adapter.subscribe(sessionId, (event) => events.push(event));

  await adapter.sendMessage(
    sessionId,
    "Say hello",
    withAppliedProviderTurnConfig(
      { openRouterEndpointTag: "openai" },
      {
        modelId: "openai/gpt-5-nano",
        providerId: "openRouter",
        source: "session_binding",
      }
    )
  );

  assert.deepEqual(requestBodies, [
    {
      messages: [{ content: "Say hello", role: "user" }],
      model: "openai/gpt-5-nano",
      provider: { allow_fallbacks: false, order: ["openai"] },
      stream: true,
    },
  ]);
  const typedEvents = events as Array<{
    readonly content?: string;
    readonly tag?: string;
    readonly type?: string;
  }>;
  assert.deepEqual(
    typedEvents.map((event) => event.type),
    ["turn_started", "assistant", "assistant", "assistant", "turn_completed"]
  );
  assert.deepEqual(
    typedEvents
      .filter((event) => event.tag === "live")
      .map((event) => event.content),
    ["Hel", "lo"]
  );
  const finalAssistant = typedEvents.find(
    (event) => event.type === "assistant" && event.tag === undefined
  );
  assert.equal(finalAssistant?.content, "Hello");
});

test("OpenRouterProviderAdapter uses private settings connection from turn options", async () => {
  const requests: Array<{
    readonly authorization?: string;
    readonly url: string;
  }> = [];
  const adapter = new OpenRouterProviderAdapter({
    fetchImplementation: ((url, init) => {
      requests.push({
        authorization:
          init?.headers && typeof init.headers === "object"
            ? String((init.headers as Record<string, unknown>).Authorization)
            : undefined,
        url: String(url),
      });
      return Promise.resolve(
        createStreamResponse([{ choices: [{ delta: { content: "ok" } }] }])
      );
    }) as typeof fetch,
  });
  const sessionId = await adapter.createSession();
  const turnOptions =
    withAppliedProviderTurnConfig(undefined, {
      modelId: "openai/gpt-5-nano",
      providerId: "openRouter",
      source: "settings_snapshot",
    }) ?? {};
  Object.defineProperties(turnOptions, {
    __codeaiOpenRouterApiKey: { enumerable: false, value: "settings-key" },
    __codeaiOpenRouterBaseUrl: {
      enumerable: false,
      value: "https://openrouter.example/api/v1/",
    },
  });

  await adapter.sendMessage(sessionId, "Say hello", turnOptions);

  assert.deepEqual(requests, [
    {
      authorization: "Bearer settings-key",
      url: "https://openrouter.example/api/v1/chat/completions",
    },
  ]);
  assert.equal(JSON.stringify(turnOptions).includes("settings-key"), false);
});

test("OpenRouterProviderAdapter keeps successful session history between turns", async () => {
  const requestBodies: Array<{ readonly messages: readonly unknown[] }> = [];
  const adapter = new OpenRouterProviderAdapter({
    apiKey: "test-key",
    defaultModel: "openai/gpt-5-nano",
    fetchImplementation: ((_url, init) => {
      requestBodies.push(JSON.parse(String(init?.body)));
      return Promise.resolve(
        createStreamResponse([{ choices: [{ delta: { content: "ok" } }] }])
      );
    }) as typeof fetch,
  });
  const sessionId = await adapter.createSession();

  await adapter.sendMessage(sessionId, "first");
  await adapter.sendMessage(sessionId, "second");

  assert.deepEqual(
    requestBodies.map((body) => body.messages),
    [
      [{ content: "first", role: "user" }],
      [
        { content: "first", role: "user" },
        { content: "ok", role: "assistant" },
        { content: "second", role: "user" },
      ],
    ]
  );
});

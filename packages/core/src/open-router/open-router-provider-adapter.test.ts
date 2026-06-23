import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { withAppliedProviderTurnConfig } from "../remote-bridge/types";
import { OpenRouterProviderAdapter } from "./open-router-provider-adapter";
import { createOpenRouterChatCompletionRequest } from "./open-router-sse-reader";

const CODEX_SYSTEM_PROMPT_PATTERN = /You are Codex/u;
const TOOL_RESULT_PATTERN = /tool result/u;

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

  const requestBody = requestBodies[0] as {
    readonly messages: Array<{
      readonly content: string;
      readonly role: string;
    }>;
    readonly model: string;
    readonly provider: unknown;
    readonly stream: boolean;
    readonly tool_choice?: string;
    readonly tools?: Array<{
      readonly function?: { readonly name?: string };
      readonly type?: string;
    }>;
  };
  assert.equal(requestBodies.length, 1);
  assert.equal(requestBody.messages[0]?.role, "system");
  assert.match(
    requestBody.messages[0]?.content ?? "",
    CODEX_SYSTEM_PROMPT_PATTERN
  );
  assert.deepEqual(requestBody.messages.slice(1), [
    { content: "Say hello", role: "user" },
  ]);
  assert.equal(requestBody.model, "openai/gpt-5-nano");
  assert.deepEqual(requestBody.provider, {
    allow_fallbacks: false,
    order: ["openai"],
  });
  assert.equal(requestBody.stream, true);
  assert.equal(requestBody.tool_choice, "auto");
  assert.ok(
    requestBody.tools?.some((tool) => tool.function?.name === "exec_command")
  );
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

test("OpenRouterProviderAdapter coalesces reasoning deltas before live assistant chunks", async () => {
  const adapter = new OpenRouterProviderAdapter({
    apiKey: "test-key",
    defaultModel: "cohere/north-mini-code:free",
    fetchImplementation: (() =>
      Promise.resolve(
        createStreamResponse([
          { choices: [{ delta: { reasoning: "The" } }] },
          { choices: [{ delta: { reasoning: " user" } }] },
          { choices: [{ delta: { content: "OK" } }] },
        ])
      )) as typeof fetch,
  });
  const sessionId = await adapter.createSession();
  const events: unknown[] = [];
  adapter.subscribe(sessionId, (event) => events.push(event));

  await adapter.sendMessage(sessionId, "Confirm.");

  const typedEvents = events as Array<{
    readonly content?: string;
    readonly tag?: string;
    readonly type?: string;
  }>;
  assert.deepEqual(
    typedEvents.map((event) => event.type),
    ["turn_started", "thinking", "assistant", "assistant", "turn_completed"]
  );
  assert.deepEqual(
    typedEvents
      .filter((event) => event.tag === "thinking")
      .map((event) => event.content),
    ["The user"]
  );
  assert.deepEqual(
    typedEvents
      .filter((event) => event.tag === "live")
      .map((event) => event.content),
    ["OK"]
  );
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

  const firstMessages = requestBodies[0]?.messages as Array<{
    readonly content?: string;
    readonly role?: string;
  }>;
  const secondMessages = requestBodies[1]?.messages as Array<{
    readonly content?: string;
    readonly role?: string;
  }>;
  assert.equal(firstMessages[0]?.role, "system");
  assert.match(firstMessages[0]?.content ?? "", CODEX_SYSTEM_PROMPT_PATTERN);
  assert.deepEqual(firstMessages.slice(1), [
    { content: "first", role: "user" },
  ]);
  assert.equal(secondMessages[0]?.role, "system");
  assert.match(secondMessages[0]?.content ?? "", CODEX_SYSTEM_PROMPT_PATTERN);
  assert.deepEqual(secondMessages.slice(1), [
    { content: "first", role: "user" },
    { content: "ok", role: "assistant" },
    { content: "second", role: "user" },
  ]);
});

test("OpenRouterProviderAdapter executes local tool calls and continues the chat completion loop", async () => {
  const workspacePath = await mkdtemp(path.join(tmpdir(), "openrouter-tools-"));
  const requestBodies: Array<{ readonly messages: readonly unknown[] }> = [];
  try {
    await writeFile(
      path.join(workspacePath, "note.txt"),
      "tool result",
      "utf8"
    );
    const adapter = new OpenRouterProviderAdapter({
      apiKey: "test-key",
      defaultModel: "openai/gpt-5-nano",
      fetchImplementation: ((_url, init) => {
        requestBodies.push(JSON.parse(String(init?.body)));
        return Promise.resolve(
          requestBodies.length === 1
            ? createStreamResponse([
                {
                  choices: [
                    {
                      delta: {
                        tool_calls: [
                          {
                            function: {
                              arguments: '{"path":"note.txt"}',
                              name: "read_file",
                            },
                            id: "call_read",
                            index: 0,
                            type: "function",
                          },
                        ],
                      },
                    },
                  ],
                },
              ])
            : createStreamResponse([
                { choices: [{ delta: { content: "done" } }] },
              ])
        );
      }) as typeof fetch,
    });
    const sessionId = await adapter.createSession(workspacePath);

    await adapter.sendMessage(sessionId, "read the note");

    assert.equal(requestBodies.length, 2);
    const secondMessages = requestBodies[1]?.messages as Array<{
      readonly content?: string;
      readonly role?: string;
      readonly tool_call_id?: string;
      readonly tool_calls?: unknown;
    }>;
    assert.equal(secondMessages[0]?.role, "system");
    assert.equal(secondMessages[1]?.role, "user");
    assert.equal(secondMessages[2]?.role, "assistant");
    assert.ok(secondMessages[2]?.tool_calls);
    assert.equal(secondMessages[3]?.role, "tool");
    assert.equal(secondMessages[3]?.tool_call_id, "call_read");
    assert.match(secondMessages[3]?.content ?? "", TOOL_RESULT_PATTERN);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

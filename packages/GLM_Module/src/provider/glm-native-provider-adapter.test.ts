import assert from "node:assert/strict";
import test from "node:test";
import { GlmProviderAdapter } from "./glm-native-provider-adapter";

const encoder = new TextEncoder();
const HTTP_529_PATTERN = /HTTP 529/u;

const createResponse = (frames: readonly string[]): Response =>
  new Response(
    new ReadableStream({
      start(controller) {
        for (const frame of frames) {
          controller.enqueue(encoder.encode(`data: ${frame}\n\n`));
        }
        controller.close();
      },
    }),
    { status: 200 }
  );

test("GlmProviderAdapter streams thinking, assistant content and token usage", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    return Promise.resolve(
      createResponse([
        JSON.stringify({
          choices: [{ delta: { reasoning_content: "plan" } }],
        }),
        JSON.stringify({ choices: [{ delta: { content: "OK" } }] }),
        JSON.stringify({
          choices: [],
          usage: {
            completion_tokens: 2,
            prompt_tokens: 3,
            total_tokens: 5,
          },
        }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", workspacePath: "/tmp/glm-test" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: unknown[] = [];
    adapter.subscribe(sessionId, (event) => events.push(event));
    await adapter.sendMessage(sessionId, "hello");

    assert.equal(bodies.length, 1);
    const body = JSON.parse(bodies[0] as string) as {
      readonly model: string;
      readonly reasoning_effort: string;
      readonly thinking: { readonly type: string };
    };
    assert.equal(body.model, "glm-5.2");
    assert.equal(body.reasoning_effort, "max");
    assert.deepEqual(body.thinking, { type: "enabled" });
    assert.deepEqual(
      events.map((event) => (event as { type: string }).type),
      [
        "turn_started",
        "thinking",
        "assistant",
        "stream_event",
        "turn_completed",
      ]
    );
    assert.equal((events[1] as { content: string }).content, "plan");
    assert.equal((events[2] as { content: string }).content, "OK");
    assert.deepEqual((events[3] as { data: unknown }).data, {
      cachedTokens: 0,
      completionTokens: 2,
      kind: "token_usage",
      limit: 1_000_000,
      promptTokens: 3,
      reasoningTokens: 0,
      totalTokens: 5,
      used: 5,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter applies per-turn reasoning controls", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    return Promise.resolve(createResponse(["[DONE]"]));
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "hello", {
      appliedTurnConfig: {
        reasoningEffort: "none",
        thinkingEnabled: false,
      },
    });

    const body = JSON.parse(bodies[0] as string) as {
      readonly reasoning_effort: string;
      readonly thinking: { readonly type: string };
    };
    assert.equal(body.reasoning_effort, "none");
    assert.deepEqual(body.thinking, { type: "disabled" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter emits visible failure on HTTP error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response("overloaded", { status: 529 })
    )) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: Array<{ readonly message?: string; readonly type: string }> =
      [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as { readonly message?: string; readonly type: string }
      );
    });
    await adapter.sendMessage(sessionId, "hello");

    assert.deepEqual(
      events.map((event) => event.type),
      ["turn_started", "turn_failed"]
    );
    assert.match(events[1]?.message ?? "", HTTP_529_PATTERN);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

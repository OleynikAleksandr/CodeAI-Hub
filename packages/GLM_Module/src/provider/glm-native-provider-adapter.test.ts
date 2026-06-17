import assert from "node:assert/strict";
import test from "node:test";
import { GlmProviderAdapter } from "./glm-native-provider-adapter";

const encoder = new TextEncoder();
const HTTP_529_PATTERN = /HTTP 529/u;
const ECONNRESET_PATTERN = /ECONNRESET/u;

const createFetchError = (code: string, message: string): Error => {
  const error = new Error("fetch failed") as Error & {
    cause?: { readonly code: string; readonly message: string };
  };
  error.cause = { code, message };
  return error;
};

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

const createResettingResponse = (): Response =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.error(createFetchError("ECONNRESET", "read ECONNRESET"));
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
      readonly stream_options: { readonly include_usage: boolean };
      readonly thinking: {
        readonly clear_thinking: boolean;
        readonly type: string;
      };
    };
    assert.equal(body.model, "glm-5.2");
    assert.equal(body.reasoning_effort, "max");
    assert.deepEqual(body.stream_options, { include_usage: true });
    assert.deepEqual(body.thinking, {
      clear_thinking: false,
      type: "enabled",
    });
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
    assert.equal((events[2] as { tag?: string }).tag, "live");
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
      readonly reasoning_effort?: string;
      readonly thinking: { readonly type: string };
    };
    assert.equal(body.reasoning_effort, undefined);
    assert.deepEqual(body.thinking, { type: "disabled" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter replays assistant reasoning_content in later turns", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    return Promise.resolve(
      createResponse([
        JSON.stringify({
          choices: [{ delta: { reasoning_content: "think" } }],
        }),
        JSON.stringify({ choices: [{ delta: { content: "done" } }] }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "first");
    await adapter.sendMessage(sessionId, "second");

    const secondBody = JSON.parse(bodies[1] as string) as {
      readonly messages: Array<{
        readonly content: string;
        readonly reasoning_content?: string;
        readonly role: string;
      }>;
    };
    assert.deepEqual(secondBody.messages.slice(0, 3), [
      { role: "user", content: "first" },
      { role: "assistant", content: "done", reasoning_content: "think" },
      { role: "user", content: "second" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter retries transient transport failures without changing reasoning", async () => {
  const originalFetch = globalThis.fetch;
  const bodies: string[] = [];
  let attempts = 0;
  globalThis.fetch = ((_url, init) => {
    attempts += 1;
    bodies.push(String(init?.body ?? ""));
    if (attempts === 1) {
      return Promise.reject(createFetchError("ECONNRESET", "read ECONNRESET"));
    }
    return Promise.resolve(createResponse(["[DONE]"]));
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: Array<{ readonly type: string }> = [];
    adapter.subscribe(sessionId, (event) => {
      events.push(event as { readonly type: string });
    });
    await adapter.sendMessage(sessionId, "hello");

    assert.equal(attempts, 2);
    for (const bodyText of bodies) {
      const body = JSON.parse(bodyText) as {
        readonly reasoning_effort?: string;
        readonly thinking: {
          readonly clear_thinking: boolean;
          readonly type: string;
        };
      };
      assert.equal(body.reasoning_effort, "max");
      assert.deepEqual(body.thinking, {
        clear_thinking: false,
        type: "enabled",
      });
    }
    assert.deepEqual(
      events.map((event) => event.type),
      ["turn_started", "turn_completed"]
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter buffers thinking chunks and marks assistant deltas live", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      createResponse([
        JSON.stringify({ choices: [{ delta: { reasoning_content: "pla" } }] }),
        JSON.stringify({ choices: [{ delta: { reasoning_content: "n" } }] }),
        JSON.stringify({ choices: [{ delta: { content: "O" } }] }),
        JSON.stringify({ choices: [{ delta: { content: "K" } }] }),
        "[DONE]",
      ])
    )) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: Array<{
      readonly content?: string;
      readonly tag?: string;
      readonly type: string;
    }> = [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as {
          readonly content?: string;
          readonly tag?: string;
          readonly type: string;
        }
      );
    });
    await adapter.sendMessage(sessionId, "hello");

    assert.deepEqual(
      events.map((event) => event.type),
      ["turn_started", "thinking", "assistant", "assistant", "turn_completed"]
    );
    assert.equal(events[1]?.content, "plan");
    assert.deepEqual(
      events
        .filter((event) => event.type === "assistant")
        .map((event) => [event.content, event.tag]),
      [
        ["O", "live"],
        ["K", "live"],
      ]
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GlmProviderAdapter retries stream reset before first useful event", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = (() => {
    attempts += 1;
    return Promise.resolve(
      attempts === 1
        ? createResettingResponse()
        : createResponse([
            JSON.stringify({ choices: [{ delta: { content: "OK" } }] }),
            "[DONE]",
          ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key" },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: Array<{
      readonly content?: string;
      readonly tag?: string;
      readonly type: string;
    }> = [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as {
          readonly content?: string;
          readonly tag?: string;
          readonly type: string;
        }
      );
    });
    await adapter.sendMessage(sessionId, "hello");

    assert.equal(attempts, 2);
    assert.deepEqual(
      events.map((event) => event.type),
      ["turn_started", "assistant", "turn_completed"]
    );
    assert.equal(events[1]?.content, "OK");
    assert.equal(events[1]?.tag, "live");
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

test("GlmProviderAdapter preserves fetch cause after retry exhaustion", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.reject(
      createFetchError("ECONNRESET", "read ECONNRESET")
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
    assert.match(events[1]?.message ?? "", ECONNRESET_PATTERN);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

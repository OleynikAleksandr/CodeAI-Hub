import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GlmProviderAdapter } from "./glm-native-provider-adapter";

const encoder = new TextEncoder();

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

test("GlmProviderAdapter executes workflow artifact tool calls", async () => {
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-tool-"));
  const providerHomePath = path.join(workspacePath, "provider-home");
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    if (bodies.length === 1) {
      return Promise.resolve(createToolCallResponse());
    }
    return Promise.resolve(
      createResponse([
        JSON.stringify({ choices: [{ delta: { content: "Готово." } }] }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", providerHomePath, workspacePath },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    const events: Array<{ readonly content?: string; readonly type: string }> =
      [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as { readonly content?: string; readonly type: string }
      );
    });
    await adapter.sendMessage(sessionId, "write application skeleton");

    assert.equal(bodies.length, 2);
    assert.equal(await readArtifact(workspacePath), "# Done\n");
    assert.equal(readLastMessageRole(bodies[1] as string), "tool");
    assert.equal(readLastToolCallId(bodies[1] as string), "call_1");
    const logEvents = await readSessionLogEvents(providerHomePath);
    assert.equal(
      logEvents.some(
        (event) =>
          event.type === "http_request" &&
          event.headers?.Authorization === "Bearer test-key" &&
          event.body?.reasoning_effort === "max"
      ),
      true
    );
    assert.equal(
      logEvents.some((event) => event.type === "sse_raw_frame"),
      true
    );
    assert.equal(
      logEvents.some((event) => event.type === "tool_result"),
      true
    );
    assert.deepEqual(
      events.map((event) => event.type),
      ["turn_started", "assistant", "turn_completed"]
    );
    assert.equal(events[1]?.content, "Готово.");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("GlmProviderAdapter executes GLM exec_command tool calls", async () => {
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-exec-tool-"));
  const providerHomePath = path.join(workspacePath, "provider-home");
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    if (bodies.length === 1) {
      return Promise.resolve(createExecToolCallResponse());
    }
    return Promise.resolve(
      createResponse([
        JSON.stringify({ choices: [{ delta: { content: "Готово." } }] }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", providerHomePath, workspacePath },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "inspect workspace");

    assert.equal(bodies.length, 2);
    assert.equal(readLastMessageRole(bodies[1] as string), "tool");
    assert.equal(readLastToolCallId(bodies[1] as string), "call_exec");
    assert.equal(readLastToolContent(bodies[1] as string).ok, true);
    assert.equal(readLastToolContent(bodies[1] as string).stdout, "glm-ok");
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("GlmProviderAdapter executes GLM grep_files tool calls", async () => {
  if (spawnSync("rg", ["--version"]).status !== 0) {
    return;
  }
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-grep-tool-"));
  const providerHomePath = path.join(workspacePath, "provider-home");
  await writeFile(path.join(workspacePath, "sample.ts"), "const needle = 1;\n");
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    if (bodies.length === 1) {
      return Promise.resolve(createGrepToolCallResponse());
    }
    return Promise.resolve(
      createResponse([
        JSON.stringify({ choices: [{ delta: { content: "Готово." } }] }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", providerHomePath, workspacePath },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "search workspace");

    const toolContent = readLastToolContent(bodies[1] as string);
    assert.equal(toolContent.ok, true);
    assert.deepEqual(toolContent.matches, [
      "./sample.ts:1:7:const needle = 1;",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("GlmProviderAdapter executes GLM web_search tool calls", async () => {
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-web-tool-"));
  const providerHomePath = path.join(workspacePath, "provider-home");
  const bodies: string[] = [];
  globalThis.fetch = ((url, init) => {
    const target = String(url);
    if (target.includes("duckduckgo.com/html")) {
      return Promise.resolve(
        new Response(
          '<a class="result__a" href="https://example.test/page">Example result</a>'
        )
      );
    }
    bodies.push(String(init?.body ?? ""));
    if (bodies.length === 1) {
      return Promise.resolve(createWebSearchToolCallResponse());
    }
    return Promise.resolve(
      createResponse([
        JSON.stringify({ choices: [{ delta: { content: "Готово." } }] }),
        "[DONE]",
      ])
    );
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", providerHomePath, workspacePath },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "search web");

    const toolContent = readLastToolContent(bodies[1] as string);
    assert.equal(toolContent.ok, true);
    assert.deepEqual(toolContent.results, [
      { title: "Example result", url: "https://example.test/page" },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

const createToolCallResponse = (): Response =>
  createResponse([
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                function: {
                  arguments:
                    '{"relative_path":".codeai-hub/demo/application_skeleton/application-skeleton.md","content":"# Done\\n"}',
                  name: "write_workflow_artifact",
                },
                id: "call_1",
                index: 0,
                type: "function",
              },
            ],
          },
        },
      ],
    }),
    JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
    "[DONE]",
  ]);

const createExecToolCallResponse = (): Response =>
  createResponse([
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                function: {
                  arguments:
                    '{"cmd":"printf glm-ok","yield_time_ms":1000,"max_output_tokens":1000}',
                  name: "exec_command",
                },
                id: "call_exec",
                index: 0,
                type: "function",
              },
            ],
          },
        },
      ],
    }),
    JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
    "[DONE]",
  ]);

const createGrepToolCallResponse = (): Response =>
  createResponse([
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                function: {
                  arguments:
                    '{"pattern":"needle","path":".","include":"**/*.ts","max_results":10}',
                  name: "grep_files",
                },
                id: "call_grep",
                index: 0,
                type: "function",
              },
            ],
          },
        },
      ],
    }),
    JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
    "[DONE]",
  ]);

const createWebSearchToolCallResponse = (): Response =>
  createResponse([
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                function: {
                  arguments:
                    '{"query":"CodeAI Hub GLM tools","response_length":"short"}',
                  name: "web_search",
                },
                id: "call_web",
                index: 0,
                type: "function",
              },
            ],
          },
        },
      ],
    }),
    JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
    "[DONE]",
  ]);

const readArtifact = (workspacePath: string): Promise<string> =>
  readFile(
    path.join(
      workspacePath,
      ".codeai-hub/demo/application_skeleton/application-skeleton.md"
    ),
    "utf8"
  );

const readSessionLogEvents = async (
  providerHomePath: string
): Promise<
  Array<{
    readonly body?: { readonly reasoning_effort?: string };
    readonly headers?: { readonly Authorization?: string };
    readonly type?: string;
  }>
> => {
  const root = path.join(providerHomePath, "sessions");
  const [year] = await readdir(root);
  const [month] = await readdir(path.join(root, year as string));
  const [day] = await readdir(path.join(root, year as string, month as string));
  const [fileName] = await readdir(
    path.join(root, year as string, month as string, day as string)
  );
  const logText = await readFile(
    path.join(
      root,
      year as string,
      month as string,
      day as string,
      fileName as string
    ),
    "utf8"
  );
  return logText
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
};

const readLastMessageRole = (bodyText: string): string | undefined => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly role: string }>;
  };
  return body.messages.at(-1)?.role;
};

const readLastToolCallId = (bodyText: string): string | undefined => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly tool_call_id?: string }>;
  };
  return body.messages.at(-1)?.tool_call_id;
};

const readLastToolContent = (
  bodyText: string
): {
  readonly matches?: readonly string[];
  readonly ok?: boolean;
  readonly results?: readonly Record<string, string>[];
  readonly stdout?: string;
} => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly content?: string }>;
  };
  return JSON.parse(body.messages.at(-1)?.content ?? "{}") as {
    readonly matches?: readonly string[];
    readonly ok?: boolean;
    readonly results?: readonly Record<string, string>[];
    readonly stdout?: string;
  };
};

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalModelsProviderAdapter } from "./local-models-provider-adapter";

const createOpenAiChatStreamResponse = (
  deltas: readonly Record<string, unknown>[]
): Response => {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const delta of deltas) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
            )
          );
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    {
      headers: { "content-type": "text/event-stream" },
      status: 200,
    }
  );
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

test("LocalModelsProviderAdapter executes workflow artifact tool calls", async () => {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lm-tool-"));
  const bodies: string[] = [];
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
    fetchImplementation: ((url, init) => {
      assert.equal(String(url), "http://127.0.0.1:1234/v1/chat/completions");
      bodies.push(String(init?.body ?? ""));
      if (bodies.length === 1) {
        return Promise.resolve(
          createOpenAiChatStreamResponse([
            { reasoning_content: "Проверяю путь. " },
            { content: "Сейчас запишу артефакт." },
            {
              tool_calls: [
                {
                  function: {
                    name: "write_workflow_artifact",
                  },
                  id: "call_1",
                  index: 0,
                  type: "function",
                },
              ],
            },
            {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      content: "# Done\n",
                      relative_path:
                        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
                    }),
                  },
                  index: 0,
                },
              ],
            },
          ])
        );
      }
      return Promise.resolve(
        createOpenAiChatStreamResponse([{ content: "Готово." }])
      );
    }) as typeof fetch,
  });

  try {
    const sessionId = await adapter.createSession(workspacePath);
    const events: Array<{
      readonly content?: string;
      readonly tag?: string;
      readonly type?: string;
    }> = [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as {
          readonly content?: string;
          readonly tag?: string;
          readonly type?: string;
        }
      );
    });

    await adapter.sendMessage(sessionId, "write application skeleton");

    assert.equal(bodies.length, 2);
    assert.equal(readOpenAiBodyStreamFlag(bodies[0] as string), true);
    assert.equal(readOpenAiBodyToolsEnabled(bodies[0] as string), true);
    assert.equal(readOpenAiBodyToolsEnabled(bodies[1] as string), false);
    assert.equal(
      await readFile(
        path.join(
          workspacePath,
          ".codeai-hub/demo/application_skeleton/application-skeleton.md"
        ),
        "utf8"
      ),
      "# Done\n"
    );
    assert.equal(readLastOpenAiMessageRole(bodies[1] as string), "tool");
    assert.equal(readLastOpenAiToolCallId(bodies[1] as string), "call_1");
    assert.deepEqual(
      events.map((event) => event.type),
      [
        "turn_started",
        "thinking",
        "assistant",
        "assistant",
        "assistant",
        "turn_completed",
      ]
    );
    assert.equal(events[1]?.content, "Проверяю путь. ");
    assert.equal(events[2]?.content, "Сейчас запишу артефакт.");
    assert.equal(events[2]?.tag, "live");
    assert.equal(events[3]?.content, "Готово.");
    assert.equal(events[3]?.tag, "live");
    assert.equal(events[4]?.content, "Готово.");
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("LocalModelsProviderAdapter completes after artifact write when the follow-up is empty", async () => {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lm-tool-"));
  const bodies: string[] = [];
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
    fetchImplementation: ((_url, init) => {
      bodies.push(String(init?.body ?? ""));
      if (bodies.length === 1) {
        return Promise.resolve(
          createOpenAiChatStreamResponse([
            {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      content: "# Done\n",
                      relative_path:
                        ".codeai-hub/demo/description/Final_Description.md",
                    }),
                    name: "write_workflow_artifact",
                  },
                  id: "call_1",
                  index: 0,
                  type: "function",
                },
              ],
            },
          ])
        );
      }
      return Promise.resolve(createOpenAiChatStreamResponse([]));
    }) as typeof fetch,
  });

  try {
    const sessionId = await adapter.createSession(workspacePath);
    const events: Array<{ readonly content?: string; readonly type?: string }> =
      [];
    adapter.subscribe(sessionId, (event) => {
      events.push(
        event as { readonly content?: string; readonly type?: string }
      );
    });

    await adapter.sendMessage(sessionId, "write description");

    assert.equal(bodies.length, 2);
    assert.equal(readOpenAiBodyToolsEnabled(bodies[0] as string), true);
    assert.equal(readOpenAiBodyToolsEnabled(bodies[1] as string), false);
    assert.equal(events.at(-2)?.content, "Готово: артефакт записан.");
    assert.equal(events.at(-1)?.type, "turn_completed");
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("LocalModelsProviderAdapter rejects workflow artifact paths outside .codeai-hub", async () => {
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "lm-tool-"));
  const bodies: string[] = [];
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
    fetchImplementation: ((_url, init) => {
      bodies.push(String(init?.body ?? ""));
      if (bodies.length === 1) {
        return Promise.resolve(
          createOpenAiChatStreamResponse([
            {
              tool_calls: [
                {
                  function: {
                    arguments: JSON.stringify({
                      content: "# Unsafe\n",
                      relative_path: "README.md",
                    }),
                    name: "write_workflow_artifact",
                  },
                  id: "call_unsafe",
                  index: 0,
                  type: "function",
                },
              ],
            },
          ])
        );
      }
      return Promise.resolve(
        createOpenAiChatStreamResponse([{ content: "Не записал файл." }])
      );
    }) as typeof fetch,
  });

  try {
    const sessionId = await adapter.createSession(workspacePath);

    await adapter.sendMessage(sessionId, "write unsafe file");

    await assert.rejects(
      () => readFile(path.join(workspacePath, "README.md"), "utf8"),
      { code: "ENOENT" }
    );
    const toolResult = JSON.parse(
      readLastOpenAiMessageContent(bodies[1] as string) ?? "{}"
    ) as { readonly error?: string; readonly ok?: boolean };
    assert.equal(toolResult.ok, false);
    assert.equal(
      toolResult.error,
      "Artifact path must start with .codeai-hub/."
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

const readOpenAiBodyStreamFlag = (bodyText: string): boolean | undefined => {
  const body = JSON.parse(bodyText) as { readonly stream?: boolean };
  return body.stream;
};

const readOpenAiBodyToolsEnabled = (bodyText: string): boolean => {
  const body = JSON.parse(bodyText) as { readonly tools?: unknown };
  return Array.isArray(body.tools);
};

const readLastOpenAiMessageRole = (bodyText: string): string | undefined => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly role: string }>;
  };
  return body.messages.at(-1)?.role;
};

const readLastOpenAiMessageContent = (bodyText: string): string | undefined => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly content?: string }>;
  };
  return body.messages.at(-1)?.content;
};

const readLastOpenAiToolCallId = (bodyText: string): string | undefined => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly tool_call_id?: string }>;
  };
  return body.messages.at(-1)?.tool_call_id;
};

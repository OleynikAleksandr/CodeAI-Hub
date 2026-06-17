import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
      workspace: { apiKey: "test-key", workspacePath },
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
    await adapter.sendMessage(sessionId, "write description");

    assert.equal(bodies.length, 2);
    assert.equal(await readArtifact(workspacePath), "# Done\n");
    assert.equal(readLastMessageRole(bodies[1] as string), "tool");
    assert.equal(readLastToolCallId(bodies[1] as string), "call_1");
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
                    '{"relative_path":".codeai-hub/demo/description/Final_Description.md","content":"# Done\\n"}',
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

const readArtifact = (workspacePath: string): Promise<string> =>
  readFile(
    path.join(
      workspacePath,
      ".codeai-hub/demo/description/Final_Description.md"
    ),
    "utf8"
  );

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

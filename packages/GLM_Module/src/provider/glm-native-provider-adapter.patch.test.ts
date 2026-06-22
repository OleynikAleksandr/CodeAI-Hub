import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

test("GlmProviderAdapter applies GLM apply_patch tool calls", async () => {
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(
    path.join(os.tmpdir(), "glm-patch-tool-")
  );
  const providerHomePath = path.join(workspacePath, "provider-home");
  const targetPath = path.join(
    workspacePath,
    ".codeai-hub/tmp/glm-tool-smoke-test/write-file-test.txt"
  );
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, "Привет, мир!\nEnglish text\n", "utf8");
  const bodies: string[] = [];
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    if (bodies.length === 1) {
      return Promise.resolve(createApplyPatchToolCallResponse());
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
    await adapter.sendMessage(sessionId, "patch file");

    const toolContent = readLastToolContent(bodies[1] as string);
    assert.equal(toolContent.ok, true);
    assert.deepEqual(toolContent.files, [
      ".codeai-hub/tmp/glm-tool-smoke-test/write-file-test.txt",
    ]);
    assert.equal(
      await readFile(targetPath, "utf8"),
      "Привет, мир!\nEnglish text\nPatch line added\n"
    );
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

const createApplyPatchToolCallResponse = (): Response =>
  createResponse([
    JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                function: {
                  arguments: JSON.stringify({
                    patch: [
                      "*** Begin Patch",
                      "*** Update File: .codeai-hub/tmp/glm-tool-smoke-test/write-file-test.txt",
                      "@@",
                      " English text",
                      "+Patch line added",
                      "*** End Patch",
                    ].join("\n"),
                  }),
                  name: "apply_patch",
                },
                id: "call_patch",
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

const readLastToolContent = (
  bodyText: string
): {
  readonly files?: readonly string[];
  readonly ok?: boolean;
} => {
  const body = JSON.parse(bodyText) as {
    readonly messages: Array<{ readonly content?: string }>;
  };
  return JSON.parse(body.messages.at(-1)?.content ?? "{}") as {
    readonly files?: readonly string[];
    readonly ok?: boolean;
  };
};

import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { GlmProviderAdapter } from "./glm-native-provider-adapter";

const encoder = new TextEncoder();
const AGENTS_BLOCK_PATTERN = /Applicable AGENTS\.md instructions/u;
const WORKSPACE_RULE_PATTERN = /Always answer in Russian/u;

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

test("GlmProviderAdapter injects workspace AGENTS.md into system context", async () => {
  const originalFetch = globalThis.fetch;
  const workspacePath = await mkdtemp(path.join(os.tmpdir(), "glm-agents-"));
  const providerHomePath = path.join(workspacePath, "provider-home");
  const bodies: string[] = [];
  await writeFile(
    path.join(workspacePath, "AGENTS.md"),
    "# Workspace rules\n\n- Always answer in Russian.\n",
    "utf8"
  );
  globalThis.fetch = ((_url, init) => {
    bodies.push(String(init?.body ?? ""));
    return Promise.resolve(createResponse(["[DONE]"]));
  }) as typeof fetch;

  try {
    const adapter = new GlmProviderAdapter({
      workspace: { apiKey: "test-key", providerHomePath, workspacePath },
    });
    await adapter.initialize();
    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "hello");

    const body = JSON.parse(bodies[0] as string) as {
      readonly messages: Array<{ readonly content: string }>;
    };
    const systemContent = body.messages[0]?.content ?? "";
    assert.match(systemContent, AGENTS_BLOCK_PATTERN);
    assert.ok(systemContent.includes(path.join(workspacePath, "AGENTS.md")));
    assert.match(systemContent, WORKSPACE_RULE_PATTERN);
  } finally {
    globalThis.fetch = originalFetch;
    await rm(workspacePath, { force: true, recursive: true });
  }
});

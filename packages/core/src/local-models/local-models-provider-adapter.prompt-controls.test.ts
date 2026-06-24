import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { LocalModelsProviderAdapter } from "./local-models-provider-adapter";

const createModelListJson = (): string =>
  JSON.stringify([
    {
      displayName: "Gemma Local",
      maxContextLength: 262_144,
      modelKey: "gemma-local",
      type: "llm",
    },
  ]);

const createLoadedModelJson = (): string =>
  JSON.stringify([
    {
      contextLength: 8192,
      identifier: "codeaihub-workflow-agent-gemma-local-8192",
      modelKey: "gemma-local",
      type: "llm",
    },
  ]);

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

test("LocalModelsProviderAdapter sends prompt file override and temperature", async () => {
  const previousPromptFile = process.env.CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE;
  const tempDir = mkdtempSync(path.join(os.tmpdir(), "lm-prompt-"));
  const promptPath = path.join(tempDir, "system.md");
  const requestBodies: Array<{
    readonly system_prompt?: string;
    readonly temperature?: number;
  }> = [];

  try {
    writeFileSync(promptPath, "Custom local system prompt\n", "utf8");
    process.env.CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE = promptPath;

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
        requestBodies.push(JSON.parse(String(init?.body)));
        return Promise.resolve(createNativeMessageResponse("ok"));
      }) as typeof fetch,
    });

    const sessionId = await adapter.createSession();
    await adapter.sendMessage(sessionId, "normalize this");

    const [requestBody] = requestBodies;
    assert.equal(requestBody?.system_prompt, "Custom local system prompt");
    assert.equal(requestBody?.temperature, 0.3);
  } finally {
    if (previousPromptFile === undefined) {
      Reflect.deleteProperty(process.env, "CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE");
    } else {
      process.env.CODEAI_LMSTUDIO_SYSTEM_PROMPT_FILE = previousPromptFile;
    }
    rmSync(tempDir, { force: true, recursive: true });
  }
});

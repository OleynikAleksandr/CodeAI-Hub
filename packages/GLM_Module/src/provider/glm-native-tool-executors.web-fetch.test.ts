import assert from "node:assert/strict";
import test from "node:test";
import { executeGlmNativeTool } from "./glm-native-tool-executors";

const PARTIAL_WARNING_PATTERN = /JavaScript-rendered shell/u;

test("executeGlmNativeTool marks sparse JavaScript-rendered fetch results partial", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      new Response(
        `<html><body><div id="root"></div><script>${"x".repeat(6000)}</script></body></html>`,
        { status: 200 }
      )
    )) as typeof fetch;

  try {
    const result = await executeGlmNativeTool({
      function: {
        arguments: '{"url":"https://example.test/article","max_chars":1000}',
        name: "web_fetch",
      },
      id: "call_web_fetch",
      type: "function",
    });

    assert.equal(result.ok, true);
    assert.equal(result.partial, true);
    assert.match(String(result.warning), PARTIAL_WARNING_PATTERN);
    assert.equal(result.tool_call_id, "call_web_fetch");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

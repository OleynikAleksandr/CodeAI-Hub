import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import type { NativeRequestCaptureProxyEvent } from ".";
import { NativeRequestCaptureProxy } from ".";

const TARGET_IGNORED_RESPONSE_PATTERN = /502 CodeAI Hub capture target ignored/;

const readOnce = async (socket: net.Socket): Promise<string> =>
  await new Promise((resolve, reject) => {
    socket.once("data", (chunk) => {
      resolve(chunk.toString("utf8"));
    });
    socket.once("error", reject);
  });

test("NativeRequestCaptureProxy ignores non-target CONNECT requests without upstream forwarding", async () => {
  const events: NativeRequestCaptureProxyEvent[] = [];
  const proxy = new NativeRequestCaptureProxy({
    captureId: "capture-test",
    providerId: "claude",
    targetRules: [{ host: "api.anthropic.com" }],
    timeoutMs: 20,
    onEvent: (event) => {
      events.push(event);
    },
    resolveTlsCredentials: () => {
      throw new Error("Non-target requests must not ask for TLS credentials");
    },
  });
  const handle = await proxy.start();
  const socket = net.connect(handle.port, "127.0.0.1");

  socket.write("CONNECT example.com:443 HTTP/1.1\r\nHost: example.com\r\n\r\n");
  const response = await readOnce(socket);
  const result = await handle.waitForCapture();
  await handle.stop();

  assert.match(response, TARGET_IGNORED_RESPONSE_PATTERN);
  assert.equal(result.status, "timeout");
  assert.equal(
    events.some((event) => event.type === "proxy_connect"),
    true
  );
  assert.equal(
    events.some((event) => event.type === "request_ignored"),
    true
  );
  const ignoredEvent = events.find((event) => event.type === "request_ignored");
  assert.ok(ignoredEvent);
  assert.equal(ignoredEvent.reason, "target_not_configured");
  assert.equal(ignoredEvent.target, "example.com:443");
});

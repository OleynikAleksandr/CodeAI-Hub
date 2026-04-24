import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWebSocketUpgradeResponse,
  parseWebSocketClientFrame,
} from "./native-request-capture-websocket";
import { shouldCompleteWebSocketCapture } from "./native-request-capture-websocket-session";

const SAMPLE_WEBSOCKET_KEY = "dGhlIHNhbXBsZSBub25jZQ==";
const SAMPLE_WEBSOCKET_ACCEPT = "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=";
const WEBSOCKET_SWITCHING_PROTOCOLS_PATTERN =
  /HTTP\/1\.1 101 Switching Protocols/;

test("buildWebSocketUpgradeResponse creates RFC accept header", () => {
  const response = buildWebSocketUpgradeResponse({
    "sec-websocket-key": SAMPLE_WEBSOCKET_KEY,
  });

  assert.ok(response);
  assert.match(response, WEBSOCKET_SWITCHING_PROTOCOLS_PATTERN);
  assert.equal(
    response.includes(`Sec-WebSocket-Accept: ${SAMPLE_WEBSOCKET_ACCEPT}`),
    true
  );
});

test("parseWebSocketClientFrame unmasks JSON text frames", () => {
  const body = {
    instructions: "capture native request",
    messages: [{ role: "user", content: "probe" }],
  };
  const bodyText = JSON.stringify(body);
  const frame = createMaskedTextFrame(bodyText);

  const parsed = parseWebSocketClientFrame(frame);

  assert.ok(parsed);
  assert.equal(parsed.bodyText, bodyText);
  assert.deepEqual(parsed.body, body);
  assert.equal(parsed.bytesConsumed, frame.length);
  assert.equal(parsed.opcode, 1);
});

test("shouldCompleteWebSocketCapture waits for Codex non-empty turn input", () => {
  assert.equal(
    shouldCompleteWebSocketCapture("codex", {
      generate: false,
      input: [],
      instructions: "native instructions",
    }),
    false
  );
  assert.equal(
    shouldCompleteWebSocketCapture("codex", {
      generate: true,
      input: [{ type: "text", text: "workflow prompt" }],
    }),
    true
  );
  assert.equal(shouldCompleteWebSocketCapture("claude", { input: [] }), true);
});

const createMaskedTextFrame = (bodyText: string): Buffer => {
  const payload = Buffer.from(bodyText, "utf8");
  const mask = Buffer.from([1, 2, 3, 4]);
  const maskedPayload = Buffer.from(payload);
  for (let index = 0; index < maskedPayload.length; index += 1) {
    // biome-ignore lint/suspicious/noBitwiseOperators: Test frame builder mirrors WebSocket byte-wise XOR masking.
    maskedPayload[index] ^= mask[index % mask.length];
  }
  return Buffer.concat([
    Buffer.from([129, 128 + payload.length]),
    mask,
    maskedPayload,
  ]);
};

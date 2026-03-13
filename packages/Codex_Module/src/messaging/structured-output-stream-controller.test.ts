import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_CODEX_RESPONSE_POLICY } from "../response-policy/response-policy-defaults";
import type {
  CodexResponseMode,
  CodexResponsePolicy,
} from "../response-policy/response-policy-types";
import { StructuredOutputStreamController } from "./structured-output-stream-controller";

const createPolicy = (mode: CodexResponseMode): CodexResponsePolicy => ({
  ...DEFAULT_CODEX_RESPONSE_POLICY,
  mode,
});

for (const mode of ["hybrid", "debug_raw"] as const) {
  test(`StructuredOutputStreamController preserves ${mode} passthrough across session promotion`, () => {
    const controller = new StructuredOutputStreamController();
    const tempSessionId = "temp-session-id";
    const realSessionId = "real-session-id";
    const itemId = "item-1";
    const finalText = "plain-text final answer";

    controller.prepareTurn(tempSessionId, {}, createPolicy(mode));
    controller.promoteSession(tempSessionId, realSessionId);

    assert.equal(controller.shouldSuppressCommentary(realSessionId), false);

    controller.startTurn(realSessionId);
    const result = controller.complete(realSessionId, itemId, finalText);

    assert.equal(result.assistantText, finalText);
    assert.ok(result.outputHash);
  });
}

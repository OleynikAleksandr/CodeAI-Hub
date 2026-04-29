import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { BridgeEvent } from "../types";
import { createHarness } from "./session-request-handler.test-helpers";

type ModelUpdateEvent = Extract<
  BridgeEvent,
  { readonly type: "session:model:update" }
>;

test("SessionRequestHandler updates model binding without resending last user message", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "codeai-hub-model-set-"));
  try {
    await writeFile(
      path.join(tempDir, "settings.json"),
      '{"providers":{"codex":{"defaultModel":"gpt-5.3-codex","reasoningByModel":{"gpt-5.4-mini":"high"}}}}\n',
      "utf8"
    );

    const harness = createHarness({
      claudeSettingsPath: path.join(tempDir, "claude.json"),
    });
    const session = harness.sessionManager.createSession(
      "codexCli",
      "/tmp/model-set-no-resend"
    );
    let resendCount = 0;
    harness.sessionManager.appendMessage(session.id, "user", "last prompt");
    harness.providerRegistry.getAdapter = () => ({
      sendMessage: () => {
        resendCount += 1;
        return Promise.resolve();
      },
    });

    await harness.handler.handleSetModelBinding({
      sessionId: session.id,
      targetModelId: "gpt-5.4-mini",
    });

    const updatedSession = harness.sessionManager.getSession(session.id);
    assert.equal(resendCount, 0);
    assert.equal(updatedSession?.modelBinding?.baseModelId, "gpt-5.4-mini");
    assert.equal(
      updatedSession?.modelBinding?.modelId,
      "gpt-5.4-mini reasoning:high"
    );
    assert.equal(updatedSession?.modelBinding?.reasoningEffort, "high");
    assert.equal(updatedSession?.modelBinding?.source, "switch_request");

    const modelUpdate = harness.events.find(
      (event): event is ModelUpdateEvent =>
        event.type === "session:model:update"
    );
    assert.equal(modelUpdate?.payload.sessionId, session.id);
    assert.equal(modelUpdate?.payload.modelId, "gpt-5.4-mini reasoning:high");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

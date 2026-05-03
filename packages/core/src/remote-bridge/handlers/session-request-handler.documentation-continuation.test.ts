import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { stubDescriptionDialogSync } from "./session-request-handler.test-continuity-helpers";
import {
  createHarness,
  flushAsyncWork,
  internals,
} from "./session-request-handler.test-helpers";

interface ProviderSend {
  readonly content: string;
  readonly providerSessionId: string;
}

test("Documentation Tree continuation envelope is attached to the first real user turn only", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-doc-rollover-"));
  try {
    process.env.HOME = tempHome;
    const harness = createHarness();
    stubDescriptionDialogSync(harness);
    const providerSends: ProviderSend[] = [];
    const sourceSession = harness.sessionManager.createSession(
      "codexCli",
      "/tmp/core-documentation-continuation-envelope",
      "provider-source-documentation-envelope",
      {
        initiativeSlug: "demo",
        stage: "virtual_simulation",
        runSlug: null,
      }
    );
    harness.sessionManager.appendMessage(
      sourceSession.id,
      "assistant",
      "Какие ОС поддерживаем в MVP?"
    );
    harness.providerRegistry.getAdapter = () => ({
      createSession: async () => "provider-target-documentation-envelope",
      sendMessage: (providerSessionId: string, content: string) => {
        providerSends.push({ providerSessionId, content });
        return Promise.resolve();
      },
      subscribe: () => () => {
        // no provider events are needed in this focused dispatch test
      },
    });

    await internals(harness.handler).flowNodeRollover.rolloverFlowNodeSession(
      sourceSession,
      { remainingPercent: 10, thresholdPercent: 80, rolloverId: "rollover-vs" },
      { silent: true }
    );
    const targetSession = harness.sessionManager
      .listSessions()
      .find((session) => session.id !== sourceSession.id);
    assert.ok(targetSession);

    await harness.handler.handleMessage(
      targetSession.id,
      "В MVP используем только macOS."
    );
    await flushAsyncWork();

    assert.equal(providerSends.length, 1);
    assert.equal(
      providerSends[0]?.providerSessionId,
      "provider-target-documentation-envelope"
    );
    assert.equal(
      providerSends[0]?.content.includes("## Continuation Mode"),
      true
    );
    assert.equal(providerSends[0]?.content.includes("not a cold start"), true);
    assert.equal(
      providerSends[0]?.content.includes(
        "## Last Assistant Message Before Rollover"
      ),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes("Какие ОС поддерживаем в MVP?"),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes("В MVP используем только macOS."),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes("Archetype / shell constraints"),
      true
    );
    assert.equal(
      targetSession.messages.at(-1)?.content,
      "В MVP используем только macOS."
    );

    await harness.handler.handleMessage(
      targetSession.id,
      "Следующий обычный turn."
    );
    await flushAsyncWork();

    assert.equal(providerSends.length, 2);
    assert.equal(
      providerSends[1]?.content.includes("## Continuation Mode"),
      false
    );
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});

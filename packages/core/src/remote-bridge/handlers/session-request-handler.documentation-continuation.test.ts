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
import { buildDocumentationContinuationEnvelope } from "./session-request-handler-documentation-continuation-envelope";

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
    harness.sessionManager.appendMessage(
      sourceSession.id,
      "system",
      "System notice after the visible assistant question"
    );
    harness.sessionManager.appendMessage(
      sourceSession.id,
      "assistant",
      "Translation overlay after the visible assistant question",
      { tag: "translation" }
    );
    harness.sessionManager.appendMessage(
      sourceSession.id,
      "assistant",
      "Hidden thinking after the visible assistant question",
      { tag: "thinking", visibilityAtEmission: "hidden" }
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
        "existing canonical workflow artifacts as the authoritative current state"
      ),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes(
        "Do not create, read, or update continuity report files"
      ),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes(
        "The user's message after this block is the user's answer or next instruction"
      ),
      true
    );
    assert.equal(
      providerSends[0]?.content.includes(
        "## Workflow Start / Step Contract Context"
      ),
      true
    );
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

test("managed workflow continuation envelope resumes from todo plan", async () => {
  const envelope = await buildDocumentationContinuationEnvelope({
    context: {
      createdAtIso: "2026-05-07T00:00:00.000Z",
      lastUserVisibleAssistantMessage:
        "Skeleton materialization is in progress.",
      modelBinding: null,
      providerId: "codexCli",
      rolloverId: "rollover-application-skeleton",
      runSlug: null,
      sourceSessionId: "source",
      stageId: "application_skeleton",
      targetSessionId: "target",
      workspacePath: "/tmp/managed-workspace",
      workspaceSlug: "demo",
    },
    userMessage: "Продолжай.",
  });

  assert.equal(envelope.includes("## Managed Workspace Recovery"), true);
  assert.equal(envelope.includes("doc/TODO/workspace.plan.md"), true);
  assert.equal(envelope.includes("activePlanPath"), true);
  assert.equal(envelope.includes("legacy root todo plan"), true);
  assert.equal(envelope.includes("doc/TODO/todo-plan.md"), false);
  assert.equal(envelope.includes("npm run plan:status"), true);
  assert.equal(envelope.includes(".codeai-hub/workflow/revisions/"), true);
  assert.equal(envelope.includes("application-skeleton-map.json"), true);
});

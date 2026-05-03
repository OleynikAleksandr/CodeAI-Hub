import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CODEX_MODEL_SWITCH_INJECTION_KEY } from "@codeai-hub/codex-app-server-module";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import { readAppliedProviderTurnConfig } from "../types";
import { stubDescriptionDialogSync } from "./session-request-handler.test-continuity-helpers";
import { createHarness, noop } from "./session-request-handler.test-helpers";

interface SendCall {
  readonly content: string;
  readonly providerSessionId: string;
  readonly turnOptions?: Record<string, unknown>;
}

const createCodexBinding = (
  sessionId: string,
  workspacePath: string
): SessionModelBinding => ({
  key: buildSessionModelBindingKey({
    providerId: "codexCli",
    sessionId,
    workspacePath,
  }),
  providerId: "codexCli",
  baseModelId: "gpt-5.3-codex-spark",
  modelId: "gpt-5.3-codex-spark reasoning:xhigh",
  reasoningEffort: "xhigh",
  source: "switch_request",
  boundAt: "2026-05-03T08:45:00.000Z",
  updatedAt: "2026-05-03T08:45:00.000Z",
});

const createCodexStaleBindingError = (
  providerSessionId: string
): Error & { code: string; providerSessionId: string } => {
  const error = new Error("Codex runtime session binding is stale") as Error & {
    code: string;
    providerSessionId: string;
  };
  error.code = "CODEX_SESSION_STALE_BINDING";
  error.providerSessionId = providerSessionId;
  return error;
};

test("Codex stale-binding retry preserves workflow context and applied turn config", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codex-stale-rebind-")
  );
  try {
    const harness = createHarness();
    stubDescriptionDialogSync(harness);
    const oldProviderSessionId = "provider-session-stale";
    const newProviderSessionId = "provider-session-rebound";
    const session = harness.sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      oldProviderSessionId,
      {
        initiativeSlug: "workflow-context",
        stage: "virtual_simulation",
        runSlug: null,
      }
    );
    harness.sessionManager.setModelBinding(
      session.id,
      createCodexBinding(session.id, workspaceRoot)
    );
    session.pendingModelSwitchInjection = true;
    harness.providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: oldProviderSessionId,
      unsubscribe: noop,
    });

    const createCalls: string[] = [];
    const subscribeCalls: string[] = [];
    const sendCalls: SendCall[] = [];
    const adapter = {
      createSession: (requestedWorkspacePath: string) => {
        createCalls.push(requestedWorkspacePath);
        return Promise.resolve(newProviderSessionId);
      },
      subscribe: (providerSessionId: string) => {
        subscribeCalls.push(providerSessionId);
        return noop;
      },
      sendMessage: (
        providerSessionId: string,
        content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sendCalls.push({ providerSessionId, content, turnOptions });
        if (providerSessionId === oldProviderSessionId) {
          return Promise.reject(
            createCodexStaleBindingError(providerSessionId)
          );
        }
        return Promise.resolve();
      },
    };
    harness.providerRegistry.getAdapter = () => adapter;
    (
      harness.providerRegistry as unknown as {
        getDescriptor: () => {
          readonly capabilities: { readonly requiresPostStopResume: false };
        };
      }
    ).getDescriptor = () => ({
      capabilities: { requiresPostStopResume: false },
    });

    await harness.handler.handleMessage(session.id, "continue workflow turn");

    assert.deepEqual(createCalls, [workspaceRoot]);
    assert.deepEqual(subscribeCalls, [newProviderSessionId]);
    assert.deepEqual(
      sendCalls.map((call) => call.providerSessionId),
      [oldProviderSessionId, newProviderSessionId]
    );
    assert.deepEqual(
      harness.continuityTracked.map((call) => call.providerSessionId),
      [oldProviderSessionId, newProviderSessionId]
    );

    const retryTurnConfig = readAppliedProviderTurnConfig(
      sendCalls[1]?.turnOptions
    );
    assert.equal(retryTurnConfig?.providerId, "codexCli");
    assert.equal(retryTurnConfig?.source, "session_binding");
    assert.equal(retryTurnConfig?.baseModelId, "gpt-5.3-codex-spark");
    assert.equal(
      retryTurnConfig?.effectiveModelId,
      "gpt-5.3-codex-spark reasoning:xhigh"
    );
    assert.equal(retryTurnConfig?.reasoningEffort, "xhigh");

    const retryInjection = sendCalls[1]?.turnOptions?.[
      CODEX_MODEL_SWITCH_INJECTION_KEY
    ] as Record<string, unknown> | undefined;
    assert.equal(retryInjection?.kind, "model_switch");
    assert.equal(retryInjection?.targetModelId, "gpt-5.3-codex-spark");
    assert.equal(retryInjection?.targetReasoningEffort, "xhigh");

    const reboundSession = harness.sessionManager.getSession(session.id);
    assert.equal(reboundSession?.initiativeSlug, "workflow-context");
    assert.equal(reboundSession?.stage, "virtual_simulation");
    assert.equal(reboundSession?.runSlug, null);
    assert.equal(reboundSession?.providerSessionId, newProviderSessionId);
    assert.equal(
      harness.sessionManager.hasStopInvalidatedBinding(session.id),
      false
    );
    assert.equal(reboundSession?.pendingModelSwitchInjection, false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

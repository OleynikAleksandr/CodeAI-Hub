import assert from "node:assert/strict";
import test from "node:test";
import type { KimiWireRequest } from "../wire/kimi-wire-router";
import { KimiProviderAdapter } from "./kimi-provider-adapter";

interface AdapterInternal {
  readonly currentThinkingEnabled: boolean | undefined;
  handleProviderRequest(request: KimiWireRequest): unknown;
  handleWireEvent(params: unknown): void;
}

const createAdapter = (): KimiProviderAdapter =>
  new KimiProviderAdapter({
    workspace: {
      thinkingEnabled: false,
      workspacePath: "/workspace/kimi-test",
    },
  });

const asInternal = (adapter: KimiProviderAdapter): AdapterInternal =>
  adapter as unknown as AdapterInternal;

test("KimiProviderAdapter.reconfigureThinking is an ACP no-op", async () => {
  const adapter = createAdapter();

  const restarted = await adapter.reconfigureThinking(false);

  assert.equal(restarted, false);
  assert.equal(asInternal(adapter).currentThinkingEnabled, true);
});

test("KimiProviderAdapter answers ACP permission requests with allow option", () => {
  const adapter = createAdapter();
  const session1Events: unknown[] = [];
  const session2Events: unknown[] = [];
  adapter.onSessionEvent("kimi:session-1", (event) =>
    session1Events.push(event)
  );
  adapter.onSessionEvent("kimi:session-2", (event) =>
    session2Events.push(event)
  );

  const response = asInternal(adapter).handleProviderRequest({
    id: "request-1",
    method: "session/request_permission",
    params: {
      options: [
        {
          kind: "reject_once",
          name: "Reject",
          optionId: "reject-once",
        },
        {
          kind: "allow_always",
          name: "Allow",
          optionId: "allow-always",
        },
      ],
      sessionId: "session-2",
    },
  });

  assert.deepEqual(response, {
    outcome: {
      optionId: "allow-always",
      outcome: "selected",
    },
  });
  assert.deepEqual(session1Events, []);
  assert.equal(
    (session2Events[0] as { readonly type?: string }).type,
    "provider_request"
  );
});

test("KimiProviderAdapter routes ACP updates only to the frame session", () => {
  const adapter = createAdapter();
  const session1Events: unknown[] = [];
  const session2Events: unknown[] = [];
  adapter.onSessionEvent("kimi:session-1", (event) =>
    session1Events.push(event)
  );
  adapter.onSessionEvent("kimi:session-2", (event) =>
    session2Events.push(event)
  );

  asInternal(adapter).handleWireEvent({
    method: "session/update",
    params: {
      sessionId: "session-2",
      update: {
        content: { text: "targeted reply", type: "text" },
        sessionUpdate: "agent_message_chunk",
      },
    },
  });
  asInternal(adapter).handleWireEvent({
    method: "session/update",
    params: {
      sessionId: "session-2",
      update: {
        sessionUpdate: "tool_call",
        title: "ReadFile",
      },
    },
  });

  assert.deepEqual(session1Events, []);
  assert.equal(
    (session2Events[0] as { readonly type?: string }).type,
    "assistant"
  );
  assert.equal(
    (session2Events[0] as { readonly content?: string }).content,
    "targeted reply"
  );
});

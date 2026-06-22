import assert from "node:assert/strict";
import test from "node:test";
import type { KimiWireRequest } from "../wire/kimi-wire-router";
import { KimiProviderAdapter } from "./kimi-provider-adapter";

interface AdapterInternal {
  readonly currentThinkingEnabled: boolean | undefined;
  handleProviderRequest(request: KimiWireRequest): unknown;
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
  const events: unknown[] = [];
  adapter.onSessionEvent("kimi:session-1", (event) => events.push(event));

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
      sessionId: "session-1",
    },
  });

  assert.deepEqual(response, {
    outcome: {
      optionId: "allow-always",
      outcome: "selected",
    },
  });
  assert.equal(
    (events[0] as { readonly type?: string }).type,
    "provider_request"
  );
});

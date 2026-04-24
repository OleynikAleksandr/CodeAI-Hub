import assert from "node:assert/strict";
import test from "node:test";
import type { ClaudeNativeRequestCaptureOptions } from "../diagnostics/claude-native-request-capture-service";
import { ClaudeProviderAdapter } from "./claude-provider-adapter";

test("ClaudeProviderAdapter refreshUsageLimits returns an awaitable promise and broadcasts the resolved payload", async () => {
  const adapter = Object.create(
    ClaudeProviderAdapter.prototype
  ) as ClaudeProviderAdapter;
  (
    adapter as unknown as {
      usageLimitsFacade: {
        readStreamPayload: (params: {
          readonly force: boolean;
          readonly providerSessionId: string;
          readonly runtimeSessionId: string;
          readonly workspacePath: string;
        }) => Promise<{
          readonly data: {
            readonly kind: "usage_limits";
            readonly providerScopeKey: string;
          };
          readonly providerScopeKey: string;
          readonly usageLimits: {
            readonly currentSession: {
              readonly percentUsed: number;
              readonly resetsAt: string;
            };
          };
        }>;
      };
    }
  ).usageLimitsFacade = {
    readStreamPayload: (params) => {
      assert.deepEqual(params, {
        force: true,
        providerSessionId: "claude-provider-session",
        runtimeSessionId: "runtime-session",
        workspacePath: "/tmp/claude-refresh",
      });
      return Promise.resolve({
        providerScopeKey: "claude:global",
        usageLimits: {
          currentSession: {
            percentUsed: 44,
            resetsAt: "2026-04-22T11:00:00.000Z",
          },
        },
        data: {
          kind: "usage_limits",
          providerScopeKey: "claude:global",
        },
      });
    },
  };

  const broadcastEvents: unknown[] = [];
  const result = adapter.refreshUsageLimits({
    broadcast: (event) => {
      broadcastEvents.push(event);
    },
    providerSessionId: "claude-provider-session",
    runtimeSessionId: "runtime-session",
    workspacePath: "/tmp/claude-refresh",
  });

  assert.equal(typeof (result as Promise<void>).then, "function");
  await result;
  assert.equal(broadcastEvents.length, 1);
  assert.equal(
    (
      broadcastEvents[0] as {
        readonly providerScopeKey?: string;
        readonly usageLimits?: {
          readonly currentSession?: { readonly percentUsed?: number };
        };
      }
    ).providerScopeKey,
    "claude:global"
  );
  assert.equal(
    (
      broadcastEvents[0] as {
        readonly usageLimits?: {
          readonly currentSession?: { readonly percentUsed?: number };
        };
      }
    ).usageLimits?.currentSession?.percentUsed,
    44
  );
});

test("ClaudeProviderAdapter captureNativeRequest delegates to diagnostics service", async () => {
  const adapter = Object.create(
    ClaudeProviderAdapter.prototype
  ) as ClaudeProviderAdapter;
  const delegatedOptions: ClaudeNativeRequestCaptureOptions[] = [];
  (
    adapter as unknown as {
      nativeRequestCaptureService: {
        captureNativeRequest: (
          options: ClaudeNativeRequestCaptureOptions
        ) => Promise<void>;
      };
    }
  ).nativeRequestCaptureService = {
    captureNativeRequest: (options) => {
      delegatedOptions.push(options);
      return Promise.resolve();
    },
  };

  const options: ClaudeNativeRequestCaptureOptions = {
    captureId: "capture-adapter-test",
    certificateEnv: { SSL_CERT_FILE: "/tmp/ca.pem" },
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    workspacePath: "/workspace",
  };

  await adapter.captureNativeRequest(options);

  assert.deepEqual(delegatedOptions, [options]);
});

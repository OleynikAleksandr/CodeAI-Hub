import assert from "node:assert/strict";
import test from "node:test";
import { CodexProviderAdapter } from "./codex-provider-adapter";

const waitForQueuedMicrotasks = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

test("CodexProviderAdapter refreshUsageLimits returns an awaitable promise and broadcasts the resolved payload", async () => {
  const adapter = Object.create(
    CodexProviderAdapter.prototype
  ) as CodexProviderAdapter;
  (
    adapter as unknown as {
      facade: {
        refreshUsageLimits: () => Promise<{
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
  ).facade = {
    refreshUsageLimits: async () => ({
      providerScopeKey: "codex:global",
      usageLimits: {
        currentSession: {
          percentUsed: 29,
          resetsAt: "2026-04-22T09:00:00.000Z",
        },
      },
      data: {
        kind: "usage_limits",
        providerScopeKey: "codex:global",
      },
    }),
  };

  const broadcastEvents: unknown[] = [];
  const result = adapter.refreshUsageLimits({
    broadcast: (event) => {
      broadcastEvents.push(event);
    },
    providerSessionId: "codex-provider-session",
    runtimeSessionId: "runtime-session",
    workspacePath: "/tmp/codex-refresh",
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
    "codex:global"
  );
  assert.equal(
    (
      broadcastEvents[0] as {
        readonly usageLimits?: {
          readonly currentSession?: { readonly percentUsed?: number };
        };
      }
    ).usageLimits?.currentSession?.percentUsed,
    29
  );
});

test("CodexProviderAdapter serializes operations that share provider home auth state", async () => {
  const adapter = Object.create(
    CodexProviderAdapter.prototype
  ) as CodexProviderAdapter;
  const calls: string[] = [];
  let activeOperations = 0;

  const runProviderHomeOperation = async <TResult>(
    label: string,
    result: TResult
  ): Promise<TResult> => {
    assert.equal(activeOperations, 0, `${label} started concurrently`);
    activeOperations += 1;
    calls.push(`start:${label}`);
    await waitForQueuedMicrotasks();
    calls.push(`end:${label}`);
    activeOperations -= 1;
    return result;
  };

  (
    adapter as unknown as {
      facade: {
        createSession: (workspacePath?: string) => Promise<string>;
        refreshUsageLimits: () => Promise<null>;
        resumeSession: (
          sessionId: string,
          workspacePath?: string
        ) => Promise<string>;
        sendMessage: (
          sessionId: string,
          content: string,
          turnOptions?: unknown
        ) => Promise<void>;
      };
      nativeRequestCaptureService: {
        captureNativeRequest: (options: unknown) => Promise<void>;
      };
    }
  ).facade = {
    createSession: async () =>
      await runProviderHomeOperation("create", "created-thread"),
    refreshUsageLimits: async () =>
      await runProviderHomeOperation("usage-limits", null),
    resumeSession: async () =>
      await runProviderHomeOperation("resume", "resumed-thread"),
    sendMessage: async () => {
      await runProviderHomeOperation("send", undefined);
    },
  };
  (
    adapter as unknown as {
      nativeRequestCaptureService: {
        captureNativeRequest: (options: unknown) => Promise<void>;
      };
    }
  ).nativeRequestCaptureService = {
    captureNativeRequest: async () => {
      await runProviderHomeOperation("capture", undefined);
    },
  };

  const broadcastEvents: unknown[] = [];
  await Promise.all([
    adapter.createSession("/workspace/create"),
    adapter.resumeSession("thread-id", "/workspace/resume"),
    adapter.sendMessage("thread-id", "content"),
    adapter.refreshUsageLimits({
      broadcast: (event) => {
        broadcastEvents.push(event);
      },
      providerSessionId: "codex-provider-session",
      runtimeSessionId: "runtime-session",
      workspacePath: "/workspace/usage",
    }),
    adapter.captureNativeRequest({
      captureId: "capture-serialized",
      certificateEnv: {},
      certificatePath: "/tmp/capture-ca.pem",
      probePrompt: "probe",
      proxyUrl: "http://127.0.0.1:4567",
      workspacePath: "/workspace/capture",
    }),
  ]);

  assert.deepEqual(calls, [
    "start:create",
    "end:create",
    "start:resume",
    "end:resume",
    "start:send",
    "end:send",
    "start:usage-limits",
    "end:usage-limits",
    "start:capture",
    "end:capture",
  ]);
  assert.equal(broadcastEvents.length, 0);
});

test("CodexProviderAdapter delegates native request capture to diagnostics service", async () => {
  const adapter = Object.create(
    CodexProviderAdapter.prototype
  ) as CodexProviderAdapter;
  const capturedOptions: unknown[] = [];
  (
    adapter as unknown as {
      nativeRequestCaptureService: {
        captureNativeRequest: (options: unknown) => Promise<void>;
      };
    }
  ).nativeRequestCaptureService = {
    captureNativeRequest: (options) => {
      capturedOptions.push(options);
      return Promise.resolve();
    },
  };

  await adapter.captureNativeRequest({
    captureId: "capture-codex-adapter",
    certificateEnv: {
      SSL_CERT_FILE: "/tmp/capture-ca.pem",
    },
    certificatePath: "/tmp/capture-ca.pem",
    probePrompt: "diagnostic probe",
    proxyUrl: "http://127.0.0.1:4567",
    workspacePath: "/workspace/capture",
  });

  assert.deepEqual(capturedOptions, [
    {
      captureId: "capture-codex-adapter",
      certificateEnv: {
        SSL_CERT_FILE: "/tmp/capture-ca.pem",
      },
      certificatePath: "/tmp/capture-ca.pem",
      probePrompt: "diagnostic probe",
      proxyUrl: "http://127.0.0.1:4567",
      workspacePath: "/workspace/capture",
    },
  ]);
});

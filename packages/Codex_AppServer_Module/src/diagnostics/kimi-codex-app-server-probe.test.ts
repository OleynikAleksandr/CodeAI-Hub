import assert from "node:assert/strict";
import test from "node:test";
import { runKimiCodexAppServerProbe } from "./kimi-codex-app-server-probe";

const withUnsetKimiApiKey = async (
  callback: () => Promise<void>
): Promise<void> => {
  const previous = process.env.KIMI_API_KEY;
  process.env.KIMI_API_KEY = "";
  try {
    await callback();
  } finally {
    if (previous === undefined) {
      process.env.KIMI_API_KEY = "";
    } else {
      process.env.KIMI_API_KEY = previous;
    }
  }
};

test("runKimiCodexAppServerProbe categorizes missing API key before process startup", async () => {
  await withUnsetKimiApiKey(async () => {
    let processFactoryCalled = false;
    const result = await runKimiCodexAppServerProbe({
      processFactory: () => {
        processFactoryCalled = true;
        throw new Error("process factory should not be called");
      },
      workspacePath: "/tmp/kimi-codex-probe",
    });

    assert.equal(result.ok, false);
    assert.equal(result.failure?.category, "missing_api_key");
    assert.equal(processFactoryCalled, false);
  });
});

test("runKimiCodexAppServerProbe starts thread and turn through Kimi-Codex process options", async () => {
  const notifications: Array<
    (notification: {
      readonly method: string;
      readonly params: unknown;
    }) => void
  > = [];
  const requestMethods: string[] = [];
  let capturedProviderHome = "";
  let capturedApiKey = "";

  const result = await runKimiCodexAppServerProbe({
    kimiApiKey: "test-kimi-key",
    processFactory: ({ environment, providerCodexHome }) => {
      capturedApiKey = environment.KIMI_API_KEY;
      capturedProviderHome = providerCodexHome;
      return {
        onNotification(listener) {
          notifications.push(listener);
          return () => undefined;
        },
        request<TResult = unknown>(method: string): Promise<TResult> {
          requestMethods.push(method);
          if (method === "thread/start") {
            return Promise.resolve({ thread: { id: "thread-1" } } as TResult);
          }
          queueMicrotask(() => {
            for (const listener of notifications) {
              listener({
                method: "turn/completed",
                params: { threadId: "thread-1" },
              });
            }
          });
          return Promise.resolve({} as TResult);
        },
        start() {
          return Promise.resolve();
        },
        stop() {
          return Promise.resolve();
        },
      };
    },
    providerHome: "/tmp/kimi-codex-home",
    workspacePath: "/tmp/kimi-codex-probe",
  });

  assert.equal(result.ok, true);
  assert.equal(result.threadId, "thread-1");
  assert.equal(capturedApiKey, "test-kimi-key");
  assert.equal(capturedProviderHome, "/tmp/kimi-codex-home");
  assert.deepEqual(requestMethods, ["thread/start", "turn/start"]);
  assert.deepEqual(
    result.events.map((event) => event.kind),
    [
      "app_server_start",
      "thread_start_request",
      "thread_start_response",
      "turn_start_request",
      "turn_start_response",
    ]
  );
});

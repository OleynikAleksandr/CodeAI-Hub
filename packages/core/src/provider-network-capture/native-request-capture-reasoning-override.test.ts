import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  ProviderAdapter,
  ProviderNativeRequestCaptureOptions,
} from "../provider-registry/provider-module-loader.types";
import {
  createCapturedProxyResult,
  NativeRequestCaptureFacade,
} from "./native-request-capture-facade";
import { applyNativeRequestCaptureReasoningOverride } from "./native-request-capture-reasoning-override";
import type { NativeRequestCaptureRequest } from "./native-request-capture-types";

class CaptureOptionsAdapter implements ProviderAdapter {
  readonly providerOptions: ProviderNativeRequestCaptureOptions[] = [];

  async captureNativeRequest(
    options: ProviderNativeRequestCaptureOptions
  ): Promise<void> {
    this.providerOptions.push(options);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5);
    });
  }

  closeSession(): Promise<void> {
    return Promise.resolve();
  }

  createSession(): Promise<string> {
    return Promise.resolve("session");
  }

  initialize(): Promise<void> {
    return Promise.resolve();
  }

  sendMessage(): Promise<void> {
    return Promise.resolve();
  }

  subscribe(): () => void {
    return () => undefined;
  }
}

const createCapturedRequest = (
  captureId: string
): NativeRequestCaptureRequest => ({
  body: { messages: [{ content: "probe", role: "user" }] },
  bodyText: "{}",
  captureId,
  headers: { "content-type": "application/json" },
  method: "POST",
  path: "/v1/messages",
  providerId: "claude",
  target: "api.anthropic.com:443",
  timestamp: "2026-05-02T10:00:00.000Z",
});

test("applyNativeRequestCaptureReasoningOverride normalizes Codex reasoning aliases", () => {
  assert.deepEqual(
    applyNativeRequestCaptureReasoningOverride({
      appliedTurnConfig: null,
      providerId: "codexCli",
      reasoning: "reasoning-high",
    }),
    {
      providerId: "codexCli",
      reasoningEffort: "high",
      source: "switch_request",
    }
  );
});

test("NativeRequestCaptureFacade applies one-shot Claude reasoning override without mutating settings config", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-reasoning-")
  );
  const adapter = new CaptureOptionsAdapter();
  const settingsSnapshotConfig = {
    providerId: "claudeCodeCli",
    reasoningEffort: "medium",
    source: "settings_snapshot" as const,
    thinkingEnabled: false,
  };
  const facade = new NativeRequestCaptureFacade({
    captureIdFactory: () => "capture-reasoning-test",
    certificateStore: {
      prepareHostCredentials: () =>
        Promise.resolve({
          caCertPath: "/tmp/ca.pem",
          certificatePath: "/tmp/ca.pem",
          credentials: {
            cert: "cert",
            key: "key",
          },
          envHints: {},
          hostCertPath: "/tmp/host.cert.pem",
          hostKeyPath: "/tmp/host.key.pem",
        }),
    },
    outputDir,
    preflight: {
      checkOpenSsl: () => Promise.resolve({ ok: true, reason: null }),
    },
    providerRegistry: {
      getAdapter: (providerId) =>
        providerId === "claudeCodeCli" ? adapter : undefined,
    },
    proxyFactory: (options) => ({
      start: () => {
        const request = createCapturedRequest("capture-reasoning-test");
        options.onEvent?.({
          captureId: "capture-reasoning-test",
          providerId: "claude",
          request,
          type: "request_captured",
        });
        return Promise.resolve({
          captureId: "capture-reasoning-test",
          port: 42,
          proxyUrl: "http://127.0.0.1:42",
          stop: () => Promise.resolve(),
          waitForCapture: () =>
            Promise.resolve(createCapturedProxyResult(request)),
        });
      },
    }),
    resolveAppliedTurnConfig: () => settingsSnapshotConfig,
  });

  try {
    const result = await facade.capture({
      providerId: "claude",
      reasoning: "thinking-high",
      workspacePath: "/workspace",
    });

    assert.equal(result.ok, true);
    assert.deepEqual(settingsSnapshotConfig, {
      providerId: "claudeCodeCli",
      reasoningEffort: "medium",
      source: "settings_snapshot",
      thinkingEnabled: false,
    });
    assert.deepEqual(adapter.providerOptions[0]?.appliedTurnConfig, {
      providerId: "claudeCodeCli",
      reasoningEffort: "high",
      source: "switch_request",
      thinkingEnabled: true,
    });
  } finally {
    await fs.rm(outputDir, { force: true, recursive: true });
  }
});

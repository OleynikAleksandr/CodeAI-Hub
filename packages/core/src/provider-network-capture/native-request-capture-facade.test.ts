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
  isNativeRequestCaptureProviderId,
  NativeRequestCaptureFacade,
} from "./native-request-capture-facade";
import type {
  NativeRequestCaptureProxyEvent,
  NativeRequestCaptureProxyResult,
  NativeRequestCaptureRequest,
} from "./native-request-capture-types";

const PROVIDER_RUNTIME_ERROR_RECORD_PATTERN = /provider_runtime_error/;
const PROVIDER_RUNTIME_ERROR_MESSAGE_PATTERN =
  /provider crashed before network/;
const PROVIDER_RUNTIME_ERROR_SECTION_PATTERN = /Provider Runtime Error/;

const createNoopAdapter = (): ProviderAdapter => ({
  closeSession: () => Promise.resolve(),
  createSession: () => Promise.resolve("session"),
  initialize: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  subscribe: () => () => undefined,
});

class BoundSensitiveCaptureAdapter implements ProviderAdapter {
  readonly providerOptions: ProviderNativeRequestCaptureOptions[] = [];

  captureNativeRequest(
    options: ProviderNativeRequestCaptureOptions
  ): Promise<void> {
    this.providerOptions.push(options);
    return new Promise((resolve) => {
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
  captureId,
  providerId: "claude",
  target: "api.anthropic.com:443",
  method: "POST",
  path: "/v1/messages",
  timestamp: "2026-04-24T10:00:00.000Z",
  headers: { "content-type": "application/json" },
  bodyText: "{}",
  body: { messages: [{ role: "user", content: "probe" }] },
});

test("NativeRequestCaptureFacade returns provider_not_supported for missing adapter method", async () => {
  assert.equal(isNativeRequestCaptureProviderId("claude"), true);
  assert.equal(isNativeRequestCaptureProviderId("gemini"), false);
  const facade = new NativeRequestCaptureFacade({
    providerRegistry: {
      getAdapter: () => createNoopAdapter(),
    },
  });

  const result = await facade.capture({
    providerId: "claude",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_not_supported");
});

test("NativeRequestCaptureFacade starts proxy and passes capture env to provider", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-facade-")
  );
  const adapter = new BoundSensitiveCaptureAdapter();
  const facade = new NativeRequestCaptureFacade({
    captureIdFactory: () => "capture-facade-test",
    outputDir,
    providerRegistry: {
      getAdapter: (providerId) =>
        providerId === "claudeCodeCli" ? adapter : undefined,
    },
    preflight: {
      checkOpenSsl: () => Promise.resolve({ ok: true, reason: null }),
    },
    certificateStore: {
      prepareHostCredentials: () =>
        Promise.resolve({
          caCertPath: "/tmp/ca.pem",
          certificatePath: "/tmp/ca.pem",
          credentials: {
            cert: "cert",
            key: "key",
          },
          envHints: {
            NODE_EXTRA_CA_CERTS: "/tmp/ca.pem",
            SSL_CERT_FILE: "/tmp/ca.pem",
          },
          hostCertPath: "/tmp/host.cert.pem",
          hostKeyPath: "/tmp/host.key.pem",
        }),
    },
    proxyFactory: (options) => ({
      start: () => {
        const request = createCapturedRequest("capture-facade-test");
        const capturedEvent: NativeRequestCaptureProxyEvent = {
          type: "request_captured",
          captureId: "capture-facade-test",
          providerId: "claude",
          request,
        };
        options.onEvent?.(capturedEvent);
        return Promise.resolve({
          captureId: "capture-facade-test",
          port: 42,
          proxyUrl: "http://127.0.0.1:42",
          stop: () => Promise.resolve(),
          waitForCapture: () =>
            Promise.resolve(createCapturedProxyResult(request)),
        });
      },
    }),
  });

  const result = await facade.capture({
    providerId: "claude",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, true);
  const capturedOptions = adapter.providerOptions[0];
  assert.ok(capturedOptions);
  assert.equal(capturedOptions.proxyUrl, "http://127.0.0.1:42");
  assert.equal(capturedOptions.certificatePath, "/tmp/ca.pem");
  assert.equal(capturedOptions.certificateEnv.SSL_CERT_FILE, "/tmp/ca.pem");
  assert.equal(capturedOptions.probePrompt.includes("native request"), true);
  assert.equal(Boolean(result.markdownPath), true);
  assert.equal(Boolean(result.jsonlPath), true);
});

test("NativeRequestCaptureFacade records provider runtime errors in artifacts", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-facade-")
  );
  const adapter: ProviderAdapter = {
    ...createNoopAdapter(),
    captureNativeRequest: () =>
      Promise.reject(new Error("provider crashed before network")),
  };
  const facade = new NativeRequestCaptureFacade({
    captureIdFactory: () => "capture-runtime-error-test",
    outputDir,
    providerRegistry: {
      getAdapter: (providerId) =>
        providerId === "claudeCodeCli" ? adapter : undefined,
    },
    preflight: {
      checkOpenSsl: () => Promise.resolve({ ok: true, reason: null }),
    },
    certificateStore: {
      prepareHostCredentials: () =>
        Promise.resolve({
          caCertPath: "/tmp/ca.pem",
          certificatePath: "/tmp/ca.pem",
          credentials: {
            cert: "cert",
            key: "key",
          },
          envHints: {
            NODE_EXTRA_CA_CERTS: "/tmp/ca.pem",
            SSL_CERT_FILE: "/tmp/ca.pem",
          },
          hostCertPath: "/tmp/host.cert.pem",
          hostKeyPath: "/tmp/host.key.pem",
        }),
    },
    proxyFactory: () => ({
      start: () =>
        Promise.resolve({
          captureId: "capture-runtime-error-test",
          port: 42,
          proxyUrl: "http://127.0.0.1:42",
          stop: () => Promise.resolve(),
          waitForCapture: () =>
            new Promise<NativeRequestCaptureProxyResult>(() => undefined),
        }),
    }),
  });

  const result = await facade.capture({
    providerId: "claude",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "runtime_failed");
  assert.ok(result.jsonlPath);
  assert.ok(result.markdownPath);
  const jsonl = await fs.readFile(result.jsonlPath, "utf8");
  const markdown = await fs.readFile(result.markdownPath, "utf8");
  assert.match(jsonl, PROVIDER_RUNTIME_ERROR_RECORD_PATTERN);
  assert.match(jsonl, PROVIDER_RUNTIME_ERROR_MESSAGE_PATTERN);
  assert.match(markdown, PROVIDER_RUNTIME_ERROR_SECTION_PATTERN);
  assert.match(markdown, PROVIDER_RUNTIME_ERROR_MESSAGE_PATTERN);
});

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ModelInvocationProfileResolver } from "../model-invocation/model-invocation-profile-resolver";
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
const PROVIDER_DIAGNOSTIC_CONTEXT_PATTERN = /provider_diagnostic_context/;
const PROVIDER_DIAGNOSTIC_CONTEXT_SECTION_PATTERN =
  /Provider Diagnostic Context/;
const TRANSLATION_PROMPT_LENGTH_PATTERN = /"promptLength":0/;
const TRANSLATION_PURPOSE_METADATA_PATTERN = /"purpose":"translation"/;
const WORKFLOW_PROMPT_LEAK_PATTERN = /workflow prompt must not reach provider/;

const createNoopAdapter = (): ProviderAdapter => ({
  closeSession: () => Promise.resolve(),
  createSession: () => Promise.resolve("session"),
  initialize: () => Promise.resolve(),
  sendMessage: () => Promise.resolve(),
  subscribe: () => () => undefined,
});

class BoundSensitiveCaptureAdapter implements ProviderAdapter {
  readonly providerOptions: ProviderNativeRequestCaptureOptions[] = [];

  async captureNativeRequest(
    options: ProviderNativeRequestCaptureOptions
  ): Promise<void> {
    this.providerOptions.push(options);
    await options.recordDiagnosticContext?.({
      kind: "facade_test_context",
      payload: { note: "provider diagnostic context" },
    });
    await options.recordAppliedInputEnvelope?.({
      allowDangerouslySkipPermissions: false,
      cwd: "/workspace",
      hasSystemPrompt: true,
      kind: "claude",
      permissionMode: "acceptEdits",
      settingSources: [],
      toolCount: 2,
    });
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

const createCodexCapturedRequest = (
  captureId: string
): NativeRequestCaptureRequest => ({
  body: { input: [{ content: "translation probe", role: "user" }] },
  bodyText: "{}",
  captureId,
  headers: { "content-type": "application/json" },
  method: "POST",
  path: "/backend-api/codex/responses",
  providerId: "codex",
  target: "chatgpt.com:443",
  timestamp: "2026-04-24T10:00:00.000Z",
});

const parseJsonlRecords = (jsonl: string): readonly Record<string, unknown>[] =>
  jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

test("NativeRequestCaptureFacade returns provider_not_supported for missing adapter method", async () => {
  assert.equal(isNativeRequestCaptureProviderId("claude"), true);
  assert.equal(isNativeRequestCaptureProviderId("removed-provider"), false);
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

test("NativeRequestCaptureFacade returns provider_not_ready for known provider without initialized adapter", async () => {
  const facade = new NativeRequestCaptureFacade({
    providerRegistry: {
      getAdapter: () => undefined,
      getDescriptor: (providerId) =>
        providerId === "claudeCodeCli" ? { id: providerId } : undefined,
    },
  });

  const result = await facade.capture({
    providerId: "claude",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "provider_not_ready");
});

test("NativeRequestCaptureFacade starts proxy and passes vanilla capture mode to provider", async () => {
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
        const targetRule = options.targetRules[0];
        assert.ok(targetRule);
        assert.equal(targetRule.host, "api.anthropic.com");
        assert.equal(targetRule.minimumToolCount, 1);
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
    captureMode: "vanilla",
    providerId: "claude",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, true);
  const capturedOptions = adapter.providerOptions[0];
  assert.ok(capturedOptions);
  assert.equal(capturedOptions.captureMode, "vanilla");
  assert.equal(capturedOptions.proxyUrl, "http://127.0.0.1:42");
  assert.equal(capturedOptions.certificatePath, "/tmp/ca.pem");
  assert.equal(capturedOptions.certificateEnv.SSL_CERT_FILE, "/tmp/ca.pem");
  assert.equal(capturedOptions.probePrompt.includes("native request"), true);
  assert.equal(Boolean(result.markdownPath), true);
  assert.equal(Boolean(result.jsonlPath), true);
  assert.ok(result.markdownPath);
  assert.ok(result.jsonlPath);
  const jsonl = await fs.readFile(result.jsonlPath, "utf8");
  const records = parseJsonlRecords(jsonl);
  const captureStart = records.find(
    (record) => record.type === "capture_start"
  );
  assert.ok(captureStart);
  assert.equal(captureStart.mode, "vanilla");
  assert.equal(typeof captureStart.releaseVersion, "string");
  assert.notEqual(captureStart.releaseVersion, "");
  const appliedEnvelope = records.find(
    (record) => record.type === "applied_input_envelope"
  );
  assert.ok(appliedEnvelope);
  assert.deepEqual(appliedEnvelope.envelope, {
    allowDangerouslySkipPermissions: false,
    cwd: "/workspace",
    hasSystemPrompt: true,
    kind: "claude",
    permissionMode: "acceptEdits",
    settingSources: [],
    toolCount: 2,
  });
  const markdown = await fs.readFile(result.markdownPath, "utf8");
  assert.match(markdown, PROVIDER_DIAGNOSTIC_CONTEXT_SECTION_PATTERN);
  assert.match(markdown, PROVIDER_DIAGNOSTIC_CONTEXT_PATTERN);
});

test("NativeRequestCaptureFacade routes translation scenario as translation purpose without workflow prompt", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-facade-")
  );
  const adapter = new BoundSensitiveCaptureAdapter();
  let resolverOptions: {
    readonly invocationPurpose: string;
    readonly providerId: string;
    readonly scenarioId?: string | null;
    readonly targetModelId?: string | null;
  } | null = null;
  let resolvedInvocationProfile: {
    readonly omitSummary: boolean;
    readonly persistExtendedHistory: boolean;
    readonly processProfileKey: string;
    readonly sessionProfileKey: string;
    readonly summary?: string | null;
    readonly toolProfileKey: string;
  } | null = null;
  const modelInvocationResolver = new ModelInvocationProfileResolver();
  const facade = new NativeRequestCaptureFacade({
    captureIdFactory: () => "capture-translation-scenario-test",
    outputDir,
    providerRegistry: {
      getAdapter: (providerId) =>
        providerId === "codexCli" ? adapter : undefined,
    },
    resolveAppliedTurnConfig: (options) => {
      resolverOptions = options;
      const profile = modelInvocationResolver.resolve({
        modelId: options.targetModelId ?? "gpt-5.4-mini",
        providerId: "codex",
        purpose: options.invocationPurpose,
      });
      resolvedInvocationProfile = {
        omitSummary: profile.turnProfile.omitSummary ?? false,
        persistExtendedHistory: profile.sessionProfile.persistExtendedHistory,
        processProfileKey: profile.processProfile.processProfileKey,
        sessionProfileKey: profile.sessionProfile.sessionProfileKey,
        summary: profile.turnProfile.summary,
        toolProfileKey: profile.processProfile.toolProfileKey,
      };
      return {
        modelId: options.targetModelId ?? undefined,
        providerId: options.providerId,
        source: "switch_request",
      };
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
        const targetRule = options.targetRules[0];
        assert.ok(targetRule);
        assert.equal(targetRule.host, "chatgpt.com");
        assert.equal(targetRule.pathIncludes, "/backend-api/codex/responses");
        const request = createCodexCapturedRequest(
          "capture-translation-scenario-test"
        );
        options.onEvent?.({
          captureId: "capture-translation-scenario-test",
          providerId: "codex",
          request,
          type: "request_captured",
        });
        return Promise.resolve({
          captureId: "capture-translation-scenario-test",
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
    modelId: "gpt-5.4-mini",
    providerId: "codex",
    scenarioId: "translation",
    scenarioLabel: "Translation",
    scenarioPrompt: "workflow prompt must not reach provider",
    workspacePath: "/workspace",
  });

  assert.equal(result.ok, true);
  assert.deepEqual(resolverOptions, {
    invocationPurpose: "translation",
    providerId: "codexCli",
    scenarioId: "translation",
    targetModelId: "gpt-5.4-mini",
  });
  assert.deepEqual(resolvedInvocationProfile, {
    omitSummary: false,
    persistExtendedHistory: false,
    processProfileKey: "codex:translation",
    sessionProfileKey: "codex:translation",
    summary: "none",
    toolProfileKey: "codex:translation-tools-minimal",
  });
  const capturedOptions = adapter.providerOptions[0];
  assert.ok(capturedOptions);
  assert.deepEqual(capturedOptions.appliedTurnConfig, {
    modelId: "gpt-5.4-mini",
    providerId: "codexCli",
    source: "switch_request",
  });
  assert.equal(capturedOptions.invocationPurpose, "translation");
  assert.equal(capturedOptions.captureMode, "managed");
  assert.equal(capturedOptions.scenarioId, "translation");
  assert.equal(capturedOptions.workflowPrompt, null);
  assert.ok(result.jsonlPath);
  const jsonl = await fs.readFile(result.jsonlPath, "utf8");
  assert.match(jsonl, TRANSLATION_PURPOSE_METADATA_PATTERN);
  assert.match(jsonl, TRANSLATION_PROMPT_LENGTH_PATTERN);
  assert.doesNotMatch(jsonl, WORKFLOW_PROMPT_LEAK_PATTERN);
  const captureStart = parseJsonlRecords(jsonl).find(
    (record) => record.type === "capture_start"
  );
  assert.ok(captureStart);
  assert.deepEqual(captureStart.appliedTurnConfig, {
    modelId: "gpt-5.4-mini",
    providerId: "codexCli",
    source: "switch_request",
  });
  assert.deepEqual(captureStart.scenarioMetadata, {
    id: "translation",
    inputPath: null,
    label: "Translation",
    promptLength: 0,
    purpose: "translation",
    targetPath: null,
  });
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

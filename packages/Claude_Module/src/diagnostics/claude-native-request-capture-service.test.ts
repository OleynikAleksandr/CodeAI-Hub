import assert from "node:assert/strict";
import test from "node:test";
import { ClaudeNativeRequestCaptureService } from "./claude-native-request-capture-service";

const shouldYieldEmptyStreamValue = (): boolean => false;

async function* emptyClaudeStream(): AsyncIterableIterator<never> {
  await Promise.resolve();
  if (shouldYieldEmptyStreamValue()) {
    yield undefined as never;
  }
}

test("ClaudeNativeRequestCaptureService injects proxy and certificate env into SDK query", async () => {
  const authCalls: {
    bootstrap?: Record<string, unknown>;
    subscription?: Record<string, unknown>;
  } = {};
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const appliedInputEnvelopes: unknown[] = [];
  const callOrder: string[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: (
        payload: Record<string, unknown>
      ) => {
        authCalls.bootstrap = payload;
        return Promise.resolve();
      },
      ensureSubscriptionAuth: (options: Record<string, unknown>) => {
        authCalls.subscription = options;
        return Promise.resolve();
      },
      getAuthEnvironment: () => ({ HOME: "/provider-home" }),
    } as never,
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: (payload: {
            readonly options: Record<string, unknown>;
            readonly prompt: string;
          }) => {
            callOrder.push("query");
            queryPayloads.push(payload);
            return emptyClaudeStream();
          },
        }),
    } as never,
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "sonnet",
      workspacePath: "/workspace",
    },
  });

  await service.captureNativeRequest({
    captureId: "capture-claude-test",
    certificateEnv: {
      NODE_EXTRA_CA_CERTS: "/tmp/ca.pem",
      SSL_CERT_FILE: "/tmp/ca.pem",
    },
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    recordAppliedInputEnvelope: (envelope) => {
      callOrder.push("envelope");
      appliedInputEnvelopes.push(envelope);
    },
    workflowPrompt: "workflow prompt",
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.equal(queryPayload.prompt, "workflow prompt");
  assert.equal(queryPayload.options.cwd, "/workspace");
  assert.deepEqual(queryPayload.options.additionalDirectories, ["/workspace"]);
  assert.deepEqual(queryPayload.options.settingSources, []);
  assert.deepEqual(callOrder, ["envelope", "query"]);
  assert.deepEqual(appliedInputEnvelopes[0], {
    allowDangerouslySkipPermissions: true,
    cwd: "/workspace",
    hasSystemPrompt: true,
    kind: "claude",
    permissionMode: "bypassPermissions",
    settingSources: [],
    toolCount: 4,
  });
  assert.equal(typeof queryPayload.options.systemPrompt, "string");
  assert.equal(
    (queryPayload.options.systemPrompt as string).includes(
      "# Agent Operating Rules"
    ),
    true
  );
  assert.equal(
    (queryPayload.options.systemPrompt as string).includes("CodeAI Hub"),
    true
  );
  assert.equal(
    (queryPayload.options.systemPrompt as string).includes(
      "## Progress Updates"
    ),
    true
  );
  assert.equal(
    (queryPayload.options.systemPrompt as string).includes("claude_code"),
    false
  );
  assert.deepEqual(queryPayload.options.tools, [
    "Read",
    "Write",
    "Edit",
    "WebSearch",
  ]);
  assert.deepEqual(authCalls.subscription, { executablePath: "/tmp/claude" });
  assert.deepEqual(authCalls.bootstrap, {
    executablePath: "/tmp/claude",
    workspacePath: "/workspace",
  });
  assert.equal(queryPayload.options.model, "sonnet");
  assert.deepEqual(queryPayload.options.thinking, { type: "disabled" });
  assert.equal(
    (queryPayload.options.env as Record<string, string>).HTTPS_PROXY,
    "http://127.0.0.1:4444"
  );
  assert.equal(
    (queryPayload.options.env as Record<string, string>).SSL_CERT_FILE,
    "/tmp/ca.pem"
  );
  assert.equal(queryPayload.options.persistSession, false);

  await service.captureNativeRequest({
    captureId: "capture-claude-vanilla-test",
    captureMode: "vanilla",
    certificateEnv: {
      NODE_EXTRA_CA_CERTS: "/tmp/ca.pem",
      SSL_CERT_FILE: "/tmp/ca.pem",
    },
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    recordAppliedInputEnvelope: (envelope) => {
      appliedInputEnvelopes.push(envelope);
    },
    workflowPrompt: "workflow prompt",
    workspacePath: "/workspace",
  });

  const vanillaPayload = queryPayloads[1];
  assert.ok(vanillaPayload);
  assert.equal(vanillaPayload.prompt, "workflow prompt");
  assert.equal("systemPrompt" in vanillaPayload.options, false);
  assert.equal("tools" in vanillaPayload.options, false);
  assert.equal("settingSources" in vanillaPayload.options, false);
  assert.equal("permissionMode" in vanillaPayload.options, false);
  assert.equal(
    "allowDangerouslySkipPermissions" in vanillaPayload.options,
    false
  );
  assert.equal("projectPath" in vanillaPayload.options, false);
  assert.equal("additionalDirectories" in vanillaPayload.options, false);
  assert.deepEqual(appliedInputEnvelopes[1], {
    allowDangerouslySkipPermissions: null,
    cwd: "/workspace",
    hasSystemPrompt: false,
    kind: "claude",
    permissionMode: null,
    settingSources: null,
    toolCount: 0,
  });
});

test("ClaudeNativeRequestCaptureService mirrors selected model and applied thinking config", async () => {
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: () => Promise.resolve(),
      ensureSubscriptionAuth: () => Promise.resolve(),
      getAuthEnvironment: () => ({}),
    } as never,
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: (payload: {
            readonly options: Record<string, unknown>;
            readonly prompt: string;
          }) => {
            queryPayloads.push(payload);
            return emptyClaudeStream();
          },
        }),
    } as never,
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "sonnet",
      workspacePath: "/workspace",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "opus",
      providerId: "claudeCodeCli",
      reasoningEffort: "high",
      source: "switch_request",
      thinkingEnabled: true,
    },
    captureId: "capture-claude-app-config-test",
    certificateEnv: {},
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    selectedModelId: "haiku",
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.equal(queryPayload.options.model, "opus");
  assert.deepEqual(queryPayload.options.thinking, {
    type: "adaptive",
    display: "summarized",
  });
  assert.equal(queryPayload.options.effort, "high");
});

test("ClaudeNativeRequestCaptureService captures post-switch model and xhigh config in SDK isolation", async () => {
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: () => Promise.resolve(),
      ensureSubscriptionAuth: () => Promise.resolve(),
      getAuthEnvironment: () => ({}),
    } as never,
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: (payload: {
            readonly options: Record<string, unknown>;
            readonly prompt: string;
          }) => {
            queryPayloads.push(payload);
            return emptyClaudeStream();
          },
        }),
    } as never,
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "sonnet",
      workspacePath: "/workspace",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "haiku",
      providerId: "claudeCodeCli",
      reasoningEffort: "xhigh",
      source: "switch_request",
      thinkingEnabled: true,
    },
    captureId: "capture-claude-post-switch-xhigh",
    certificateEnv: {},
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    selectedModelId: "sonnet",
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.equal(queryPayload.options.model, "haiku");
  assert.deepEqual(queryPayload.options.thinking, {
    type: "adaptive",
    display: "summarized",
  });
  assert.equal(queryPayload.options.effort, "xhigh");
  assert.deepEqual(queryPayload.options.settingSources, []);
});

test("ClaudeNativeRequestCaptureService captures post-switch thinking off without effort", async () => {
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: () => Promise.resolve(),
      ensureSubscriptionAuth: () => Promise.resolve(),
      getAuthEnvironment: () => ({}),
    } as never,
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: (payload: {
            readonly options: Record<string, unknown>;
            readonly prompt: string;
          }) => {
            queryPayloads.push(payload);
            return emptyClaudeStream();
          },
        }),
    } as never,
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "sonnet",
      workspacePath: "/workspace",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "opus",
      providerId: "claudeCodeCli",
      source: "switch_request",
      thinkingEnabled: false,
    },
    captureId: "capture-claude-post-switch-off",
    certificateEnv: {},
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    selectedModelId: "haiku",
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.equal(queryPayload.options.model, "opus");
  assert.deepEqual(queryPayload.options.thinking, { type: "disabled" });
  assert.equal("effort" in queryPayload.options, false);
  assert.deepEqual(queryPayload.options.settingSources, []);
});

test("ClaudeNativeRequestCaptureService mirrors hidden-thinking display selection", async () => {
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: () => Promise.resolve(),
      ensureSubscriptionAuth: () => Promise.resolve(),
      getAuthEnvironment: () => ({}),
    } as never,
    installer: {
      ensureInstalled: () => Promise.resolve(),
      getExecutablePath: () => "/tmp/claude",
      loadModule: () =>
        Promise.resolve({
          query: (payload: {
            readonly options: Record<string, unknown>;
            readonly prompt: string;
          }) => {
            queryPayloads.push(payload);
            return emptyClaudeStream();
          },
        }),
    } as never,
    workspace: {
      claudeProjectSlug: "workspace-slug",
      defaultModel: "sonnet",
      workspacePath: "/workspace",
    },
  });

  await service.captureNativeRequest({
    appliedTurnConfig: {
      modelId: "opus",
      providerId: "claudeCodeCli",
      reasoningEffort: "high",
      source: "switch_request",
      thinkingDisplaySyncEnabled: false,
      thinkingEnabled: true,
    },
    captureId: "capture-claude-hidden-thinking",
    certificateEnv: {},
    certificatePath: "/tmp/ca.pem",
    probePrompt: "probe",
    proxyUrl: "http://127.0.0.1:4444",
    selectedModelId: "haiku",
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.deepEqual(queryPayload.options.thinking, {
    type: "adaptive",
    display: "omitted",
  });
  assert.equal(queryPayload.options.effort, "high");
});

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
  const queryPayloads: {
    readonly options: Record<string, unknown>;
    readonly prompt: string;
  }[] = [];
  const service = new ClaudeNativeRequestCaptureService({
    authManager: {
      ensureProviderHomeSessionBootstrap: () => Promise.resolve(),
      ensureSubscriptionAuth: () => Promise.resolve(),
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
    workspacePath: "/workspace",
  });

  const queryPayload = queryPayloads[0];
  assert.ok(queryPayload);
  assert.equal(queryPayload.prompt, "probe");
  assert.equal(queryPayload.options.cwd, "/workspace");
  assert.deepEqual(queryPayload.options.additionalDirectories, ["/workspace"]);
  assert.deepEqual(queryPayload.options.settingSources, []);
  assert.equal(queryPayload.options.model, "sonnet");
  assert.equal(
    (queryPayload.options.env as Record<string, string>).HTTPS_PROXY,
    "http://127.0.0.1:4444"
  );
  assert.equal(
    (queryPayload.options.env as Record<string, string>).SSL_CERT_FILE,
    "/tmp/ca.pem"
  );
  assert.equal(queryPayload.options.persistSession, false);
});

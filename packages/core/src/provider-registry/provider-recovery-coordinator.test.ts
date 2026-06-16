import assert from "node:assert/strict";
import test from "node:test";
import type { Logger } from "../telemetry/logger";
import type {
  MutableProviderDescriptor,
  ProviderAdapter,
} from "./provider-module-loader.types";
import { ProviderRecoveryCoordinator } from "./provider-recovery-coordinator";

const CLAUDE_LOGIN_NOT_REUSED_PATTERN = /Claude login is not reused/;
const GLM_CONFIG_PATH_PATTERN =
  /~\/\.codeai-hub\/providers\/glm-claude-code\/config\.json/;
const API_KEY_FIELD_PATTERN = /"apiKey"/;
const RESTART_CORE_PATTERN = /Settings → General → Restart Core/;

const createAdapter = (initialize: () => Promise<void>): ProviderAdapter => ({
  closeSession: async () => undefined,
  createSession: async () => "provider-session-id",
  initialize,
  sendMessage: async () => undefined,
  subscribe: () => () => undefined,
});

const createCoordinator = (): ProviderRecoveryCoordinator =>
  new ProviderRecoveryCoordinator({
    clearRetry: () => undefined,
    createClaudeAdapter: () => createAdapter(async () => undefined),
    createCodexAdapter: () => createAdapter(async () => undefined),
    createGlmClaudeCodeAdapter: () => createAdapter(async () => undefined),
    createGlmOpenCodeAdapter: () => createAdapter(async () => undefined),
    createKimiAdapter: () => createAdapter(async () => undefined),
    emitStatus: () => undefined,
    ensureGeminiAdapter: async () => undefined,
    logger: {
      error: () => undefined,
    } as unknown as Logger,
    scheduleRetry: () => undefined,
  });

test("GLM recovery copy points to the generated config apiKey field", async () => {
  const descriptor: MutableProviderDescriptor = {
    adapter: createAdapter(() => Promise.reject(new Error("missing key"))),
    description: "Requires a separate Z.AI/GLM API key",
    id: "glmClaudeCode",
    name: "GLM-Claude-Code",
    status: "active",
  };

  await createCoordinator().prepareProvider(descriptor);

  assert.equal(descriptor.status, "inactive");
  assert.equal(descriptor.adapter, undefined);
  assert.match(descriptor.statusMessage ?? "", CLAUDE_LOGIN_NOT_REUSED_PATTERN);
  assert.match(descriptor.statusMessage ?? "", GLM_CONFIG_PATH_PATTERN);
  assert.match(descriptor.statusMessage ?? "", API_KEY_FIELD_PATTERN);
  assert.match(descriptor.statusMessage ?? "", RESTART_CORE_PATTERN);
});

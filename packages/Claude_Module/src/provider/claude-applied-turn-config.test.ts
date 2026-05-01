import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import type { ActiveSession } from "../session/types";
import {
  applyClaudeTurnRuntimeConfig,
  readAppliedClaudeTurnConfig,
} from "./claude-applied-turn-config";

const createSession = (): ActiveSession =>
  ({
    sessionId: "session-applied-claude-config",
    workspacePath: "/workspace",
    createdAt: Date.now(),
    eventEmitter: new EventEmitter(),
    messageController: {
      pendingMessages: [],
      resolveNext: null,
    },
    runtimeTurnConfig: {
      reasoningEffort: "high",
      thinkingDisplaySyncEnabled: false,
      thinkingEnabled: true,
    },
  }) as ActiveSession;

test("readAppliedClaudeTurnConfig reads switched model and xhigh thinking", () => {
  const config = readAppliedClaudeTurnConfig({
    __codeaiAppliedTurnConfig: {
      providerId: "claudeCodeCli",
      baseModelId: "sonnet",
      modelId: " opus ",
      reasoningEffort: "xhigh",
      thinkingDisplaySyncEnabled: true,
      thinkingEnabled: true,
    },
  });

  assert.equal(config?.modelId, "opus");
  assert.equal(config?.reasoningEffort, "xhigh");
  assert.equal(config?.thinkingDisplaySyncEnabled, true);
  assert.equal(config?.thinkingEnabled, true);
});

test("readAppliedClaudeTurnConfig ignores non-Claude applied config", () => {
  const config = readAppliedClaudeTurnConfig({
    __codeaiAppliedTurnConfig: {
      providerId: "codexCli",
      modelId: "gpt-5.3-codex",
      reasoningEffort: "high",
      thinkingEnabled: true,
    },
  });

  assert.equal(config, null);
});

test("applyClaudeTurnRuntimeConfig applies thinking off without stale effort", () => {
  const owner = createSession();

  applyClaudeTurnRuntimeConfig({
    owner,
    turnOptions: {
      __codeaiAppliedTurnConfig: {
        providerId: "claudeCodeCli",
        baseModelId: "haiku",
        thinkingEnabled: false,
      },
    },
  });

  assert.equal(owner.runtimeTurnConfig.reasoningEffort, undefined);
  assert.equal(owner.runtimeTurnConfig.thinkingEnabled, false);
  assert.equal(owner.runtimeTurnConfig.thinkingDisplaySyncEnabled, true);
});

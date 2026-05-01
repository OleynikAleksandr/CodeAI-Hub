import assert from "node:assert/strict";
import test from "node:test";
import type { SessionRecord } from "../../../../types/session";
import {
  resolveDialogClaudeSwitchRequest,
  resolveDialogCodexBaseModelId,
} from "./project-manager-dialog-model-switch-helpers";

const createSession = (
  providerId: "claudeCodeCli" | "codexCli",
  modelBinding?: SessionRecord["modelBinding"]
): SessionRecord =>
  ({
    id: `${providerId}-session`,
    providerIds: [providerId],
    modelBinding,
  }) as unknown as SessionRecord;

test("resolveDialogCodexBaseModelId strips effective suffix", () => {
  const modelId = resolveDialogCodexBaseModelId({
    session: createSession("codexCli"),
    visibleModelId: "gpt-5.3-codex reasoning:xhigh",
  });

  assert.equal(modelId, "gpt-5.3-codex");
});

test("resolveDialogClaudeSwitchRequest preserves selected model effort", () => {
  const request = resolveDialogClaudeSwitchRequest({
    requestedModelId: "opus",
    session: createSession("claudeCodeCli"),
    thinking: "xhigh",
  });

  assert.deepEqual(request, {
    sessionId: "claudeCodeCli-session",
    modelId: "opus",
    thinkingEnabled: true,
    targetReasoningEffort: "xhigh",
  });
});

test("resolveDialogClaudeSwitchRequest keeps current model when toggling thinking", () => {
  const request = resolveDialogClaudeSwitchRequest({
    session: createSession("claudeCodeCli", {
      providerId: "claudeCodeCli",
      baseModelId: "haiku",
      modelId: "haiku reasoning:medium",
    }),
    thinking: "off",
  });

  assert.deepEqual(request, {
    sessionId: "claudeCodeCli-session",
    modelId: "haiku",
    thinkingEnabled: false,
  });
});

test("resolveDialogClaudeSwitchRequest ignores non-Claude sessions", () => {
  const request = resolveDialogClaudeSwitchRequest({
    requestedModelId: "sonnet",
    session: createSession("codexCli"),
    thinking: "medium",
  });

  assert.equal(request, null);
});

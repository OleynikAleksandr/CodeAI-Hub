import assert from "node:assert/strict";
import test from "node:test";
import type { SessionRecord } from "../../../../types/session";
import { resolveDialogCodexBaseModelId } from "./project-manager-dialog-model-switch-helpers";

const createSession = (
  providerId: "claudeCodeCli" | "codexCli",
  modelBinding?: SessionRecord["modelBinding"]
): SessionRecord =>
  ({
    id: `${providerId}-session`,
    providerIds: [providerId],
    modelBinding,
  }) as unknown as SessionRecord;

test("resolveDialogCodexBaseModelId returns the bound base model directly", () => {
  const modelId = resolveDialogCodexBaseModelId(
    createSession("codexCli", {
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex",
      modelId: "gpt-5.3-codex reasoning:xhigh",
    })
  );

  assert.equal(modelId, "gpt-5.3-codex");
});

test("resolveDialogCodexBaseModelId falls back to stripping reasoning suffix from modelId", () => {
  const modelId = resolveDialogCodexBaseModelId(
    createSession("codexCli", {
      providerId: "codexCli",
      modelId: "gpt-5.4-mini reasoning:high",
    })
  );

  assert.equal(modelId, "gpt-5.4-mini");
});

test("resolveDialogCodexBaseModelId returns null for non-Codex sessions", () => {
  const modelId = resolveDialogCodexBaseModelId(createSession("claudeCodeCli"));

  assert.equal(modelId, null);
});

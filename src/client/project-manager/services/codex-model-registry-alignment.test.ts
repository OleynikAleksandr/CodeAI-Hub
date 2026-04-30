import assert from "node:assert/strict";
import test from "node:test";
import { listCodexModelCapabilities } from "../../../../packages/Codex_AppServer_Module/src/types/codex-model-capabilities";
import { CODEX_SETTINGS_MODELS } from "../../../types/codex-model-registry";

test("Codex UI model registry mirrors runtime capability model ids", () => {
  const runtimeModelIds = listCodexModelCapabilities().map(
    (capabilities) => capabilities.modelId
  );
  const uiModelIds = CODEX_SETTINGS_MODELS.map((model) => model.id);

  assert.deepEqual(uiModelIds, runtimeModelIds);
});

test("Codex UI model registry mirrors runtime capabilities", () => {
  const runtimeByModelId = new Map(
    listCodexModelCapabilities().map((capabilities) => [
      capabilities.modelId,
      capabilities,
    ])
  );

  for (const model of CODEX_SETTINGS_MODELS) {
    const runtime = runtimeByModelId.get(model.id);
    assert.ok(runtime, `Missing runtime capabilities for ${model.id}`);
    assert.equal(
      model.supportsReasoningSummary,
      runtime.supportsReasoningSummary
    );
    assert.equal(model.supportsVerbosity, runtime.supportsVerbosity);
    assert.deepEqual(
      model.reasoningEffortOptions,
      runtime.reasoningEffortOptions
    );
    assert.equal(model.contextWindow, runtime.contextWindow);
    assert.equal(model.autoCompactTokenLimit, runtime.autoCompactTokenLimit);
  }
});

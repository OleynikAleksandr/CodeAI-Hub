import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_KIMI_MODEL_ID as RUNTIME_DEFAULT_KIMI_MODEL_ID,
  KIMI_MODEL_CAPABILITIES,
  findKimiModelCapabilities,
  isKnownKimiModelId,
  listKimiModelCapabilities,
} from "../../../../packages/Kimi_Module/src/types/kimi-model-capabilities";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_MODEL_ID_SET,
  KIMI_RECOMMENDED_MODELS,
  findKimiModelDescriptor,
} from "../../../types/kimi-model-registry";

test("Kimi UI model registry mirrors runtime capability model ids", () => {
  const runtimeModelIds = listKimiModelCapabilities().map(
    (capabilities) => capabilities.modelId
  );
  const uiModelIds = KIMI_RECOMMENDED_MODELS.map((model) => model.id);

  assert.deepEqual(uiModelIds, runtimeModelIds);
  assert.equal(DEFAULT_KIMI_MODEL_ID, RUNTIME_DEFAULT_KIMI_MODEL_ID);
});

test("Kimi UI model registry mirrors runtime capabilities", () => {
  const runtimeByModelId = new Map(
    listKimiModelCapabilities().map((capabilities) => [
      capabilities.modelId,
      capabilities,
    ])
  );

  for (const model of KIMI_RECOMMENDED_MODELS) {
    const runtime = runtimeByModelId.get(model.id);
    assert.ok(runtime, `Missing runtime capabilities for ${model.id}`);
    assert.equal(model.displayName, runtime.displayName);
    assert.equal(
      model.supportsReasoningControl,
      runtime.supportsReasoningControl
    );
    assert.equal(
      model.supportsThinkingDisplaySummarized,
      runtime.supportsThinkingDisplaySummarized
    );
  }
});

test("Kimi model registry helpers resolve known and unknown ids", () => {
  assert.deepEqual(listKimiModelCapabilities(), KIMI_MODEL_CAPABILITIES);
  assert.equal(KIMI_MODEL_ID_SET.has(DEFAULT_KIMI_MODEL_ID), true);
  assert.equal(isKnownKimiModelId(DEFAULT_KIMI_MODEL_ID), true);
  assert.equal(isKnownKimiModelId("unknown-kimi-model"), false);
  assert.equal(
    findKimiModelDescriptor(DEFAULT_KIMI_MODEL_ID)?.displayName,
    "Kimi K2.7 Code"
  );
  assert.equal(
    findKimiModelCapabilities(DEFAULT_KIMI_MODEL_ID)?.displayName,
    "Kimi K2.7 Code"
  );
  assert.equal(findKimiModelDescriptor("unknown-kimi-model"), null);
  assert.equal(findKimiModelCapabilities("unknown-kimi-model"), null);
});

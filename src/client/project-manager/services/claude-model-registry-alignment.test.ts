import assert from "node:assert/strict";
import test from "node:test";
import { CLAUDE_MODEL_CAPABILITIES } from "../../../../packages/Claude_Module/src/types/claude-model-capabilities";
import { CLAUDE_MODEL_ALIASES } from "../../../types/claude-model-registry";

test("Claude UI model registry mirrors runtime capability aliases", () => {
  const runtimeAliases = CLAUDE_MODEL_CAPABILITIES.map(
    (capabilities) => capabilities.modelId
  );
  const uiAliases = CLAUDE_MODEL_ALIASES.map((model) => model.alias);

  assert.deepEqual(uiAliases, runtimeAliases);
});

test("Claude UI model registry mirrors runtime capabilities", () => {
  const runtimeByAlias = new Map(
    CLAUDE_MODEL_CAPABILITIES.map((capabilities) => [
      capabilities.modelId,
      capabilities,
    ])
  );

  for (const model of CLAUDE_MODEL_ALIASES) {
    const runtime = runtimeByAlias.get(model.alias);
    assert.ok(runtime, `Missing runtime capabilities for ${model.alias}`);
    assert.equal(model.supportsThinking, runtime.supportsThinking);
    assert.equal(
      model.supportsThinkingDisplaySummarized,
      runtime.supportsThinkingDisplaySummarized
    );
    assert.deepEqual(
      model.thinkingEffortOptions,
      runtime.thinkingEffortOptions
    );
    assert.equal(
      model.defaultThinkingEffort,
      runtime.defaultThinkingEffort
    );
  }
});

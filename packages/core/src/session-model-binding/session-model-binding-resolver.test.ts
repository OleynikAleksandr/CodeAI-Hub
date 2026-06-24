import assert from "node:assert/strict";
import test from "node:test";
import { SessionModelBindingFacade } from "./session-model-binding-facade";
import { SessionModelBindingResolver } from "./session-model-binding-resolver";

test("SessionModelBindingResolver clones inherited continuity binding without Settings lookup", () => {
  const resolver = new SessionModelBindingResolver({
    facade: new SessionModelBindingFacade({
      clock: () => "2026-04-28T12:10:00.000Z",
    }),
    providerTurnConfig: {
      env: {},
      fallbackClaudeModel: "sonnet",
      fallbackCodexModel: "gpt-5.5",
      fallbackCodexReasoningEffort: "medium",
      settingsPath: "/missing/settings.json",
    },
  });

  const binding = resolver.inheritBinding({
    providerId: "codexCli",
    sessionId: "child-session",
    continuityRootId: "root-session",
    sourceBinding: {
      key: "provider\u001fcodexCli\u001fsession\u001froot-session",
      providerId: "codexCli",
      baseModelId: "gpt-5.3-codex-spark",
      modelId: "gpt-5.3-codex-spark reasoning:xhigh",
      reasoningEffort: "xhigh",
      source: "settings_default",
      boundAt: "2026-04-28T12:00:00.000Z",
      updatedAt: "2026-04-28T12:00:00.000Z",
    },
  });

  assert.equal(binding.source, "continuity_inherited");
  assert.equal(binding.baseModelId, "gpt-5.3-codex-spark");
  assert.equal(binding.modelId, "gpt-5.3-codex-spark reasoning:xhigh");
  assert.equal(binding.reasoningEffort, "xhigh");
});

test("SessionModelBindingResolver carries workspace settings path on bindings", () => {
  const resolver = new SessionModelBindingResolver({
    facade: new SessionModelBindingFacade({
      clock: () => "2026-04-28T12:10:00.000Z",
    }),
    providerTurnConfig: {
      env: {},
      fallbackClaudeModel: "sonnet",
      fallbackCodexModel: "gpt-5.5",
      fallbackCodexReasoningEffort: "medium",
      settingsPath: "/global/settings.json",
    },
    settingsPathResolver: (key) =>
      key.workspacePath ? `${key.workspacePath}/runtime/settings.json` : null,
  });

  const binding = resolver.bindFromSettingsDefault({
    providerId: "codexCli",
    sessionId: "workflow-session",
    workspacePath: "/workspace/demo",
    workspaceSlug: "demo",
  });

  assert.ok(binding);
  assert.equal(binding?.settingsPath, "/workspace/demo/runtime/settings.json");

  const inherited = resolver.inheritBinding({
    providerId: "codexCli",
    sessionId: "child-session",
    continuityRootId: "workflow-session",
    sourceBinding: binding,
  });

  assert.equal(inherited.settingsPath, "/workspace/demo/runtime/settings.json");
});

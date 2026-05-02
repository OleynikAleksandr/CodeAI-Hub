import assert from "node:assert/strict";
import test from "node:test";
import { extractClaudeDiffSections } from "./diff-section-extractor-claude";
import { extractCodexDiffSections } from "./diff-section-extractor-codex";

test("Claude diff extractor maps loaded JSONL records to Phase 1 sections", () => {
  const sections = extractClaudeDiffSections([
    captureStart("claude"),
    {
      type: "applied_input_envelope",
      providerId: "claude",
      envelope: {
        kind: "claude",
        permissionMode: "bypassPermissions",
        settingSources: [],
        toolCount: 2,
      },
    },
    {
      type: "request_captured",
      providerId: "claude",
      method: "POST",
      path: "/v1/messages",
      target: "api.anthropic.com",
      body: {
        system: "Claude system",
        tools: [{ name: "Read" }],
        messages: [{ role: "user", content: "Build it" }],
        model: "claude-sonnet-4-5",
        thinking: { type: "enabled", budget_tokens: 4096 },
      },
    },
  ]);

  assert.equal(sections.system_prompt, "Claude system");
  assert.deepEqual(sections.tools, [{ name: "Read" }]);
  assert.deepEqual(sections.endpoint, {
    method: "POST",
    path: "/v1/messages",
    target: "api.anthropic.com",
  });
  assert.deepEqual(
    (sections.sdk_isolation_claude as { permissionMode?: string }).permissionMode,
    "bypassPermissions"
  );
  assert.equal("provider_home_auth" in sections, false);
});

test("Codex diff extractor maps loaded JSONL records to Phase 1 sections", () => {
  const sections = extractCodexDiffSections([
    captureStart("codex"),
    {
      type: "applied_input_envelope",
      providerId: "codex",
      envelope: {
        kind: "codex",
        processProfileKey: "workspace-write",
        approvalPolicy: "on-request",
        sandbox: "workspace-write",
        persistExtendedHistory: true,
      },
    },
    {
      type: "request_captured",
      providerId: "codex",
      method: "WS",
      path: "/api/codex",
      target: "127.0.0.1",
      body: {
        instructions: "Codex instructions",
        input: [{ role: "user", content: [{ type: "text", text: "Build it" }] }],
        tools: [{ name: "shell" }],
        model: "gpt-5.3-codex",
        reasoning: { effort: "high" },
      },
    },
  ]);

  assert.equal(sections.system_prompt, "Codex instructions");
  assert.deepEqual(sections.user_prompt, [
    { role: "user", content: [{ type: "text", text: "Build it" }] },
  ]);
  assert.deepEqual(
    (sections.process_profile_codex as { approvalPolicy?: string }).approvalPolicy,
    "on-request"
  );
  assert.equal("provider_home_auth" in sections, false);
});

test("Provider diff extractors do not emit empty no-data sections", () => {
  assert.deepEqual(extractClaudeDiffSections([]), {});
  assert.deepEqual(extractCodexDiffSections([]), {});
});

const captureStart = (providerId: "claude" | "codex") => ({
  type: "capture_start",
  providerId,
  selectedModelId:
    providerId === "claude" ? "claude-sonnet-4-5" : "gpt-5.3-codex",
  scenarioMetadata: {
    scenarioId: "description",
    scenarioTargetPath: ".codeai-hub/demo/description/Final_Description.md",
  },
});

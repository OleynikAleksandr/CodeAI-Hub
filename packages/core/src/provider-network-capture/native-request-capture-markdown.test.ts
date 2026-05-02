import assert from "node:assert/strict";
import test from "node:test";
import { buildNativeRequestCaptureMarkdown } from "./native-request-capture-markdown";

const APPLIED_INPUT_ENVELOPE_HEADING_PATTERN = /## Applied Input Envelope/;
const APPLIED_INPUT_ENVELOPE_NULL_PATTERN =
  /## Applied Input Envelope\n\n```json\nnull\n```/;
const CREDENTIAL_FIELD_PATTERN = /authorization|apiKey|certificateEnv|secret/i;
const CLAUDE_KIND_PATTERN = /"kind": "claude"/;
const PERMISSION_MODE_PATTERN = /"permissionMode": "bypassPermissions"/;
const TOOL_COUNT_PATTERN = /"toolCount": 3/;

test("buildNativeRequestCaptureMarkdown renders applied input envelope without credentials", () => {
  const markdown = buildNativeRequestCaptureMarkdown({
    appliedTurnConfig: {
      providerId: "claudeCodeCli",
      reasoningEffort: "high",
    },
    capturedRequests: [],
    generatedAt: "2026-05-02T10:00:00.000Z",
    providerId: "claude",
    records: [
      {
        captureId: "capture-test",
        envelope: {
          allowDangerouslySkipPermissions: true,
          cwd: "/workspace",
          hasSystemPrompt: true,
          kind: "claude",
          permissionMode: "bypassPermissions",
          settingSources: [],
          toolCount: 3,
        },
        providerId: "claude",
        sentUpstream: false,
        timestamp: "2026-05-02T10:00:00.000Z",
        type: "applied_input_envelope",
      },
    ],
    scenarioMetadata: { id: "description" },
    selectedModelId: "sonnet",
  });

  assert.match(markdown, APPLIED_INPUT_ENVELOPE_HEADING_PATTERN);
  assert.match(markdown, CLAUDE_KIND_PATTERN);
  assert.match(markdown, PERMISSION_MODE_PATTERN);
  assert.match(markdown, TOOL_COUNT_PATTERN);
  assert.doesNotMatch(markdown, CREDENTIAL_FIELD_PATTERN);
});

test("buildNativeRequestCaptureMarkdown renders null applied input envelope when missing", () => {
  const markdown = buildNativeRequestCaptureMarkdown({
    appliedTurnConfig: null,
    capturedRequests: [],
    generatedAt: "2026-05-02T10:00:00.000Z",
    providerId: "codex",
    records: [],
    scenarioMetadata: null,
    selectedModelId: null,
  });

  assert.match(markdown, APPLIED_INPUT_ENVELOPE_NULL_PATTERN);
});

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  REDACTED_CAPTURE_HEADER_VALUE,
  redactCaptureHeaders,
} from "./native-request-capture-redaction";
import type { NativeRequestCaptureRequest } from "./native-request-capture-types";
import { NativeRequestCaptureWriter } from "./native-request-capture-writer";

const FIXED_DATE = new Date("2026-04-24T10:00:00.000Z");
const JSONL_CAPTURE_START_PATTERN = /"type":"capture_start"/;
const JSONL_REDACTED_AUTHORIZATION_PATTERN = /"authorization":"\[REDACTED\]"/;
const JSONL_REQUEST_IGNORED_PATTERN = /"type":"request_ignored"/;
const JSONL_REQUEST_CAPTURED_PATTERN = /"type":"request_captured"/;
const MARKDOWN_IGNORED_HEADING_PATTERN = /## Ignored Requests/;
const MARKDOWN_IGNORED_REASON_PATTERN = /request_path_not_matched/;
const MARKDOWN_IGNORED_SYSTEM_PROMPT_PATTERN = /ignored system prompt/;
const MARKDOWN_SYSTEM_PROMPT_HEADING_PATTERN = /## Extracted System Prompt/;
const MARKDOWN_SYSTEM_PROMPT_PATTERN = /system prompt/;
const MARKDOWN_TITLE_PATTERN = /# Claude Native Request Capture/;
const MARKDOWN_CAPTURED_TWO_PATTERN = /Captured provider requests: 2/;
const MARKDOWN_CODEX_INSTRUCTIONS_PATTERN = /codex instructions/;
const MARKDOWN_CODEX_INPUT_PATTERN = /input text/;
const MARKDOWN_DIAGNOSTIC_CONTEXT_HEADING_PATTERN =
  /## Provider Diagnostic Context/;
const MARKDOWN_DIAGNOSTIC_CONTEXT_KIND_PATTERN =
  /codex_app_server_turn_start_request/;
const MARKDOWN_DIAGNOSTIC_CONTEXT_PROMPT_PATTERN = /workflow prompt/;
const MARKDOWN_SELECTED_MODEL_PATTERN = /gpt-5\.3-codex/;

test("redactCaptureHeaders removes credential-bearing values", () => {
  const redacted = redactCaptureHeaders({
    authorization: "Bearer secret",
    "content-type": "application/json",
    "x-api-key": "abc",
    "x-stainless-os": "darwin",
    "x-stainless-token": "token-value",
  });

  assert.equal(redacted.authorization, REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["x-api-key"], REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["x-stainless-token"], REDACTED_CAPTURE_HEADER_VALUE);
  assert.equal(redacted["x-stainless-os"], "darwin");
  assert.equal(redacted["content-type"], "application/json");
});

test("NativeRequestCaptureWriter writes JSONL and Markdown artifacts", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-writer-")
  );
  const writer = await NativeRequestCaptureWriter.create({
    captureId: "capture-writer-test",
    providerId: "claude",
    outputDir,
    clock: () => FIXED_DATE,
  });
  const request: NativeRequestCaptureRequest = {
    captureId: "capture-writer-test",
    providerId: "claude",
    target: "api.anthropic.com:443",
    method: "POST",
    path: "/v1/messages",
    timestamp: FIXED_DATE.toISOString(),
    headers: {
      authorization: "Bearer secret",
      "content-type": "application/json",
    },
    bodyText: '{"messages":[]}',
    body: {
      system: "system prompt",
      tools: [{ name: "Read" }],
      messages: [{ role: "user", content: "probe" }],
    },
  };

  await writer.writeCapturedRequest(request);
  await writer.complete("captured");

  const jsonl = await fs.readFile(writer.artifacts.jsonlPath, "utf8");
  const markdown = await fs.readFile(writer.artifacts.markdownPath, "utf8");

  assert.match(jsonl, JSONL_CAPTURE_START_PATTERN);
  assert.match(jsonl, JSONL_REQUEST_CAPTURED_PATTERN);
  assert.match(jsonl, JSONL_REDACTED_AUTHORIZATION_PATTERN);
  assert.match(markdown, MARKDOWN_TITLE_PATTERN);
  assert.match(markdown, MARKDOWN_SYSTEM_PROMPT_HEADING_PATTERN);
  assert.match(markdown, MARKDOWN_SYSTEM_PROMPT_PATTERN);
});

test("NativeRequestCaptureWriter records ignored request details", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-writer-")
  );
  const writer = await NativeRequestCaptureWriter.create({
    captureId: "capture-writer-ignored-test",
    providerId: "claude",
    outputDir,
    clock: () => FIXED_DATE,
  });

  await writer.recordProxyEvent({
    type: "request_ignored",
    body: { system: "ignored system prompt" },
    bodyText: '{"system":"ignored system prompt"}',
    captureId: "capture-writer-ignored-test",
    headers: {
      authorization: "Bearer secret",
      "content-type": "application/json",
    },
    method: "POST",
    path: "/v1/complete",
    providerId: "claude",
    reason: "request_path_not_matched",
    target: "api.anthropic.com:443",
  });
  await writer.complete("timeout", "timeout");

  const jsonl = await fs.readFile(writer.artifacts.jsonlPath, "utf8");
  const markdown = await fs.readFile(writer.artifacts.markdownPath, "utf8");

  assert.match(jsonl, JSONL_REQUEST_IGNORED_PATTERN);
  assert.match(jsonl, JSONL_REDACTED_AUTHORIZATION_PATTERN);
  assert.match(markdown, MARKDOWN_IGNORED_HEADING_PATTERN);
  assert.match(markdown, MARKDOWN_IGNORED_REASON_PATTERN);
  assert.match(markdown, MARKDOWN_IGNORED_SYSTEM_PROMPT_PATTERN);
});

test("NativeRequestCaptureWriter lists multiple captures and extracts Codex instructions", async () => {
  const outputDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "native-capture-writer-")
  );
  const writer = await NativeRequestCaptureWriter.create({
    appliedTurnConfig: {
      modelId: "gpt-5.3-codex",
      providerId: "codexCli",
      reasoningEffort: "xhigh",
      source: "switch_request",
    },
    captureId: "capture-writer-codex-test",
    providerId: "codex",
    outputDir,
    selectedModelId: "gpt-5.3-codex",
    clock: () => FIXED_DATE,
  });

  await writer.writeCapturedRequest({
    captureId: "capture-writer-codex-test",
    providerId: "codex",
    target: "chatgpt.com:443",
    method: "GET",
    path: "/backend-api/codex/responses",
    timestamp: FIXED_DATE.toISOString(),
    headers: {},
    bodyText: '{"instructions":"first instructions","input":[]}',
    body: {
      instructions: "first instructions",
      input: [],
    },
  });
  await writer.writeCapturedRequest({
    captureId: "capture-writer-codex-test",
    providerId: "codex",
    target: "chatgpt.com:443",
    method: "GET",
    path: "/backend-api/codex/responses",
    timestamp: FIXED_DATE.toISOString(),
    headers: {},
    bodyText: '{"instructions":"codex instructions","input":[]}',
    body: {
      instructions: "codex instructions",
      input: [{ type: "text", text: "input text" }],
      tools: [{ name: "shell" }],
    },
  });
  await writer.recordProviderDiagnosticContext({
    kind: "codex_app_server_turn_start_request",
    payload: {
      input: [{ type: "text", text: "workflow prompt" }],
      model: "gpt-5.3-codex",
    },
  });
  await writer.complete("captured");

  const jsonl = await fs.readFile(writer.artifacts.jsonlPath, "utf8");
  const markdown = await fs.readFile(writer.artifacts.markdownPath, "utf8");

  assert.match(jsonl, MARKDOWN_SELECTED_MODEL_PATTERN);
  assert.match(markdown, MARKDOWN_CAPTURED_TWO_PATTERN);
  assert.match(markdown, MARKDOWN_SELECTED_MODEL_PATTERN);
  assert.match(markdown, MARKDOWN_CODEX_INSTRUCTIONS_PATTERN);
  assert.match(markdown, MARKDOWN_CODEX_INPUT_PATTERN);
  assert.match(markdown, MARKDOWN_DIAGNOSTIC_CONTEXT_HEADING_PATTERN);
  assert.match(markdown, MARKDOWN_DIAGNOSTIC_CONTEXT_KIND_PATTERN);
  assert.match(markdown, MARKDOWN_DIAGNOSTIC_CONTEXT_PROMPT_PATTERN);
});

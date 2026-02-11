import assert from "node:assert/strict";
import test from "node:test";
import { formatGeminiStreamErrorMessage } from "./message-processor";

test("formatGeminiStreamErrorMessage extracts nested error message", () => {
  const message = formatGeminiStreamErrorMessage({
    error: { message: "No capacity available for model gemini-3-pro-preview" },
  });

  assert.equal(message, "No capacity available for model gemini-3-pro-preview");
});

test("formatGeminiStreamErrorMessage returns null for non-object values", () => {
  assert.equal(formatGeminiStreamErrorMessage(null), null);
  assert.equal(formatGeminiStreamErrorMessage(undefined), null);
  assert.equal(formatGeminiStreamErrorMessage(123), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { GoogleTranslateClient } from "./google-translate-client";

const GOOGLE_TRANSLATE_URL =
  "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t";
const GOOGLE_TRANSLATE_URL_PATTERN = /translate\.googleapis\.com/;
const HELLO_QUERY_PATTERN = /q=Hello/;
const QUERY_BODY_PATTERN = /q=/;
const EMPTY_BODY_PATTERN = /^$/;

const createNormalizedRequest = (text: string) => ({
  category: "localization_bundle",
  engineId: "google-gtx",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text,
  timeoutMs: 5000,
});

test("GoogleTranslateClient keeps short translations on GET transport", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = ((
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Promise.resolve({
      json: async () => [[["Привет", "Hello", null, null, 10]]],
      ok: true,
      status: 200,
    } as Response);
  }) as typeof fetch;

  try {
    const client = new GoogleTranslateClient();
    const result = await client.translate(createNormalizedRequest("Hello"));

    assert.equal(result.status, "translated");
    assert.equal(result.finalText, "Привет");
    assert.equal(capturedInit?.method, undefined);
    assert.match(capturedUrl, GOOGLE_TRANSLATE_URL_PATTERN);
    assert.match(capturedUrl, HELLO_QUERY_PATTERN);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GoogleTranslateClient switches large translations to POST transport", async () => {
  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = ((
    input: string | URL | globalThis.Request,
    init?: RequestInit
  ) => {
    capturedUrl = String(input);
    capturedInit = init;
    return Promise.resolve({
      json: async () => [[["Переведенный пакет", "bundle", null, null, 10]]],
      ok: true,
      status: 200,
    } as Response);
  }) as typeof fetch;

  try {
    const client = new GoogleTranslateClient();
    const longBatch = "__CODEAI_HUB_LOCALIZATION_ENTRY__0__START__\n".repeat(
      64
    );
    const result = await client.translate(createNormalizedRequest(longBatch));

    assert.equal(result.status, "translated");
    assert.equal(result.finalText, "Переведенный пакет");
    assert.equal(capturedUrl, GOOGLE_TRANSLATE_URL);
    assert.equal(capturedInit?.method, "POST");
    assert.equal(
      (capturedInit?.headers as Record<string, string>)?.["content-type"],
      "application/x-www-form-urlencoded;charset=UTF-8"
    );
    assert.equal(typeof capturedInit?.body, "string");
    assert.match(String(capturedInit?.body), QUERY_BODY_PATTERN);
    assert.doesNotMatch(String(capturedInit?.body), EMPTY_BODY_PATTERN);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

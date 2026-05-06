import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { AppleNativeTranslationEngine } from "./apple-native-translation-engine";

const createHelperScript = (responses: readonly unknown[]): string => {
  const directory = mkdtempSync(join(tmpdir(), "codeai-apple-native-test-"));
  const scriptPath = join(directory, "apple-translation-helper.js");
  writeFileSync(
    scriptPath,
    [
      "#!/usr/bin/env node",
      "const { existsSync, readFileSync, writeFileSync } = require('node:fs');",
      "const counterPath = __filename + '.count';",
      "const current = existsSync(counterPath) ? Number(readFileSync(counterPath, 'utf8')) : 0;",
      "writeFileSync(counterPath, String(current + 1));",
      `const responses = ${JSON.stringify(responses)};`,
      "const response = responses[Math.min(current, responses.length - 1)];",
      "process.stdout.write(JSON.stringify(response) + '\\n');",
    ].join("\n")
  );
  chmodSync(scriptPath, 0o755);
  return scriptPath;
};

const createRequest = () => ({
  category: "reasoning",
  engineId: "apple-native",
  sourceLanguage: "en",
  targetLanguage: "ru",
  text: "First reasoning block",
  timeoutMs: 3000,
});

test("AppleNativeTranslationEngine retries transient notInstalled runtime fallback", async () => {
  const helperPath = createHelperScript([
    {
      diagnostic:
        "TranslationError(cause: Translation.TranslationError.Cause.notInstalled, sourceLanguage: nil, targetLanguage: nil)",
      errorCode: "runtime_failure",
      helperStatus: "ready",
      ok: false,
      xcodeStatus: "ready",
    },
    {
      ok: true,
      translatedText: "Первый блок рассуждений",
    },
  ]);
  const infoLogs: Array<Record<string, unknown> | undefined> = [];
  const engine = new AppleNativeTranslationEngine({
    helperPathCandidates: [helperPath],
    reporter: {
      info: (_message, metadata) => infoLogs.push(metadata),
    },
    transientFallbackRetryDelayMs: 0,
  });

  const result = await engine.translate(createRequest());

  assert.equal(result.status, "translated");
  assert.equal(result.finalText, "Первый блок рассуждений");
  assert.equal(infoLogs.length, 1);
  assert.equal(infoLogs[0]?.helperErrorCode, "runtime_failure");
});

test("AppleNativeTranslationEngine does not retry missing language-pack fallback", async () => {
  const helperPath = createHelperScript([
    {
      errorCode: "supported_not_installed",
      helperStatus: "ready",
      languageStatus: "supported_not_installed",
      ok: false,
      userMessageCode: "apple_native_language_pack_missing",
      xcodeStatus: "ready",
    },
    {
      ok: true,
      translatedText: "Should not be used",
    },
  ]);
  const infoLogs: Array<Record<string, unknown> | undefined> = [];
  const engine = new AppleNativeTranslationEngine({
    helperPathCandidates: [helperPath],
    reporter: {
      info: (_message, metadata) => infoLogs.push(metadata),
    },
    transientFallbackRetryDelayMs: 0,
  });

  const result = await engine.translate(createRequest());

  assert.equal(result.status, "fallback");
  assert.equal(result.errorCode, "apple_native_language_pack_missing");
  assert.equal(result.finalText, "First reasoning block");
  assert.equal(infoLogs.length, 0);
});

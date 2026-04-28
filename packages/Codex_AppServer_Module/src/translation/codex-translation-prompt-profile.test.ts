import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCodexAppServerTranslationInstructions,
  buildCodexAppServerTranslationPrompt,
  buildCodexAppServerTranslationPromptProfile,
} from "./codex-translation-prompt-profile";

test("Codex app-server translation profile mirrors generic Codex CLI prompt rules", () => {
  const request = {
    sourceLanguage: "en",
    targetLanguage: "es",
    text: "Open Settings before retrying.",
  };

  const instructions = buildCodexAppServerTranslationInstructions(request);
  const prompt = buildCodexAppServerTranslationPrompt(request);

  assert.equal(instructions.includes("precise translation engine"), true);
  assert.equal(
    instructions.includes(
      "from en into the language identified by the code es"
    ),
    true
  );
  assert.equal(instructions.includes("Do not add commentary"), true);
  assert.equal(prompt.includes("Return only the translation."), true);
  assert.equal(prompt.endsWith(request.text), true);
});

test("Codex app-server translation profile preserves structured localization markers", () => {
  const request = {
    category: "localization_bundle",
    sourceLanguage: "en",
    targetLanguage: "uk",
    text: [
      "__CODEAI_HUB_LOCALIZATION_ENTRY__ START settings.title",
      "Open Settings",
      "__CODEAI_HUB_LOCALIZATION_ENTRY__ END settings.title",
    ].join("\n"),
  };

  const instructions = buildCodexAppServerTranslationInstructions(request);
  const prompt = buildCodexAppServerTranslationPrompt(request);

  assert.equal(instructions.includes("Preserve every marker line"), true);
  assert.equal(
    prompt.includes("Preserve all __CODEAI_HUB_LOCALIZATION_ENTRY__"),
    true
  );
  assert.equal(prompt.endsWith(request.text), true);
});

test("Codex app-server translation profile omits explicit summary for Spark only", () => {
  const request = {
    sourceLanguage: "en",
    targetLanguage: "es",
    text: "Retry",
  };

  const mini = buildCodexAppServerTranslationPromptProfile({
    modelId: "gpt-5.4-mini",
    request,
  });
  const spark = buildCodexAppServerTranslationPromptProfile({
    modelId: "gpt-5.3-codex-spark",
    request,
  });

  assert.equal(mini.effort, "low");
  assert.equal(mini.persistExtendedHistory, false);
  assert.deepEqual(mini.threadConfig, { project_doc_max_bytes: 0 });
  assert.equal(mini.summary, "none");
  assert.equal(mini.omitSummary, false);
  assert.equal(spark.summary, null);
  assert.equal(spark.omitSummary, true);
});

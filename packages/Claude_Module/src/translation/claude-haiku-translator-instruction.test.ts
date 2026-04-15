import assert from "node:assert/strict";
import test from "node:test";
import { buildClaudeHaikuTranslatorInstruction } from "./claude-haiku-translator-instruction";

test("builds base translator instruction with source and target languages", () => {
  const instruction = buildClaudeHaikuTranslatorInstruction({
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  assert.equal(
    instruction.startsWith("You are a precise translation engine."),
    true
  );
  assert.equal(
    instruction.includes(
      "Translate the source text from en into the language identified by the code ru."
    ),
    true
  );
  assert.equal(
    instruction.includes(
      "Preserve Markdown structure, file paths, filenames, code identifiers, provider names, model names, product names, URLs, placeholders, and compact canonical technical labels when they are already written exactly."
    ),
    true
  );
  assert.equal(instruction.endsWith("Return only the translation."), true);
});

test("omits marker rule for non-structured categories", () => {
  const genericInstruction = buildClaudeHaikuTranslatorInstruction({
    category: "generic",
    sourceLanguage: "en",
    targetLanguage: "de",
    text: "Hello",
  });
  const reasoningInstruction = buildClaudeHaikuTranslatorInstruction({
    category: "reasoning",
    sourceLanguage: "en",
    targetLanguage: "fr",
    text: "Hello",
  });

  assert.equal(
    genericInstruction.includes("__CODEAI_HUB_LOCALIZATION_ENTRY__"),
    false
  );
  assert.equal(
    reasoningInstruction.includes("__CODEAI_HUB_LOCALIZATION_ENTRY__"),
    false
  );
});

test("includes marker rule for structured localization_bundle category", () => {
  const instruction = buildClaudeHaikuTranslatorInstruction({
    category: "localization_bundle",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  assert.equal(
    instruction.includes(
      "Preserve every marker line that starts with __CODEAI_HUB_LOCALIZATION_ENTRY__ exactly."
    ),
    true
  );
  assert.equal(
    instruction.includes(
      "Translate only the text between each START and END marker."
    ),
    true
  );
  assert.equal(
    instruction.includes("Do not remove, rename, reorder, or merge markers."),
    true
  );
});

test("emits instruction as a single whitespace-separated line", () => {
  const instruction = buildClaudeHaikuTranslatorInstruction({
    category: "localization_bundle",
    sourceLanguage: "en",
    targetLanguage: "ru",
    text: "Hello",
  });

  assert.equal(instruction.includes("\n"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  type GlossaryBundle,
  GlossaryProtector,
} from "@codeai-hub/localization";
import { OpenRouterTranslationGlossaryProtection } from "./open-router-translation-glossary-protection";

const createBaseBundle = (): GlossaryBundle => ({
  rules: [
    { kind: "preserve", sourceTerm: "CodeAI Hub" },
    { kind: "preserve", sourceTerm: "Project Manager" },
    {
      categories: ["workflow_terms"],
      kind: "preserve",
      sourceTerm: "Description",
    },
  ],
});

test("OpenRouterTranslationGlossaryProtection protects global and user terms with markers", async () => {
  const protection = new OpenRouterTranslationGlossaryProtection({
    glossaryBundleLoader: {
      loadBaseBundle: () => Promise.resolve(createBaseBundle()),
    },
    glossaryProtector: new GlossaryProtector(),
    userGlossaryStore: {
      load: () =>
        Promise.resolve({
          preserve: ["description agent", "workflow"],
        }),
    },
  });

  const source =
    "Project Manager asks description agent to write Description workflow.";
  const protectedText = await protection.protect(source);

  assert.equal(protectedText.text.includes("Project Manager"), false);
  assert.equal(protectedText.text.includes("description agent"), false);
  assert.equal(protectedText.text.includes("workflow"), false);
  assert.equal(protectedText.text.includes("Description"), true);
  assert.equal(protectedText.protectedTerms.includes("Project Manager"), true);
  assert.equal(
    protectedText.protectedTerms.includes("description agent"),
    true
  );
  assert.equal(protectedText.restore(protectedText.text), source);
});

test("OpenRouterTranslationGlossaryProtection reloads user glossary for each request", async () => {
  let preserve: readonly string[] = [];
  const protection = new OpenRouterTranslationGlossaryProtection({
    glossaryBundleLoader: {
      loadBaseBundle: () => Promise.resolve({ rules: [] }),
    },
    userGlossaryStore: {
      load: () => Promise.resolve({ preserve }),
    },
  });

  assert.equal((await protection.protect("Use shell")).text, "Use shell");

  preserve = ["shell"];
  const protectedText = await protection.protect("Use shell");

  assert.equal(protectedText.text.includes("shell"), false);
  assert.equal(protectedText.restore(protectedText.text), "Use shell");
});

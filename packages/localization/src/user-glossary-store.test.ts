import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { UserGlossaryStore } from "./user-glossary-store";

const GLOSSARY_HEADER_PATTERN = /^# CodeAI Hub do-not-translate glossary$/mu;
const PROJECT_MANAGER_PATTERN = /^Project Manager$/mu;
const DESCRIPTION_PATTERN = /^Description$/mu;
const QUESTIONNAIRE_PATTERN = /^questionnaire\.md$/mu;
const GEMINI_PATTERN = /^Gemini$/mu;
const VS_CODE_PATTERN = /^VS Code$/mu;
const CLAUDE_PATTERN = /^Claude$/mu;

const createTempGlossaryDirectory = async (): Promise<string> =>
  mkdtemp(path.join(tmpdir(), "codeai-hub-user-glossary-"));

test("ensureEditableGlossaryFile seeds the glossary text file", async () => {
  const glossaryDirectory = await createTempGlossaryDirectory();

  try {
    const store = new UserGlossaryStore({ glossaryDirectory });
    const glossaryFilePath = await store.ensureEditableGlossaryFile();
    const raw = await readFile(glossaryFilePath, "utf8");

    assert.equal(
      glossaryFilePath,
      path.join(glossaryDirectory, "do-not-translate-terms.txt")
    );
    assert.match(raw, GLOSSARY_HEADER_PATTERN);
    assert.match(raw, PROJECT_MANAGER_PATTERN);
    assert.match(raw, DESCRIPTION_PATTERN);
    assert.match(raw, QUESTIONNAIRE_PATTERN);
  } finally {
    await rm(glossaryDirectory, { force: true, recursive: true });
  }
});

test("load ignores comments, blank lines, duplicates, and invalid entries", async () => {
  const glossaryDirectory = await createTempGlossaryDirectory();

  try {
    const glossaryFilePath = path.join(
      glossaryDirectory,
      "do-not-translate-terms.txt"
    );
    await writeFile(
      glossaryFilePath,
      [
        "# header comment",
        "",
        "Project Manager",
        "project manager",
        "Description",
        "Русский термин",
        "settings.json",
      ].join("\n"),
      "utf8"
    );

    const store = new UserGlossaryStore({ glossaryDirectory });
    const overrides = await store.load();

    assert.deepEqual(overrides.preserve, [
      "Project Manager",
      "Description",
      "settings.json",
    ]);
  } finally {
    await rm(glossaryDirectory, { force: true, recursive: true });
  }
});

test("save writes the normalized glossary text format", async () => {
  const glossaryDirectory = await createTempGlossaryDirectory();

  try {
    const store = new UserGlossaryStore({ glossaryDirectory });
    const overrides = await store.save({
      preserve: ["Gemini", "gemini", "VS Code", "  ", "Claude"],
    });
    const raw = await readFile(
      path.join(glossaryDirectory, "do-not-translate-terms.txt"),
      "utf8"
    );

    assert.deepEqual(overrides.preserve, ["Gemini", "VS Code", "Claude"]);
    assert.match(raw, GEMINI_PATTERN);
    assert.match(raw, VS_CODE_PATTERN);
    assert.match(raw, CLAUDE_PATTERN);
    assert.ok(raw.startsWith("# CodeAI Hub do-not-translate glossary\n"));
  } finally {
    await rm(glossaryDirectory, { force: true, recursive: true });
  }
});

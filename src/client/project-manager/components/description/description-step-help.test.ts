import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const HELP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/description/description-step-help.tsx"
);

test("description help is a local PM help surface and does not depend on runtime templates", async () => {
  const source = await readFile(HELP_SOURCE_PATH, "utf8");

  assert.equal(source.includes("loadDescriptionContract"), false);
  assert.equal(source.includes("MarkdownContent"), false);
  assert.equal(source.includes("template недоступен"), false);
  assert.equal(source.includes("будущий программный продукт"), true);
  assert.equal(
    source.includes("ключевые сценарии использования без жёсткого лимита"),
    true
  );
  assert.equal(
    source.includes("продолжайте диалог, пока документ вас устраивает"),
    true
  );
  assert.equal(
    source.includes("кластерно-модульной"),
    true
  );
  assert.equal(source.includes("ключевых пользовательских сценариев"), true);
  assert.equal(source.includes("Когда анкета готова, нажмите"), false);
  assert.equal(source.includes("После submit продолжайте диалог"), false);
});

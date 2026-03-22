import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const HELP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/description/description-step-help.tsx"
);
const HELP_TEMPLATE_PATH = path.resolve(
  process.cwd(),
  "packages/agents/description-agent/assets/description-template.md"
);

test("description help uses a single markdown source of truth", async () => {
  const [source, template] = await Promise.all([
    readFile(HELP_SOURCE_PATH, "utf8"),
    readFile(HELP_TEMPLATE_PATH, "utf8"),
  ]);

  assert.equal(source.includes("loadDescriptionContract"), true);
  assert.equal(source.includes("MarkdownContent"), true);
  assert.equal(source.includes("будущий программный продукт"), false);
  assert.equal(source.includes("Когда будете готовы, нажмите"), false);
  assert.equal(
    template.includes("ключевые сценарии использования без жёсткого лимита"),
    true
  );
  assert.equal(
    template.includes("После этого продолжайте диалог, пока документ вас устраивает"),
    true
  );
  assert.equal(
    template.includes("Мы рекомендуем описывать продукт в логике кластерно-модульной архитектуры"),
    true
  );
  assert.equal(
    template.includes("отдельный блок ключевых пользовательских сценариев"),
    true
  );
  assert.equal(template.includes("Когда анкета готова, нажмите"), false);
  assert.equal(template.includes("После submit продолжайте диалог"), false);
});

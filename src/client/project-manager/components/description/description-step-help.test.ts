import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const HELP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/description/description-step-help.tsx"
);

test("description help explains the universal questionnaire baseline", async () => {
  const source = await readFile(HELP_SOURCE_PATH, "utf8");

  assert.equal(source.includes("будущий программный продукт"), true);
  assert.equal(
    source.includes("Мы рекомендуем описывать продукт в логике кластерно-модульной"),
    true
  );
  assert.equal(
    source.includes("Это не значит, что пользователь обязан знать архитектурные термины"),
    true
  );
  assert.equal(source.includes("какой это тип продукта или платформы"), true);
  assert.equal(source.includes("примечания"), true);
});

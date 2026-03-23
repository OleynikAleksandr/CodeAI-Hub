import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-diagram-modules-artifact-availability.ts"
);

test("diagram modules source availability follows product-parts.index.md", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("diagram_modules/product-parts.index.md"), true);
  assert.equal(source.includes("diagram_modules/module-inventory.md"), false);
});

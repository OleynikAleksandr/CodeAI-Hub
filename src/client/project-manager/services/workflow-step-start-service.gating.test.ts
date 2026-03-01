import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SERVICE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/services/workflow-step-start-service.ts"
);

test("workflow step start checks gating.blocked before downstream starts", async () => {
  const source = await readFile(SERVICE_PATH, "utf8");

  assert.equal(
    source.includes("state?.gating?.blocked?.diagram_modules ?? true"),
    true,
    "expected diagram_modules gating guard"
  );
  assert.equal(
    source.includes("state?.gating?.blocked?.diagram_facades ?? true"),
    true,
    "expected diagram_facades gating guard"
  );
});

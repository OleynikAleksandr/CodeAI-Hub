import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/modules/drag-drop-module/message-handler.ts"
);

test("message-handler supports launcher fallback via Core file-drop HTTP API", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('const FILE_DROP_ENDPOINT = "/api/v1/file-drop";'),
    true
  );
  assert.equal(source.includes("codeaiBridgeConfig"), true);
  assert.equal(source.includes("getVsCodeApi()"), true);
  assert.equal(source.includes("hasLauncherBridgeHttpConfig"), true);
  assert.equal(source.includes("MAX_CAPTURE_ATTEMPTS"), true);
  assert.equal(source.includes("CAPTURE_RETRY_DELAY_MS"), true);
  assert.equal(source.includes('method: "POST"'), true);
  assert.equal(source.includes('method: "DELETE"'), true);
});

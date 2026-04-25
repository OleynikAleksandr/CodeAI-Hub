import assert from "node:assert/strict";
import test from "node:test";
import { CODEAI_CODEX_APP_SERVER_ARGS } from "./codex-app-server-process";

test("CodexAppServerProcess disables Codex multi-agent tools at app-server startup", () => {
  assert.deepEqual(CODEAI_CODEX_APP_SERVER_ARGS, [
    "app-server",
    "--disable",
    "multi_agent",
  ]);
});

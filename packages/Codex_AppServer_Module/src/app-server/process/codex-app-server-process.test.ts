import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEAI_CODEX_APP_SERVER_ARGS,
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
  resolveCodexAppServerProcessProfile,
} from "./codex-app-server-process";

test("CodexAppServerProcess applies the documentation workflow tool profile at app-server startup", () => {
  assert.deepEqual(CODEAI_CODEX_APP_SERVER_ARGS, [
    "app-server",
    "--disable",
    "multi_agent",
    "--disable",
    "browser_use",
    "--disable",
    "in_app_browser",
    "--disable",
    "computer_use",
    "--disable",
    "image_generation",
    "--disable",
    "plugins",
    "--disable",
    "apps",
    "--disable",
    "tool_search",
    "-c",
    "mcp_servers.codex.enabled=false",
    "-c",
    "mcp_servers.playwright.enabled=false",
  ]);
});

test("CodexAppServerProcess exposes current startup args as a named process profile", () => {
  const profile = resolveCodexAppServerProcessProfile(
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );

  assert.equal(profile.key, "codex:workflow-documentation");
  assert.deepEqual(profile.appServerArgs, CODEAI_CODEX_APP_SERVER_ARGS);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEAI_CODEX_APP_SERVER_ARGS,
  CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY,
  resolveCodexAppServerProcessProfile,
} from "./codex-app-server-process";

test("CodexAppServerProcess applies the research-enabled documentation workflow profile at app-server startup", () => {
  assert.deepEqual(CODEAI_CODEX_APP_SERVER_ARGS, [
    "app-server",
    "--disable",
    "multi_agent",
    "--disable",
    "computer_use",
    "--disable",
    "image_generation",
    "--disable",
    "plugins",
    "--disable",
    "apps",
  ]);
});

test("CodexAppServerProcess exposes current startup args as the research process profile", () => {
  const profile = resolveCodexAppServerProcessProfile(
    CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY
  );

  assert.equal(profile.key, "codex:workflow-documentation");
  assert.deepEqual(profile.appServerArgs, CODEAI_CODEX_APP_SERVER_ARGS);
});

test("CodexAppServerProcess exposes a restricted workflow process profile", () => {
  const profile = resolveCodexAppServerProcessProfile(
    CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY
  );

  assert.equal(profile.key, "codex:workflow-documentation-restricted");
  assert.deepEqual(profile.appServerArgs, [
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
  ]);
});

test("CodexAppServerProcess exposes a separate restricted translation process profile key", () => {
  const profile = resolveCodexAppServerProcessProfile(
    CODEX_TRANSLATION_PROCESS_PROFILE_KEY
  );

  assert.equal(profile.key, "codex:translation");
  assert.deepEqual(profile.appServerArgs, [
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
  ]);
});

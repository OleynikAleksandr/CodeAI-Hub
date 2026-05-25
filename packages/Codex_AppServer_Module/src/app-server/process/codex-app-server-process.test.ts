import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  CODEAI_CODEX_APP_SERVER_ARGS,
  CODEX_TRANSLATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_PROCESS_PROFILE_KEY,
  CODEX_WORKFLOW_DOCUMENTATION_RESTRICTED_PROCESS_PROFILE_KEY,
  resolveCodexAppServerProcessProfile,
  resolveProviderCodexHome,
} from "./codex-app-server-process";

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") ?? "workspace";
};

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

test("CodexAppServerProcess resolves workflow Codex home inside workspace capsule", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "Codex Home Demo "));

  try {
    assert.equal(
      resolveProviderCodexHome({
        CODEX_HOME: "/explicit/codex-home",
        CODEX_WORKSPACE_PATH: workspaceRoot,
      }),
      "/explicit/codex-home"
    );

    assert.equal(
      resolveProviderCodexHome({ CODEX_WORKSPACE_PATH: workspaceRoot }),
      path.join(
        workspaceRoot,
        ".codeai-hub",
        normalizeWorkspaceRuntimeSlug(path.basename(workspaceRoot)),
        "runtime",
        "providers",
        "codex",
        "home"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

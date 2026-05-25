import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveClaudeProviderHome } from "./claude-provider-home";

const normalizeWorkspaceRuntimeSlug = (value: string): string => {
  const normalized = value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.match(/[a-z0-9]+/gu);
  return parts?.join("-") ?? "workspace";
};

test("Claude provider home resolves inside workspace runtime capsule", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "Claude Home Demo "));

  try {
    assert.equal(
      resolveClaudeProviderHome({
        CODEAI_CLAUDE_HOME: "/explicit/claude-home",
        CLAUDE_WORKSPACE_PATH: workspaceRoot,
      }),
      "/explicit/claude-home"
    );

    assert.equal(
      resolveClaudeProviderHome({ CLAUDE_WORKSPACE_PATH: workspaceRoot }),
      path.join(
        workspaceRoot,
        ".codeai-hub",
        normalizeWorkspaceRuntimeSlug(path.basename(workspaceRoot)),
        "runtime",
        "providers",
        "claude",
        "home"
      )
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

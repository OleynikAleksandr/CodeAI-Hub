import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { sanitizeWorkspaceSlug } from "@codeai-hub/unified-session";
import {
  captureWorkflowRuntimeSlices,
  restoreWorkflowRuntimeSlices,
} from "./workflow-runtime-slice-snapshot";

const WORKSPACE_SLUG = "demo-workspace";
const WORKSPACE_SNAPSHOT_PATH_RE = /^\.codeai-hub\/demo-workspace\//u;

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

test("captures and restores scoped unified and provider session slices", async () => {
  const homeDirectory = await mkdtemp(path.join(tmpdir(), "slice-home-"));
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "slice-workspace-"));
  const workspacePathSlug = sanitizeWorkspaceSlug(workspaceRoot);
  const unifiedPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "sessions",
    workspacePathSlug,
    "codex",
    "dialog.jsonl"
  );
  const claudeProviderPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "providers",
    "claude",
    "home",
    ".claude",
    "projects",
    WORKSPACE_SLUG,
    "provider-session-1.jsonl"
  );
  const codexProviderPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "providers",
    "codex",
    "home",
    "sessions",
    "provider-session-1",
    "rollout.jsonl"
  );
  const codexAuthPath = path.join(
    homeDirectory,
    ".codeai-hub",
    "providers",
    "codex",
    "home",
    "auth.json"
  );
  await writeText(unifiedPath, "unified-before\n");
  await writeText(claudeProviderPath, "claude-before\n");
  await writeText(codexProviderPath, "codex-before\n");
  await writeText(codexAuthPath, "secret\n");

  try {
    const manifest = await captureWorkflowRuntimeSlices({
      homeDirectory,
      sessions: [
        { providerId: "codexCli", providerSessionId: "provider-session-1" },
      ],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.ok(manifest.entries.length >= 3);
    assert.equal(
      manifest.entries.some((entry) => entry.sourcePath === codexAuthPath),
      false
    );
    for (const entry of manifest.entries) {
      assert.match(entry.snapshotPath, WORKSPACE_SNAPSHOT_PATH_RE);
    }

    await writeText(unifiedPath, "unified-after\n");
    await writeText(claudeProviderPath, "claude-after\n");
    await writeText(codexProviderPath, "codex-after\n");

    const restored = await restoreWorkflowRuntimeSlices({
      homeDirectory,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.ok(restored);
    assert.equal(await readFile(unifiedPath, "utf8"), "unified-before\n");
    assert.equal(await readFile(claudeProviderPath, "utf8"), "claude-before\n");
    assert.equal(await readFile(codexProviderPath, "utf8"), "codex-before\n");
  } finally {
    await rm(homeDirectory, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

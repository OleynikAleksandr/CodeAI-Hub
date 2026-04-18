import assert from "node:assert/strict";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveClaudeRunner } from "./claude-context-usage-probe";

test("resolveClaudeRunner executes native Claude bundle directly on unix", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-context-probe-native-")
  );

  try {
    const nativeBundlePath = path.join(tempDir, "claude.exe");
    const executablePath = path.join(tempDir, "claude");
    await writeFile(nativeBundlePath, "", "utf8");
    await symlink(nativeBundlePath, executablePath);

    const resolved = resolveClaudeRunner(
      {
        executablePath,
        args: ["--version"],
      },
      "darwin"
    );

    assert.deepEqual(resolved, {
      runner: executablePath,
      args: ["--version"],
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("resolveClaudeRunner keeps node runner for javascript entrypoints on unix", async () => {
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "codeai-hub-claude-context-probe-js-")
  );

  try {
    const executablePath = path.join(tempDir, "claude.mjs");
    await writeFile(executablePath, "console.log('claude');\n", "utf8");

    const resolved = resolveClaudeRunner(
      {
        executablePath,
        args: ["--version"],
      },
      "darwin"
    );

    assert.deepEqual(resolved, {
      runner: process.execPath,
      args: [executablePath, "--version"],
    });
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("resolveClaudeRunner always executes provider binary directly on windows", () => {
  const executablePath = "C:\\Users\\me\\AppData\\Roaming\\npm\\claude.cmd";
  const resolved = resolveClaudeRunner(
    {
      executablePath,
      args: ["--version"],
    },
    "win32"
  );

  assert.deepEqual(resolved, {
    runner: executablePath,
    args: ["--version"],
  });
});

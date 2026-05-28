import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  ensureGlmClaudeCodeConfigFile,
  resolveGlmClaudeCodeApiKey,
} from "./glm-claude-code-auth-profile";

test("GLM-Claude-Code config bootstrap creates a global template when missing", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-config-bootstrap-"));
  try {
    const configPath = path.join(dir, "providers", "glm", "config.json");

    await ensureGlmClaudeCodeConfigFile({ configPath });

    const parsed = JSON.parse(await readFile(configPath, "utf8")) as Record<
      string,
      unknown
    >;
    assert.equal(parsed.apiKey, "");
    assert.deepEqual(Object.keys(parsed), ["apiKey"]);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("GLM-Claude-Code config bootstrap preserves existing user secrets", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-config-preserve-"));
  try {
    const configPath = path.join(dir, "config.json");
    await writeFile(configPath, '{"apiKey":"user-secret"}\n', "utf8");

    await ensureGlmClaudeCodeConfigFile({ configPath });

    assert.equal(
      await readFile(configPath, "utf8"),
      '{"apiKey":"user-secret"}\n'
    );
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("GLM-Claude-Code auth resolution bootstraps the config template before reading", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "glm-config-resolve-"));
  try {
    const configPath = path.join(dir, "config.json");

    const result = await resolveGlmClaudeCodeApiKey({
      configPath,
      env: {
        CODEAI_GLM_CLAUDE_CODE_API_KEY: " ",
        GLM_CLAUDE_CODE_API_KEY: " ",
        ZAI_API_KEY: " ",
      },
    });

    assert.equal(result.apiKey, null);
    assert.equal(result.source, "missing");
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as {
      readonly apiKey?: unknown;
    };
    assert.equal(parsed.apiKey, "");
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

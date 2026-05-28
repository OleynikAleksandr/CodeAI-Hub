import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
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
    const existingConfigText = [
      "{",
      '  "apiKey": "user-secret",',
      '  "baseUrl": "https://api.z.ai/api/anthropic",',
      '  "timeoutMs": 123456',
      "}",
      "",
    ].join("\n");
    await writeFile(configPath, existingConfigText, "utf8");
    const before = await stat(configPath);

    await ensureGlmClaudeCodeConfigFile({ configPath });

    const after = await stat(configPath);
    assert.equal(await readFile(configPath, "utf8"), existingConfigText);
    assert.equal(after.mtimeMs, before.mtimeMs);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
});

test("GLM-Claude-Code auth resolution preserves existing global config before reading it", async () => {
  const dir = await mkdtemp(
    path.join(tmpdir(), "glm-config-resolve-preserve-")
  );
  try {
    const configPath = path.join(dir, "config.json");
    const existingConfigText = '{"apiKey":"persisted-secret"}\n';
    await writeFile(configPath, existingConfigText, "utf8");
    const before = await stat(configPath);

    const result = await resolveGlmClaudeCodeApiKey({
      configPath,
      env: {
        CODEAI_GLM_CLAUDE_CODE_API_KEY: "",
        GLM_CLAUDE_CODE_API_KEY: "",
        ZAI_API_KEY: "",
      },
    });

    const after = await stat(configPath);
    assert.equal(result.apiKey, "persisted-secret");
    assert.equal(result.source, "glm_config");
    assert.equal(await readFile(configPath, "utf8"), existingConfigText);
    assert.equal(after.mtimeMs, before.mtimeMs);
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

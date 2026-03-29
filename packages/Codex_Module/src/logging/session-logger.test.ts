import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CodexSessionLogger } from "./session-logger";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "codex");
const FILE_PREFIX = "sdk-codex";
const PROMOTED_MODEL_PATTERN = /gpt-5\.3-codex/u;
const PROMOTED_EFFORT_PATTERN = /xhigh/u;
const SESSION_PROMOTED_PATTERN = /session_promoted/u;
const DIRECT_MODEL_PATTERN = /gpt-5\.4/u;
const DIRECT_EFFORT_PATTERN = /high/u;

const toLogFilePath = (sessionId: string): string => {
  const safeId = sessionId.replace(/[^a-zA-Z0-9]/gu, "-");
  return path.join(LOG_ROOT, `${FILE_PREFIX}-${safeId}.jsonl`);
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const waitForLogContent = async (
  filePath: string,
  token: string
): Promise<string> => {
  const maxAttempts = 120;
  const intervalMs = 25;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (!(await fileExists(filePath))) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      continue;
    }
    const content = await readFile(filePath, "utf8");
    if (content.includes(token)) {
      return content;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for log token "${token}" in ${filePath}`);
};

test("CodexSessionLogger flushes buffered provider feedback after temp session promotion", async () => {
  const tempId = `codex_${Date.now()}`;
  const realId = `thread-${Date.now()}-promoted`;
  const filePath = toLogFilePath(realId);

  await rm(filePath, { force: true });

  const logger = new CodexSessionLogger();
  logger.start(tempId);
  CodexSessionLogger.logProviderFeedback(realId, {
    provider: "codex",
    feedbackType: "turn_context",
    model: "gpt-5.3-codex",
    reasoningEffort: "xhigh",
  });
  logger.renameSession(tempId, realId);
  logger.end();

  const content = await waitForLogContent(filePath, "provider_feedback");
  assert.match(content, PROMOTED_MODEL_PATTERN);
  assert.match(content, PROMOTED_EFFORT_PATTERN);
  assert.match(content, SESSION_PROMOTED_PATTERN);

  await rm(filePath, { force: true });
});

test("CodexSessionLogger appends provider feedback for committed session ids immediately", async () => {
  const sessionId = `thread-${Date.now()}-direct`;
  const filePath = toLogFilePath(sessionId);

  await rm(filePath, { force: true });

  const logger = new CodexSessionLogger();
  logger.start(sessionId);
  CodexSessionLogger.logProviderFeedback(sessionId, {
    provider: "codex",
    feedbackType: "turn_context",
    model: "gpt-5.4",
    reasoningEffort: "high",
  });
  logger.end();

  const content = await waitForLogContent(filePath, "provider_feedback");
  assert.match(content, DIRECT_MODEL_PATTERN);
  assert.match(content, DIRECT_EFFORT_PATTERN);

  await rm(filePath, { force: true });
});

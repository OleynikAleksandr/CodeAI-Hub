import assert from "node:assert/strict";
import { access, readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SDKSessionLoggerFacade } from "./sdk-session-logger";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "claude");
const FILE_PREFIX = "sdk-claude";
const FIRST_ENTRY_PATTERN = /first-entry/;
const SECOND_ENTRY_PATTERN = /second-entry/;
const BEFORE_PROMOTION_PATTERN = /before-promotion/;
const SESSION_PROMOTED_PATTERN = /session_promoted/;

const toLogFilePath = (sessionId: string): string => {
  const safeId = sessionId.replace(/[^a-zA-Z0-9]/g, "-");
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

test("SDKSessionLoggerFacade appends entries when starting same session id twice", async () => {
  const sessionId = `resume-${Date.now()}-append`;
  const filePath = toLogFilePath(sessionId);
  await rm(filePath, { force: true });

  const logger = new SDKSessionLoggerFacade();
  logger.start(sessionId);
  logger.logUserInput("first-entry");
  logger.end();
  await waitForLogContent(filePath, "first-entry");

  logger.start(sessionId);
  logger.logUserInput("second-entry");
  logger.end();

  const content = await waitForLogContent(filePath, "second-entry");
  assert.match(content, FIRST_ENTRY_PATTERN);
  assert.match(content, SECOND_ENTRY_PATTERN);

  await rm(filePath, { force: true });
});

test("SDKSessionLoggerFacade preserves buffered entries during temp to real promotion", async () => {
  const tempId = `temp_${Date.now()}`;
  const realId = `real-${Date.now()}-promoted`;
  const realFilePath = toLogFilePath(realId);
  const tempFilePath = toLogFilePath(tempId);
  await rm(realFilePath, { force: true });
  await rm(tempFilePath, { force: true });

  const logger = new SDKSessionLoggerFacade();
  logger.start(tempId);
  logger.logUserInput("before-promotion");
  logger.renameSession(tempId, realId);
  logger.logSDKMessage("assistant", { content: "after-promotion" });
  logger.end();

  const content = await waitForLogContent(realFilePath, "after-promotion");
  assert.match(content, BEFORE_PROMOTION_PATTERN);
  assert.match(content, SESSION_PROMOTED_PATTERN);
  assert.equal(await fileExists(tempFilePath), false);

  await rm(realFilePath, { force: true });
});

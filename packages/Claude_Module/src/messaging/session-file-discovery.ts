import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import type { ModuleReporter } from "../types";

const SESSION_DISCOVERY_TIMEOUT_MS = 1000;
const SESSION_DISCOVERY_POLL_INTERVAL_MS = 50;
const SESSION_FILE_EXTENSION = ".jsonl";

const UUID_SESSION_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidSessionFile = (fileName: string): boolean => {
  const baseName = path.basename(fileName, SESSION_FILE_EXTENSION);
  return UUID_SESSION_PATTERN.test(baseName);
};

export const getSDKFilesBefore = (
  projectPath: string,
  reporter?: ModuleReporter
): string[] => {
  if (!fs.existsSync(projectPath)) {
    reporter?.warn?.(`Claude project path missing: ${projectPath}`);
    return [];
  }
  return fs
    .readdirSync(projectPath)
    .filter(
      (fileName) =>
        fileName.endsWith(SESSION_FILE_EXTENSION) &&
        isValidSessionFile(fileName)
    )
    .map((fileName) => path.join(projectPath, fileName));
};

export const getSessionIdFromSDKFiles = async (
  projectPath: string,
  previousFiles: string[],
  reporter?: ModuleReporter
): Promise<string | null> => {
  if (!fs.existsSync(projectPath)) {
    return null;
  }
  const deadline = Date.now() + SESSION_DISCOVERY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const filesAfter = fs
      .readdirSync(projectPath)
      .filter(
        (fileName) =>
          fileName.endsWith(SESSION_FILE_EXTENSION) &&
          isValidSessionFile(fileName)
      )
      .map((fileName) => path.join(projectPath, fileName));
    const newFile = filesAfter.find(
      (filePath) => !previousFiles.includes(filePath)
    );
    if (newFile) {
      const sessionId = path.basename(newFile, SESSION_FILE_EXTENSION);
      try {
        const content = fs.readFileSync(newFile, "utf8");
        const firstLine = content
          .split("\n")
          .find((line) => line.trim().length > 0);
        if (!firstLine) {
          return sessionId;
        }
        const parsed = JSON.parse(firstLine) as { readonly sessionId?: string };
        return parsed.sessionId ?? sessionId;
      } catch (error) {
        reporter?.error?.("Failed to inspect SDK session file", error);
        return sessionId;
      }
    }
    await delay(SESSION_DISCOVERY_POLL_INTERVAL_MS);
  }
  return null;
};

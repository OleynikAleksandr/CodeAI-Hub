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
  _reporter?: ModuleReporter
): Promise<string | null> => {
  // Best-effort diagnostics only. Runtime session binding must rely on SDK events.
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
      return path.basename(newFile, SESSION_FILE_EXTENSION);
    }
    await delay(SESSION_DISCOVERY_POLL_INTERVAL_MS);
  }
  return null;
};

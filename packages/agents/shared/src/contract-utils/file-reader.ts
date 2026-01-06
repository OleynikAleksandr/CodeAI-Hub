import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "../schema-utils";
import type { JsonRecord } from "../types";

/**
 * Resolve home directory from environment.
 */
export const resolveHomeDirectory = (): string | null => {
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (!home || home.length === 0) {
    return null;
  }
  return home;
};

/**
 * Resolve template path, expanding ~ to home directory.
 */
export const resolveTemplatePath = (templatePath: string): string | null => {
  if (!templatePath.startsWith("~")) {
    return templatePath;
  }
  const home = resolveHomeDirectory();
  if (!home) {
    return null;
  }
  const trimmed = templatePath.startsWith("~/")
    ? templatePath.slice(2)
    : templatePath.slice(1);
  return path.join(home, trimmed);
};

/**
 * Read text content from a template file.
 * Returns null if file doesn't exist or is empty.
 */
export const readTextFromFile = async (
  templatePath: string
): Promise<string | null> => {
  const resolvedPath = resolveTemplatePath(templatePath);
  if (!resolvedPath) {
    return null;
  }
  try {
    const text = await readFile(resolvedPath, "utf8");
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
};

/**
 * Read and parse JSON from a template file.
 * Returns null if file doesn't exist or is not valid JSON object.
 */
export const readJsonFromFile = async (
  templatePath: string
): Promise<JsonRecord | null> => {
  const raw = await readTextFromFile(templatePath);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Read file modification time in milliseconds.
 * Returns null if file doesn't exist.
 */
export const readFileMtime = async (
  templatePath: string
): Promise<number | null> => {
  const resolvedPath = resolveTemplatePath(templatePath);
  if (!resolvedPath) {
    return null;
  }
  try {
    const stats = await stat(resolvedPath);
    return stats.mtimeMs;
  } catch {
    return null;
  }
};

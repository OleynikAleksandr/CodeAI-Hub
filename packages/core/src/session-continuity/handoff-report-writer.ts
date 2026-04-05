import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeContinuityStageId } from "./continuity-types";

const CONTINUITY_ROOT = ".codeai-hub";
const CONTINUITY_DIR = "continuity";
const REPORT_FILE_NAME = "handoff-report.md";

export const buildHandoffReportPath = (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stageId: string | null | undefined;
  readonly rootSessionId: string;
  readonly timestamp: string;
}): string =>
  path.join(
    options.workspaceRoot,
    CONTINUITY_ROOT,
    options.workspaceSlug,
    CONTINUITY_DIR,
    normalizeContinuityStageId(options.stageId),
    options.rootSessionId,
    options.timestamp,
    REPORT_FILE_NAME
  );

export const writeHandoffReport = async (options: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
  readonly stageId: string | null | undefined;
  readonly rootSessionId: string;
  readonly timestamp: string;
  readonly content: string;
}): Promise<string> => {
  const trimmed = options.content.trim();
  if (trimmed.length === 0) {
    throw new Error("Handoff report content is empty.");
  }

  const filePath = buildHandoffReportPath(options);
  await mkdir(path.dirname(filePath), { recursive: true });
  const normalized = trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
  await writeFile(filePath, normalized, "utf8");
  return filePath;
};

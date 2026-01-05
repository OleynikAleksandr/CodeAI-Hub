import path from "node:path";
import { extractPreReadPathsFromQuestionnaire } from "./idea-questionnaire-pre-read-extractor";
import {
  readWorkspaceTextFilesWithBudget,
  type WorkspaceTextAttachment,
} from "./workspace-auto-attach-reader";
import { readFileHead, resolveWorkspaceFilePath } from "./workspace-file-utils";

type PreReadAttachOptions = {
  readonly maxFiles?: number;
  readonly maxBytes?: number;
  readonly totalBudgetBytes?: number;
};

export type PreReadAttachResult = {
  readonly contentPrefix: string;
  readonly attachedPaths: readonly string[];
};

const QUESTIONNAIRE_READ_MAX_BYTES = 300_000;

const DEFAULT_OPTIONS = {
  maxFiles: 6,
  maxBytes: 300_000,
  totalBudgetBytes: 1_200_000,
};

const buildPreReadPreamble = (
  attachments: readonly WorkspaceTextAttachment[]
): string => {
  const blocks = attachments.map((entry) => {
    const truncationNote = entry.truncated
      ? `\n(файл обрезан до ${entry.maxBytes} байт)`
      : "";
    return `\n[FILE: ${entry.path}]${truncationNote}\n\`\`\`\n${entry.content}\n\`\`\``;
  });
  return [
    "Документы для чтения перед анкетой (pre_read_documents). Используй это как источник истины:",
    ...blocks,
  ].join("\n");
};

export const attachPreReadDocuments = async (
  workspaceRoot: string,
  questionnairePath: string,
  options: PreReadAttachOptions = {}
): Promise<PreReadAttachResult> => {
  const normalizedRoot = path.resolve(workspaceRoot);
  const absoluteQuestionnaire = resolveWorkspaceFilePath(
    normalizedRoot,
    questionnairePath
  );
  if (!absoluteQuestionnaire) {
    return { contentPrefix: "", attachedPaths: [] };
  }

  try {
    const { buffer } = await readFileHead(
      absoluteQuestionnaire,
      QUESTIONNAIRE_READ_MAX_BYTES
    );
    const markdown = buffer.toString("utf8");
    const candidates = extractPreReadPathsFromQuestionnaire(markdown);
    if (candidates.length === 0) {
      return { contentPrefix: "", attachedPaths: [] };
    }

    const maxFiles = options.maxFiles ?? DEFAULT_OPTIONS.maxFiles;
    const maxBytes = options.maxBytes ?? DEFAULT_OPTIONS.maxBytes;
    const totalBudgetBytes =
      options.totalBudgetBytes ?? DEFAULT_OPTIONS.totalBudgetBytes;
    const limitedPaths = candidates.slice(0, Math.max(0, maxFiles));
    if (limitedPaths.length === 0) {
      return { contentPrefix: "", attachedPaths: [] };
    }

    const attachments = await readWorkspaceTextFilesWithBudget(
      normalizedRoot,
      limitedPaths,
      { maxBytes, totalBudgetBytes }
    );
    if (attachments.length === 0) {
      return { contentPrefix: "", attachedPaths: [] };
    }

    return {
      contentPrefix: buildPreReadPreamble(attachments),
      attachedPaths: attachments.map((entry) => entry.path),
    };
  } catch {
    return { contentPrefix: "", attachedPaths: [] };
  }
};

import path from "node:path";
import { extractAutoAttachPaths } from "./workspace-auto-attach-extractor";
import {
  buildWorkspaceContextPreamble,
  readWorkspaceTextFilesWithBudget,
} from "./workspace-auto-attach-reader";

type AutoAttachOptions = {
  readonly maxFiles: number;
  readonly maxBytes: number;
  readonly totalBudgetBytes: number;
};

export type AutoAttachResult = {
  readonly didAttach: boolean;
  readonly content: string;
  readonly attachedPaths: readonly string[];
};

const DEFAULT_OPTIONS: AutoAttachOptions = {
  maxFiles: 3,
  maxBytes: 300_000,
  totalBudgetBytes: 1_200_000,
};

export const autoAttachWorkspaceFiles = async (
  workspaceRoot: string,
  message: string,
  options: Partial<AutoAttachOptions> = {}
): Promise<AutoAttachResult> => {
  const effectiveOptions: AutoAttachOptions = {
    maxFiles: options.maxFiles ?? DEFAULT_OPTIONS.maxFiles,
    maxBytes: options.maxBytes ?? DEFAULT_OPTIONS.maxBytes,
    totalBudgetBytes:
      options.totalBudgetBytes ?? DEFAULT_OPTIONS.totalBudgetBytes,
  };

  const extracted = extractAutoAttachPaths(message, {
    maxFiles: effectiveOptions.maxFiles,
  });
  if (extracted.length === 0) {
    return { didAttach: false, content: message, attachedPaths: [] };
  }

  const attachments = await readWorkspaceTextFilesWithBudget(
    path.resolve(workspaceRoot),
    extracted,
    {
      maxBytes: effectiveOptions.maxBytes,
      totalBudgetBytes: effectiveOptions.totalBudgetBytes,
    }
  );
  if (attachments.length === 0) {
    return { didAttach: false, content: message, attachedPaths: [] };
  }

  const preamble = buildWorkspaceContextPreamble(attachments);
  return {
    didAttach: true,
    content: `${preamble}\n${message}`,
    attachedPaths: attachments.map((entry) => entry.path),
  };
};

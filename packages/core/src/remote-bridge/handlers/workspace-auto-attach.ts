import path from "node:path";
import { extractAutoAttachPaths } from "./workspace-auto-attach-extractor";
import {
  buildWorkspaceContextPreamble,
  readWorkspaceTextFiles,
} from "./workspace-auto-attach-reader";

type AutoAttachOptions = {
  readonly maxFiles: number;
  readonly maxBytes: number;
};

export type AutoAttachResult = {
  readonly didAttach: boolean;
  readonly content: string;
  readonly attachedPaths: readonly string[];
};

const DEFAULT_OPTIONS: AutoAttachOptions = {
  maxFiles: 3,
  maxBytes: 60_000,
};

export const autoAttachWorkspaceFiles = async (
  workspaceRoot: string,
  message: string,
  options: Partial<AutoAttachOptions> = {}
): Promise<AutoAttachResult> => {
  const effectiveOptions: AutoAttachOptions = {
    maxFiles: options.maxFiles ?? DEFAULT_OPTIONS.maxFiles,
    maxBytes: options.maxBytes ?? DEFAULT_OPTIONS.maxBytes,
  };

  const extracted = extractAutoAttachPaths(message, {
    maxFiles: effectiveOptions.maxFiles,
  });
  if (extracted.length === 0) {
    return { didAttach: false, content: message, attachedPaths: [] };
  }

  const attachments = await readWorkspaceTextFiles(
    path.resolve(workspaceRoot),
    extracted,
    effectiveOptions.maxBytes
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

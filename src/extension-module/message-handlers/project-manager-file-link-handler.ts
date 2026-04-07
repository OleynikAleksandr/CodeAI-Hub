import { Position, Range, Selection, Uri, window, workspace } from "vscode";
import type { ProjectManagerFileLinkOpenMessage } from "../home-view-message-router/message-types";

interface ProjectManagerFileLinkOpenRequest {
  readonly column: number | null;
  readonly line: number | null;
  readonly path: string;
}

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
};

const parseOpenRequest = (
  payload: unknown
): ProjectManagerFileLinkOpenRequest | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as {
    readonly column?: unknown;
    readonly line?: unknown;
    readonly path?: unknown;
  };
  if (typeof candidate.path !== "string" || !candidate.path.trim()) {
    return null;
  }

  return {
    path: candidate.path,
    line: toPositiveInteger(candidate.line),
    column: toPositiveInteger(candidate.column),
  };
};

const clampPosition = (
  request: ProjectManagerFileLinkOpenRequest,
  lineCount: number,
  lineTextLength: number
): Position => {
  const zeroBasedLine = Math.max(
    0,
    Math.min(lineCount - 1, (request.line ?? 1) - 1)
  );
  const zeroBasedColumn = Math.max(
    0,
    Math.min(lineTextLength, (request.column ?? 1) - 1)
  );
  return new Position(zeroBasedLine, zeroBasedColumn);
};

export const handleProjectManagerFileLinkOpenMessage = async (
  message: ProjectManagerFileLinkOpenMessage
): Promise<void> => {
  const request = parseOpenRequest(message.payload);
  if (!request) {
    return;
  }

  try {
    const document = await workspace.openTextDocument(Uri.file(request.path));
    const editor = await window.showTextDocument(document, {
      preview: false,
      preserveFocus: false,
    });
    if (request.line === null) {
      return;
    }

    const targetLine = Math.max(
      0,
      Math.min(document.lineCount - 1, request.line - 1)
    );
    const position = clampPosition(
      request,
      document.lineCount,
      document.lineAt(targetLine).text.length
    );
    const selection = new Selection(position, position);
    editor.selection = selection;
    editor.revealRange(new Range(position, position));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    window.showErrorMessage(`Failed to open file in VS Code: ${reason}`);
  }
};

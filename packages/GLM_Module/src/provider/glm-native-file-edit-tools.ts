import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;
const ANCHOR_SEPARATOR = "\u2502";

interface AnchorLine {
  readonly anchor: string;
  readonly content: string;
  readonly line: number;
}

interface PlannedEdit {
  readonly deleteCount: number;
  readonly insertLines: readonly string[];
  readonly start: number;
}

export const executeGlmNativeFileEditTool = (
  name: string,
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> | null => {
  switch (name) {
    case "edit_file":
      return executeEditFileTool(args, workspacePath);
    case "edit_file_by_anchor":
      return executeEditFileByAnchorTool(args, workspacePath);
    case "read_file_anchored":
      return executeReadFileAnchoredTool(args, workspacePath);
    default:
      return null;
  }
};

const executeReadFileAnchoredTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const absolutePath = resolveWorkspacePath(args.path, workspacePath);
  const text = await readFile(absolutePath, "utf8");
  const lines = splitTextLines(text).lines;
  const offset = clampNumber(args.offset, 1, Number.MAX_SAFE_INTEGER, 1);
  const limit = clampNumber(args.limit, 1, 5000, 2000);
  const anchoredLines = buildAnchorLines(lines);
  const visibleLines = anchoredLines.slice(offset - 1, offset - 1 + limit);
  return {
    anchors: visibleLines.map(({ anchor, line }) => ({ anchor, line })),
    content: visibleLines
      .map(
        ({ anchor, content, line }) =>
          `${line}:${anchor}${ANCHOR_SEPARATOR}${content}`
      )
      .join("\n"),
    ok: true,
    path: absolutePath,
    totalLines: lines.length,
  };
};

const executeEditFileTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const absolutePath = resolveWorkspacePath(args.path, workspacePath);
  const oldString = readRequiredString(args.old_string, "old_string", {
    allowEmpty: true,
  });
  const newString = readRequiredString(args.new_string, "new_string", {
    allowEmpty: true,
  });
  if (oldString.length === 0) {
    throw new Error("old_string must not be empty.");
  }
  const text = await readFile(absolutePath, "utf8");
  const firstIndex = text.indexOf(oldString);
  if (firstIndex === -1) {
    throw new Error("old_string was not found exactly once.");
  }
  if (text.indexOf(oldString, firstIndex + oldString.length) !== -1) {
    throw new Error("old_string matched more than once; use a larger context.");
  }
  const nextText = `${text.slice(0, firstIndex)}${newString}${text.slice(
    firstIndex + oldString.length
  )}`;
  await writeTextAtomic(absolutePath, nextText);
  return {
    bytes: Buffer.byteLength(nextText, "utf8"),
    ok: true,
    path: absolutePath,
  };
};

const executeEditFileByAnchorTool = async (
  args: Record<string, unknown>,
  workspacePath?: string
): Promise<Record<string, unknown>> => {
  const absolutePath = resolveWorkspacePath(args.path, workspacePath);
  const rawEdits = readEdits(args.edits);
  const text = await readFile(absolutePath, "utf8");
  const { hasTrailingNewline, lines } = splitTextLines(text);
  const anchorLines = buildAnchorLines(lines);
  const anchorIndex = new Map(
    anchorLines.map(({ anchor }, index) => [anchor, index])
  );
  const edits = rawEdits.map((edit) => planEdit(edit, anchorIndex));
  validateNoAmbiguousEdits(edits);
  const nextLines = [...lines];
  for (const edit of [...edits].sort(
    (left, right) => right.start - left.start
  )) {
    nextLines.splice(edit.start, edit.deleteCount, ...edit.insertLines);
  }
  const nextText = joinTextLines(nextLines, hasTrailingNewline);
  await writeTextAtomic(absolutePath, nextText);
  return {
    bytes: Buffer.byteLength(nextText, "utf8"),
    edits: edits.length,
    ok: true,
    path: absolutePath,
    totalLines: nextLines.length,
  };
};

const readEdits = (value: unknown): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("edits must be a non-empty array.");
  }
  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error("each edit must be an object.");
    }
    return entry as Record<string, unknown>;
  });
};

const planEdit = (
  edit: Record<string, unknown>,
  anchorIndex: ReadonlyMap<string, number>
): PlannedEdit => {
  const insertLines = readNewLines(edit.new_lines);
  if (typeof edit.insert_after === "string") {
    return {
      deleteCount: 0,
      insertLines,
      start: readAnchorIndex(edit.insert_after, anchorIndex) + 1,
    };
  }
  if (typeof edit.insert_before === "string") {
    return {
      deleteCount: 0,
      insertLines,
      start: readAnchorIndex(edit.insert_before, anchorIndex),
    };
  }
  const oldRange = edit.old_range;
  if (!Array.isArray(oldRange) || oldRange.length !== 2) {
    throw new Error(
      "edit must include old_range, insert_after, or insert_before."
    );
  }
  const start = readAnchorIndex(oldRange[0], anchorIndex);
  const end = readAnchorIndex(oldRange[1], anchorIndex);
  if (start > end) {
    throw new Error(
      "old_range start must be before or equal to old_range end."
    );
  }
  return { deleteCount: end - start + 1, insertLines, start };
};

const readNewLines = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) {
    throw new Error("new_lines must be an array of strings.");
  }
  return value.map((line) => {
    if (typeof line !== "string" || line.includes("\n")) {
      throw new Error("new_lines entries must be single-line strings.");
    }
    return line;
  });
};

const readAnchorIndex = (
  value: unknown,
  anchorIndex: ReadonlyMap<string, number>
): number => {
  if (typeof value !== "string") {
    throw new Error("anchor references must be strings.");
  }
  const index = anchorIndex.get(value);
  if (index === undefined) {
    throw new Error(
      `Anchor ${value} is stale or was not shown by read_file_anchored.`
    );
  }
  return index;
};

const validateNoAmbiguousEdits = (edits: readonly PlannedEdit[]): void => {
  const sorted = [...edits].sort((left, right) => left.start - right.start);
  let previousEnd = -1;
  for (const edit of sorted) {
    if (edit.deleteCount === 0) {
      if (edit.start === previousEnd) {
        throw new Error("Multiple inserts at the same anchor are ambiguous.");
      }
      previousEnd = edit.start;
      continue;
    }
    const end = edit.start + edit.deleteCount - 1;
    if (edit.start <= previousEnd) {
      throw new Error("Anchor edit ranges must not overlap.");
    }
    previousEnd = end;
  }
};

const buildAnchorLines = (lines: readonly string[]): readonly AnchorLine[] => {
  const used = new Set<string>();
  return lines.map((content, index) => {
    let attempt = 0;
    let anchor = "";
    do {
      anchor = hashAnchor(`${index + 1}\0${attempt}\0${content}`);
      attempt += 1;
    } while (used.has(anchor));
    used.add(anchor);
    return { anchor, content, line: index + 1 };
  });
};

const hashAnchor = (value: string): string =>
  createHash("sha1").update(value).digest("base64url").slice(0, 3);

const splitTextLines = (
  text: string
): {
  readonly hasTrailingNewline: boolean;
  readonly lines: readonly string[];
} => {
  if (text.length === 0) {
    return { hasTrailingNewline: false, lines: [] };
  }
  const hasTrailingNewline = text.endsWith("\n");
  const body = hasTrailingNewline ? text.slice(0, -1) : text;
  return {
    hasTrailingNewline,
    lines: body.length === 0 ? [] : body.split("\n"),
  };
};

const joinTextLines = (
  lines: readonly string[],
  hasTrailingNewline: boolean
): string => {
  const body = lines.join("\n");
  return hasTrailingNewline ? `${body}\n` : body;
};

const writeTextAtomic = async (
  absolutePath: string,
  content: string
): Promise<void> => {
  await mkdir(path.dirname(absolutePath), { recursive: true });
  const temporaryPath = path.join(
    path.dirname(absolutePath),
    `.${path.basename(absolutePath)}.${process.pid}.${randomUUID()}.tmp`
  );
  await writeFile(temporaryPath, content, "utf8");
  await rename(temporaryPath, absolutePath);
};

const readRequiredString = (
  value: unknown,
  name: string,
  options?: { readonly allowEmpty?: boolean }
): string => {
  if (typeof value !== "string") {
    throw new Error(`${name} must be a string.`);
  }
  const result = options?.allowEmpty ? value : value.trim();
  if (!options?.allowEmpty && result.length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
  return result;
};

const resolveWorkspacePath = (
  value: unknown,
  workspacePath?: string
): string => {
  const workspaceRoot = path.resolve(workspacePath ?? process.cwd());
  const rawPath =
    typeof value === "string" && value.trim() ? value.trim() : ".";
  const cleaned = rawPath.replace(LEADING_DOT_SLASH_PATTERN, "");
  const absolutePath = path.isAbsolute(cleaned)
    ? path.resolve(cleaned)
    : path.resolve(workspaceRoot, cleaned);
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(`${workspaceRoot}${path.sep}`)
    )
  ) {
    throw new Error("Path escaped the workspace root.");
  }
  if (cleaned.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")) {
    throw new Error("Path must not contain parent segments.");
  }
  return absolutePath;
};

const clampNumber = (
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

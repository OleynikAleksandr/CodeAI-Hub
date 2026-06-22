import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const LEADING_DOT_SLASH_PATTERN = /^\.\/+/u;
const PATH_SEGMENT_SEPARATOR_PATTERN = /[\\/]+/u;

interface PatchLine {
  readonly kind: "add" | "context" | "remove";
  text: string;
}

export const applyGlmNativePatch = async (
  patch: string,
  workspacePath?: string
): Promise<{ readonly files: readonly string[]; readonly ok: true }> => {
  const workspaceRoot = path.resolve(workspacePath ?? process.cwd());
  const lines = patch.replace(/\r\n/gu, "\n").split("\n");
  const endIndex = lines.indexOf("*** End Patch");
  if (lines[0] !== "*** Begin Patch" || endIndex < 1) {
    throw new Error(
      "Patch must start with *** Begin Patch and end with *** End Patch."
    );
  }

  const touched = new Set<string>();
  let index = 1;
  while (index < endIndex) {
    const line = lines[index] ?? "";
    if (line.startsWith("*** Add File: ")) {
      index = await applyAddFile(
        lines,
        index,
        endIndex,
        workspaceRoot,
        touched
      );
    } else if (line.startsWith("*** Delete File: ")) {
      index = await applyDeleteFile(line, index, workspaceRoot, touched);
    } else if (line.startsWith("*** Update File: ")) {
      index = await applyUpdateFile(
        lines,
        index,
        endIndex,
        workspaceRoot,
        touched
      );
    } else {
      throw new Error(`Unsupported patch hunk: ${line}`);
    }
  }

  return { files: [...touched], ok: true };
};

const applyAddFile = async (
  lines: readonly string[],
  startIndex: number,
  endIndex: number,
  workspaceRoot: string,
  touched: Set<string>
): Promise<number> => {
  const relativePath = lines[startIndex]?.slice("*** Add File: ".length) ?? "";
  const body: string[] = [];
  let index = startIndex + 1;
  while (index < endIndex && !isPatchHeader(lines[index] ?? "")) {
    const line = lines[index] ?? "";
    if (!line.startsWith("+")) {
      throw new Error("Add File lines must start with +.");
    }
    body.push(line.slice(1));
    index += 1;
  }
  const absolutePath = resolvePatchPath(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${body.join("\n")}\n`, "utf8");
  touched.add(relativePath.trim());
  return index;
};

const applyDeleteFile = async (
  line: string,
  startIndex: number,
  workspaceRoot: string,
  touched: Set<string>
): Promise<number> => {
  const relativePath = line.slice("*** Delete File: ".length);
  await rm(resolvePatchPath(workspaceRoot, relativePath), { force: false });
  touched.add(relativePath.trim());
  return startIndex + 1;
};

const applyUpdateFile = async (
  lines: readonly string[],
  startIndex: number,
  endIndex: number,
  workspaceRoot: string,
  touched: Set<string>
): Promise<number> => {
  const relativePath =
    lines[startIndex]?.slice("*** Update File: ".length) ?? "";
  let index = startIndex + 1;
  const moveTo = lines[index]?.startsWith("*** Move to: ")
    ? lines[index]?.slice("*** Move to: ".length)
    : undefined;
  if (moveTo) {
    index += 1;
  }

  const changes: string[] = [];
  while (index < endIndex && !isPatchHeader(lines[index] ?? "")) {
    changes.push(lines[index] ?? "");
    index += 1;
  }

  const absolutePath = resolvePatchPath(workspaceRoot, relativePath);
  if (changes.length > 0) {
    const original = await readFile(absolutePath, "utf8");
    await writeFile(absolutePath, applyChanges(original, changes), "utf8");
  }
  if (moveTo) {
    const targetPath = resolvePatchPath(workspaceRoot, moveTo);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await rename(absolutePath, targetPath);
    touched.add(moveTo.trim());
  } else {
    touched.add(relativePath.trim());
  }
  return index;
};

const applyChanges = (
  content: string,
  rawChanges: readonly string[]
): string => {
  const hadFinalNewline = content.endsWith("\n");
  const lines = splitFileLines(content);
  let cursor = 0;
  let block: PatchLine[] = [];

  const flush = () => {
    if (block.length === 0) {
      return;
    }
    const oldLines = block
      .filter((line) => line.kind !== "add")
      .map((line) => line.text);
    const newLines = block
      .filter((line) => line.kind !== "remove")
      .map((line) => line.text);
    const matchIndex =
      oldLines.length === 0
        ? cursor
        : findLineSequence(lines, oldLines, cursor);
    if (matchIndex < 0) {
      throw new Error("Patch context not found.");
    }
    lines.splice(matchIndex, oldLines.length, ...newLines);
    cursor = matchIndex + newLines.length;
    block = [];
  };

  for (const rawLine of rawChanges) {
    if (rawLine.startsWith("@@")) {
      flush();
    } else if (rawLine === "*** End of File") {
      flush();
    } else {
      block.push(parsePatchLine(rawLine));
    }
  }
  flush();

  return `${lines.join("\n")}${hadFinalNewline ? "\n" : ""}`;
};

const parsePatchLine = (line: string): PatchLine => {
  const kind = line[0];
  if (kind === "+") {
    return { kind: "add", text: line.slice(1) };
  }
  if (kind === "-") {
    return { kind: "remove", text: line.slice(1) };
  }
  if (kind === " ") {
    return { kind: "context", text: line.slice(1) };
  }
  throw new Error("Patch change lines must start with space, + or -.");
};

const findLineSequence = (
  lines: readonly string[],
  needle: readonly string[],
  cursor: number
): number => {
  for (let index = cursor; index <= lines.length - needle.length; index += 1) {
    if (needle.every((line, offset) => lines[index + offset] === line)) {
      return index;
    }
  }
  for (let index = 0; index < cursor; index += 1) {
    if (needle.every((line, offset) => lines[index + offset] === line)) {
      return index;
    }
  }
  return -1;
};

const splitFileLines = (content: string): string[] => {
  if (content.length === 0) {
    return [];
  }
  return content.endsWith("\n")
    ? content.slice(0, -1).split("\n")
    : content.split("\n");
};

const isPatchHeader = (line: string): boolean =>
  line.startsWith("*** Add File: ") ||
  line.startsWith("*** Delete File: ") ||
  line.startsWith("*** Update File: ");

const resolvePatchPath = (workspaceRoot: string, rawPath: string): string => {
  const relativePath = rawPath.trim().replace(LEADING_DOT_SLASH_PATTERN, "");
  if (relativePath.split(PATH_SEGMENT_SEPARATOR_PATTERN).includes("..")) {
    throw new Error("Patch path must not contain parent segments.");
  }
  const absolutePath = path.isAbsolute(relativePath)
    ? path.resolve(relativePath)
    : path.resolve(workspaceRoot, relativePath);
  const rootWithSeparator = `${workspaceRoot}${path.sep}`;
  if (
    !(
      absolutePath === workspaceRoot ||
      absolutePath.startsWith(rootWithSeparator)
    )
  ) {
    throw new Error("Patch path escaped the workspace root.");
  }
  return absolutePath;
};

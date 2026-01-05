import path from "node:path";
import { readFileHead, resolveWorkspaceFilePath } from "./workspace-file-utils";

export type WorkspaceTextAttachment = {
  readonly path: string;
  readonly content: string;
  readonly truncated: boolean;
  readonly maxBytes: number;
};

const BLOCKED_PATH_SEGMENTS = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "dist",
  "build",
  "out",
]);

const BLOCKED_BASENAMES = new Set([
  ".env",
  ".npmrc",
  ".yarnrc",
  ".pypirc",
  "id_rsa",
  "id_ed25519",
]);

const ALLOWED_DOT_BASENAMES = new Set([
  ".gitignore",
  ".gitattributes",
  ".editorconfig",
  ".prettierrc",
  ".prettierignore",
]);

const TEXT_FILE_EXTENSIONS = new Set([
  ".css",
  ".go",
  ".h",
  ".hpp",
  ".html",
  ".ini",
  ".java",
  ".js",
  ".json",
  ".jsx",
  ".kt",
  ".md",
  ".mjs",
  ".mm",
  ".py",
  ".rb",
  ".rs",
  ".scss",
  ".sh",
  ".sql",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
  ".zsh",
]);

const isAllowedTextPath = (relativePath: string): boolean => {
  const normalized = relativePath.replace(/\\/g, "/");
  if (normalized.startsWith("~")) {
    return false;
  }
  const segments = normalized.split("/").filter(Boolean);
  if (segments.length === 0) {
    return false;
  }
  if (segments.some((segment) => BLOCKED_PATH_SEGMENTS.has(segment))) {
    return false;
  }
  const base = segments.at(-1) ?? "";
  if (BLOCKED_BASENAMES.has(base)) {
    return false;
  }
  if (ALLOWED_DOT_BASENAMES.has(base)) {
    return true;
  }

  const lower = base.toLowerCase();
  if (lower.endsWith(".env.example")) {
    return true;
  }

  const ext = path.extname(lower);
  return TEXT_FILE_EXTENSIONS.has(ext);
};

const isBinaryLike = (buffer: Buffer): boolean => buffer.includes(0);

export const readWorkspaceTextFiles = async (
  workspaceRoot: string,
  relativePaths: readonly string[],
  maxBytes: number
): Promise<readonly WorkspaceTextAttachment[]> => {
  const normalizedRoot = path.resolve(workspaceRoot);
  const filteredPaths = relativePaths.filter((candidate) =>
    isAllowedTextPath(candidate)
  );
  if (filteredPaths.length === 0) {
    return [];
  }

  const attachments: WorkspaceTextAttachment[] = [];
  for (const relativePath of filteredPaths) {
    const absolutePath = resolveWorkspaceFilePath(normalizedRoot, relativePath);
    if (!absolutePath) {
      continue;
    }
    try {
      const { buffer, truncated } = await readFileHead(absolutePath, maxBytes);
      if (isBinaryLike(buffer)) {
        continue;
      }
      attachments.push({
        path: relativePath,
        content: buffer.toString("utf8"),
        truncated,
        maxBytes,
      });
    } catch {
      // ignore
    }
  }

  return attachments;
};

export const readWorkspaceTextFilesWithBudget = async (
  workspaceRoot: string,
  relativePaths: readonly string[],
  options: { readonly maxBytes: number; readonly totalBudgetBytes: number }
): Promise<readonly WorkspaceTextAttachment[]> => {
  const normalizedRoot = path.resolve(workspaceRoot);
  const filteredPaths = relativePaths.filter((candidate) =>
    isAllowedTextPath(candidate)
  );
  if (filteredPaths.length === 0) {
    return [];
  }

  let remainingBudget = options.totalBudgetBytes;
  if (!Number.isFinite(remainingBudget) || remainingBudget <= 0) {
    return [];
  }

  const attachments: WorkspaceTextAttachment[] = [];
  for (const relativePath of filteredPaths) {
    if (remainingBudget <= 0) {
      break;
    }
    const absolutePath = resolveWorkspaceFilePath(normalizedRoot, relativePath);
    if (!absolutePath) {
      continue;
    }
    const maxBytes = Math.min(options.maxBytes, remainingBudget);
    if (maxBytes <= 0) {
      break;
    }
    try {
      const { buffer, truncated } = await readFileHead(absolutePath, maxBytes);
      if (isBinaryLike(buffer)) {
        continue;
      }
      attachments.push({
        path: relativePath,
        content: buffer.toString("utf8"),
        truncated,
        maxBytes,
      });
      remainingBudget -= buffer.length;
    } catch {
      // ignore
    }
  }

  return attachments;
};

export const buildWorkspaceContextPreamble = (
  attachments: readonly WorkspaceTextAttachment[]
): string => {
  const blocks = attachments.map((entry) => {
    const truncationNote = entry.truncated
      ? `\n(файл обрезан до ${entry.maxBytes} байт)`
      : "";
    return `\n[FILE: ${entry.path}]${truncationNote}\n\`\`\`\n${entry.content}\n\`\`\``;
  });
  return [
    "Контекст из файлов (workspace). Используй это как источник истины для текущего запроса:",
    ...blocks,
    "\nСообщение пользователя:",
  ].join("\n");
};

import {
  joinUrl,
  postSystemNotice,
  resolveCoreHttpUrl,
} from "./idea-collector-support";

const WORKSPACE_FILE_ENDPOINT = "/api/v1/orchestrator/workspace-file";

const DEFAULT_MAX_BYTES = 300_000;
const MAX_FILES = 3;

interface WorkspaceReadCommand {
  readonly paths: readonly string[];
  readonly remainingMessage: string;
}

interface WorkspaceFileResponse {
  readonly content: string;
  readonly maxBytes: number;
  readonly path: string;
  readonly truncated: boolean;
}

const normalizePathToken = (token: string): string | null => {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim() || null;
  }
  return trimmed;
};

export const parseWorkspaceReadCommand = (
  content: string
): WorkspaceReadCommand | null => {
  const trimmed = content.trimStart();
  if (!(trimmed.startsWith("/read") || trimmed.startsWith("/attach"))) {
    return null;
  }

  const lines = trimmed.split("\n");
  const firstLine = lines[0]?.trim() ?? "";
  const tokens = firstLine.split(/\s+/g);
  const command = tokens[0];
  if (!(command === "/read" || command === "/attach")) {
    return null;
  }

  const paths = tokens
    .slice(1)
    .map((token) => normalizePathToken(token))
    .filter(Boolean) as string[];
  const remainingMessage = lines.slice(1).join("\n").trim();
  return { paths, remainingMessage };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isWorkspaceFileResponse = (
  value: unknown
): value is WorkspaceFileResponse => {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.path === "string" &&
    typeof value.content === "string" &&
    typeof value.truncated === "boolean" &&
    typeof value.maxBytes === "number"
  );
};

const fetchWorkspaceFile = async (
  sessionId: string,
  relativePath: string
): Promise<WorkspaceFileResponse | null> => {
  const httpUrl = resolveCoreHttpUrl();
  if (!httpUrl) {
    return null;
  }
  try {
    const response = await fetch(joinUrl(httpUrl, WORKSPACE_FILE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        path: relativePath,
        maxBytes: DEFAULT_MAX_BYTES,
      }),
    });
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as unknown;
    if (!isWorkspaceFileResponse(payload)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
};

export const buildMessageWithWorkspaceContext = async (
  sessionId: string,
  content: string
): Promise<string | null> => {
  const command = parseWorkspaceReadCommand(content);
  if (!command) {
    return null;
  }

  if (command.paths.length === 0) {
    postSystemNotice(
      sessionId,
      "Команда /read требует путь(и):\n/read doc/Architecture/Architecture.md\n(дальше на следующих строках можно написать вопрос/комментарий)"
    );
    return "";
  }

  const files = await Promise.all(
    command.paths.slice(0, MAX_FILES).map(async (relativePath) => ({
      relativePath,
      response: await fetchWorkspaceFile(sessionId, relativePath),
    }))
  );

  const resolvedFiles = files.filter((entry) => entry.response);
  if (resolvedFiles.length === 0) {
    postSystemNotice(
      sessionId,
      "Не удалось прочитать ни один файл из /read. Проверь пути и что Core запущен."
    );
    return "";
  }

  const blocks: string[] = [];
  blocks.push(
    "Контекст из файлов (workspace). Используй это как источник истины для текущего интервью:"
  );
  for (const entry of resolvedFiles) {
    const payload = entry.response as WorkspaceFileResponse;
    const truncationNote = payload.truncated
      ? `\n(файл обрезан до ${payload.maxBytes} байт)`
      : "";
    blocks.push(
      `\n[FILE: ${payload.path}]${truncationNote}\n\`\`\`\n${payload.content}\n\`\`\``
    );
  }

  if (command.paths.length > MAX_FILES) {
    postSystemNotice(
      sessionId,
      `Ограничение: прикрепляю максимум ${MAX_FILES} файлов за раз.`
    );
  }

  if (command.remainingMessage.length > 0) {
    blocks.push(`\nСообщение пользователя:\n${command.remainingMessage}`);
  } else {
    blocks.push(
      "\nДалее: учти контекст и продолжи интервью (задай следующий вопрос)."
    );
  }

  return blocks.join("\n");
};

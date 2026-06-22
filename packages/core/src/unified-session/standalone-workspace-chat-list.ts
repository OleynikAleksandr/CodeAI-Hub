import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  readSessionEvents,
  type SessionMessageRecord,
} from "@codeai-hub/unified-session";
import type { Session } from "../session-manager";

const SESSION_FILE_EXTENSION = ".jsonl";
const META_FILE_EXTENSION = ".meta.json";
const TRANSLATION_FILE_EXTENSION = ".translations.jsonl";
const WORKSPACE_LOCAL_ROOT = ".codeai-hub";
export const STANDALONE_WORKSPACE_SESSION_SLUG = "standalone";

export interface StandaloneWorkspaceChatSummary {
  readonly createdAt: string;
  readonly lastMessagePreview: string | null;
  readonly liveSessionId: string | null;
  readonly messageCount: number;
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly sessionId: string;
  readonly title: string;
  readonly updatedAt: string;
}

type PreviewMessage = Pick<SessionMessageRecord, "content" | "role">;

const isSafePathSegment = (value: string): boolean =>
  value.length > 0 &&
  value !== "." &&
  value !== ".." &&
  path.basename(value) === value &&
  !value.includes(path.sep);

export const resolveStandaloneWorkspaceSessionRoot = (
  workspacePath: string
): string => path.join(workspacePath, WORKSPACE_LOCAL_ROOT, "sessions");

const readPreview = (messages: readonly PreviewMessage[]): string | null => {
  const firstUser = messages.find((message) => message.role === "user");
  const source = firstUser ?? messages[0];
  if (!source) {
    return null;
  }
  const normalized = source.content.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const resolveChatPaths = (params: {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly workspacePath: string;
}): {
  readonly metaPath: string;
  readonly providerDirectory: string;
  readonly sessionPath: string;
  readonly translationPath: string;
} => {
  if (
    !(
      isSafePathSegment(params.providerId) &&
      isSafePathSegment(params.providerSessionId)
    )
  ) {
    throw new Error("Invalid standalone chat id");
  }
  const providerDirectory = path.join(
    resolveStandaloneWorkspaceSessionRoot(params.workspacePath),
    STANDALONE_WORKSPACE_SESSION_SLUG,
    params.providerId
  );
  return {
    providerDirectory,
    sessionPath: path.join(
      providerDirectory,
      `${params.providerSessionId}${SESSION_FILE_EXTENSION}`
    ),
    translationPath: path.join(
      providerDirectory,
      `${params.providerSessionId}${TRANSLATION_FILE_EXTENSION}`
    ),
    metaPath: path.join(
      providerDirectory,
      `${params.providerSessionId}${META_FILE_EXTENSION}`
    ),
  };
};

const readCustomTitle = async (metaPath: string): Promise<string | null> => {
  try {
    const parsed = JSON.parse(await readFile(metaPath, "utf8")) as {
      readonly title?: unknown;
    };
    return typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim()
      : null;
  } catch {
    return null;
  }
};

const findMatchingPreviewEntry = (
  byProviderSession: Map<string, StandaloneWorkspaceChatSummary>,
  providerId: string,
  preview: string | null
): [string, StandaloneWorkspaceChatSummary] | null => {
  if (!preview) {
    return null;
  }
  for (const entry of byProviderSession.entries()) {
    const [, summary] = entry;
    if (
      summary.providerId === providerId &&
      summary.lastMessagePreview === preview
    ) {
      return entry;
    }
  }
  return null;
};

const fromHistoryFile = async (params: {
  readonly fileName: string;
  readonly providerId: string;
  readonly rootDirectory: string;
}): Promise<StandaloneWorkspaceChatSummary | null> => {
  if (
    !params.fileName.endsWith(SESSION_FILE_EXTENSION) ||
    params.fileName.endsWith(TRANSLATION_FILE_EXTENSION)
  ) {
    return null;
  }
  const sessionId = params.fileName.slice(0, -SESSION_FILE_EXTENSION.length);
  const filePath = path.join(
    params.rootDirectory,
    STANDALONE_WORKSPACE_SESSION_SLUG,
    params.providerId,
    params.fileName
  );
  const records = await readSessionEvents(filePath);
  const messages = records.filter(
    (record): record is SessionMessageRecord => record.type === "message"
  );
  const createdAt = records[0]?.timestamp ?? "";
  const updatedAt = records.at(-1)?.timestamp ?? createdAt;
  const preview = readPreview(messages);
  const title = await readCustomTitle(
    filePath.slice(0, -SESSION_FILE_EXTENSION.length) + META_FILE_EXTENSION
  );
  return {
    createdAt,
    lastMessagePreview: preview,
    liveSessionId: null,
    messageCount: messages.length,
    providerId: params.providerId,
    providerSessionId: sessionId,
    sessionId,
    title: title ?? preview ?? `Chat ${sessionId.slice(0, 8)}`,
    updatedAt,
  };
};

export const renameStandaloneWorkspaceChat = async (params: {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly title: string;
  readonly workspacePath: string;
}): Promise<void> => {
  const title = params.title.replace(/\s+/g, " ").trim();
  if (!title) {
    throw new Error("title is required");
  }
  const paths = resolveChatPaths(params);
  await mkdir(paths.providerDirectory, { recursive: true });
  await writeFile(
    paths.metaPath,
    `${JSON.stringify({ title }, null, 2)}\n`,
    "utf8"
  );
};

export const deleteStandaloneWorkspaceChat = async (params: {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly workspacePath: string;
}): Promise<void> => {
  const paths = resolveChatPaths(params);
  await Promise.all([
    rm(paths.sessionPath, { force: true }),
    rm(paths.translationPath, { force: true }),
    rm(paths.metaPath, { force: true }),
  ]);
};

const mergeLiveSessions = (
  byProviderSession: Map<string, StandaloneWorkspaceChatSummary>,
  liveSessions: readonly Session[],
  workspacePath: string
): void => {
  const selectedWorkspacePath = path.resolve(workspacePath);
  for (const session of liveSessions) {
    if (
      session.stage !== null ||
      session.initiativeSlug !== null ||
      path.resolve(session.workspacePath) !== selectedWorkspacePath
    ) {
      continue;
    }
    const liveProviderSessionId = session.providerSessionId ?? session.id;
    const liveProviderSessionKey = `${session.providerId}:${liveProviderSessionId}`;
    const sessionKey = `${session.providerId}:${session.id}`;
    const livePreview = readPreview(session.messages);
    const previewEntry = findMatchingPreviewEntry(
      byProviderSession,
      session.providerId,
      livePreview
    );
    const existing =
      byProviderSession.get(liveProviderSessionKey) ??
      byProviderSession.get(sessionKey) ??
      previewEntry?.[1];
    const providerSessionId =
      existing?.providerSessionId ?? liveProviderSessionId;
    const providerSessionKey = `${session.providerId}:${providerSessionId}`;
    if (sessionKey !== providerSessionKey) {
      byProviderSession.delete(sessionKey);
    }
    if (liveProviderSessionKey !== providerSessionKey) {
      byProviderSession.delete(liveProviderSessionKey);
    }
    if (previewEntry) {
      byProviderSession.delete(previewEntry[0]);
    }
    byProviderSession.set(providerSessionKey, {
      createdAt: existing?.createdAt ?? session.createdAt,
      lastMessagePreview: existing?.lastMessagePreview ?? livePreview,
      liveSessionId: session.id,
      messageCount: existing?.messageCount ?? session.messages.length,
      providerId: session.providerId,
      providerSessionId,
      sessionId: existing?.sessionId ?? providerSessionId,
      title:
        existing?.title ??
        livePreview ??
        `Chat ${providerSessionId.slice(0, 8)}`,
      updatedAt: session.updatedAt,
    });
  }
};

export const listStandaloneWorkspaceChats = async (options: {
  readonly liveSessions: readonly Session[];
  readonly workspacePath: string;
}): Promise<StandaloneWorkspaceChatSummary[]> => {
  const rootDirectory = resolveStandaloneWorkspaceSessionRoot(
    options.workspacePath
  );
  const byProviderSession = new Map<string, StandaloneWorkspaceChatSummary>();
  const providers = await readdir(
    path.join(rootDirectory, STANDALONE_WORKSPACE_SESSION_SLUG),
    { withFileTypes: true }
  ).catch(() => []);

  for (const provider of providers) {
    if (!provider.isDirectory()) {
      continue;
    }
    const files = await readdir(
      path.join(
        rootDirectory,
        STANDALONE_WORKSPACE_SESSION_SLUG,
        provider.name
      ),
      { withFileTypes: true }
    ).catch(() => []);
    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }
      const summary = await fromHistoryFile({
        fileName: file.name,
        providerId: provider.name,
        rootDirectory,
      });
      if (summary) {
        byProviderSession.set(
          `${summary.providerId}:${summary.providerSessionId}`,
          summary
        );
      }
    }
  }

  mergeLiveSessions(
    byProviderSession,
    options.liveSessions,
    options.workspacePath
  );

  return Array.from(byProviderSession.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
};

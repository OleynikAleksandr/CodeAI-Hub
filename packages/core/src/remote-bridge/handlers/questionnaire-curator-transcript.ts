import { homedir } from "node:os";
import path from "node:path";
import {
  buildSessionFilePath,
  readSessionEvents,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";

type CuratorTranscriptContext = {
  readonly providerId: string;
  readonly providerSessionId: string;
  readonly sessionWorkspaceSlug: string;
};

type SessionMessage = {
  readonly id: string;
  readonly role: string;
  readonly content: string;
  readonly timestamp: string;
};

const SESSION_ROOT = path.join(homedir(), ".codeai-hub", "sessions");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractSessionMessage = (event: unknown): SessionMessage | null => {
  if (!isRecord(event) || event.type !== "message") {
    return null;
  }
  const id = typeof event.messageId === "string" ? event.messageId : "";
  const role = typeof event.role === "string" ? event.role : "";
  const content = typeof event.content === "string" ? event.content : "";
  const timestamp = typeof event.timestamp === "string" ? event.timestamp : "";
  if (!(id && role && content && timestamp)) {
    return null;
  }
  return { id, role, content, timestamp };
};

const dropInitialPrompt = (
  messages: readonly SessionMessage[]
): SessionMessage[] => {
  if (messages.length === 0) {
    return [];
  }
  const first = messages[0];
  if (first && first.role === "user") {
    return messages.slice(1);
  }
  return [...messages];
};

export const buildCuratorTranscript = async (
  context: CuratorTranscriptContext
): Promise<string | null> => {
  const filePath = buildSessionFilePath({
    rootDirectory: SESSION_ROOT,
    workspaceSlug: sanitizeWorkspaceSlug(context.sessionWorkspaceSlug),
    provider: context.providerId,
    sessionId: sanitizeWorkspaceSlug(context.providerSessionId),
  });

  const events = await readSessionEvents(filePath);
  const messages: SessionMessage[] = [];
  for (const event of events) {
    const message = extractSessionMessage(event);
    if (message) {
      messages.push(message);
    }
  }

  const filtered = dropInitialPrompt(messages);
  if (filtered.length === 0) {
    return null;
  }

  const lines = filtered.map((message) =>
    JSON.stringify({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    })
  );
  return `${lines.join("\n")}\n`;
};

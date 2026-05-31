import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { SessionMessage } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

const DIAGRAM_MODULES_STAGE = "diagram_modules";
const LOG_FILE_NAME = "diagram-modules-lifecycle.jsonl";
const PREVIEW_LIMIT = 320;

export interface ManagedDiagnosticSession {
  readonly continuationParentId?: string | null;
  readonly id: string;
  readonly initiativeSlug?: string | null;
  readonly providerId?: string | null;
  readonly providerSessionId?: string | null;
  readonly runSlug?: string | null;
  readonly stage?: string | null;
  readonly workspacePath?: string | null;
}

interface TraceOptions {
  readonly content?: string;
  readonly event: string;
  readonly logger?: Logger;
  readonly payload?: Record<string, unknown>;
  readonly session: ManagedDiagnosticSession | null | undefined;
}

type DiagramModulesDiagnosticSession = ManagedDiagnosticSession & {
  readonly initiativeSlug: string;
  readonly stage: typeof DIAGRAM_MODULES_STAGE;
  readonly workspacePath: string;
};

const isDiagramModulesSession = (
  session: ManagedDiagnosticSession | null | undefined
): session is DiagramModulesDiagnosticSession =>
  Boolean(
    session?.workspacePath &&
      session.initiativeSlug &&
      session.stage === DIAGRAM_MODULES_STAGE
  );

const hashContent = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex");

const previewContent = (content: string): string =>
  content.length > PREVIEW_LIMIT
    ? `${content.slice(0, PREVIEW_LIMIT)}...`
    : content;

const resolveLogPath = (session: DiagramModulesDiagnosticSession): string =>
  path.join(
    session.workspacePath,
    ".codeai-hub",
    session.initiativeSlug ?? "workspace",
    "runtime",
    "logs",
    LOG_FILE_NAME
  );

const buildBaseEntry = (
  session: DiagramModulesDiagnosticSession,
  event: string
): Record<string, unknown> => ({
  event,
  schema: "codeai-managed-workflow-diagnostic-v1",
  session: {
    continuationParentId: session.continuationParentId ?? null,
    id: session.id,
    initiativeSlug: session.initiativeSlug ?? null,
    providerId: session.providerId ?? null,
    providerSessionId: session.providerSessionId ?? null,
    runSlug: session.runSlug ?? null,
    stage: session.stage ?? null,
    workspacePath: session.workspacePath,
  },
  timestamp: new Date().toISOString(),
});

const writeWorkspaceEntry = (
  session: DiagramModulesDiagnosticSession,
  entry: Record<string, unknown>
): void => {
  const logPath = resolveLogPath(session);
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
};

export const traceManagedWorkflowDiagnostic = (options: TraceOptions): void => {
  if (!isDiagramModulesSession(options.session)) {
    return;
  }
  const contentMetadata =
    typeof options.content === "string"
      ? {
          content: options.content,
          contentHash: hashContent(options.content),
          contentLength: options.content.length,
          contentPreview: previewContent(options.content),
        }
      : {};
  const entry = {
    ...buildBaseEntry(options.session, options.event),
    ...options.payload,
    ...contentMetadata,
  };
  try {
    writeWorkspaceEntry(options.session, entry);
  } catch (error) {
    options.logger?.warn("Managed workflow diagnostic write failed", {
      error: error instanceof Error ? error.message : String(error),
      event: options.event,
      sessionId: options.session.id,
    });
    return;
  }
  const { content: _content, ...logEntry } = entry;
  options.logger?.info("Managed workflow diagnostic trace", logEntry);
};

export const traceManagedWorkflowMessage = (
  session: ManagedDiagnosticSession,
  message: SessionMessage,
  logger?: Logger
): void => {
  traceManagedWorkflowDiagnostic({
    content: message.content,
    event: "session.message.appended",
    logger,
    payload: {
      message: {
        id: message.id,
        role: message.role,
        tag: message.tag ?? null,
        timestamp: message.timestamp,
        visibilityAtEmission: message.visibilityAtEmission ?? null,
      },
    },
    session,
  });
};

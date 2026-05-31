import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { SessionMessage } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";

const PREVIEW_LIMIT = 320;
const MANAGED_STAGE_LOG_FILES = {
  application_skeleton: "application-skeleton-lifecycle.jsonl",
  diagram_modules: "diagram-modules-lifecycle.jsonl",
  quality_gates: "quality-gates-baseline-lifecycle.jsonl",
} as const;

type ManagedDiagnosticStage = keyof typeof MANAGED_STAGE_LOG_FILES;

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

type ManagedWorkflowDiagnosticSession = ManagedDiagnosticSession & {
  readonly initiativeSlug: string;
  readonly stage: ManagedDiagnosticStage;
  readonly workspacePath: string;
};

const isManagedWorkflowDiagnosticSession = (
  session: ManagedDiagnosticSession | null | undefined
): session is ManagedWorkflowDiagnosticSession =>
  Boolean(
    session?.workspacePath &&
      session.initiativeSlug &&
      typeof session.stage === "string" &&
      session.stage in MANAGED_STAGE_LOG_FILES
  );

const hashContent = (content: string): string =>
  createHash("sha256").update(content, "utf8").digest("hex");

const previewContent = (content: string): string =>
  content.length > PREVIEW_LIMIT
    ? `${content.slice(0, PREVIEW_LIMIT)}...`
    : content;

const resolveUserLogsRoot = (): string =>
  process.env.CODEAI_HUB_LOGS_DIR?.trim() ||
  path.join(homedir(), ".codeai-hub", "logs");

const resolveWorkspaceLogFolder = (
  session: ManagedWorkflowDiagnosticSession
): string => {
  const workspaceName = session.workspacePath
    .replace(/\\/gu, "/")
    .split("/")
    .filter(Boolean)
    .at(-1);
  return workspaceName?.trim() || session.initiativeSlug;
};

export const resolveManagedWorkflowDiagnosticLogPath = (
  session: ManagedWorkflowDiagnosticSession
): string =>
  path.join(
    resolveUserLogsRoot(),
    "managed-workflow",
    resolveWorkspaceLogFolder(session),
    MANAGED_STAGE_LOG_FILES[session.stage]
  );

const buildBaseEntry = (
  session: ManagedWorkflowDiagnosticSession,
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
  session: ManagedWorkflowDiagnosticSession,
  entry: Record<string, unknown>
): void => {
  const logPath = resolveManagedWorkflowDiagnosticLogPath(session);
  mkdirSync(path.dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(entry)}\n`, "utf8");
};

export const traceManagedWorkflowDiagnostic = (options: TraceOptions): void => {
  if (!isManagedWorkflowDiagnosticSession(options.session)) {
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

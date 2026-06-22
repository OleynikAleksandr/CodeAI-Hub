import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { GlmRuntimeProfile } from "./glm-native-runtime-profile";

export interface GlmNativeSessionLogger {
  readonly logPath: string;
  write: (type: string, data?: Record<string, unknown>) => void;
}

const sanitizeFileName = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/gu, "_");

const serializeError = (error: unknown): unknown => {
  if (!(error instanceof Error)) {
    return error;
  }
  return {
    cause: (error as Error & { readonly cause?: unknown }).cause,
    code: (error as Error & { readonly code?: unknown }).code,
    message: error.message,
    name: error.name,
    stack: error.stack,
    status: (error as Error & { readonly status?: unknown }).status,
  };
};

export const serializeGlmNativeLogValue = (value: unknown): unknown =>
  value instanceof Error ? serializeError(value) : value;

const buildLogPath = (
  profile: GlmRuntimeProfile,
  sessionId: string
): string => {
  const [year, month, day] = new Date().toISOString().slice(0, 10).split("-");
  return path.join(
    profile.providerHomePath,
    "sessions",
    year ?? "unknown-year",
    month ?? "unknown-month",
    day ?? "unknown-day",
    `${sanitizeFileName(sessionId)}.jsonl`
  );
};

export const createGlmNativeSessionLogger = (
  profile: GlmRuntimeProfile,
  sessionId: string
): GlmNativeSessionLogger => {
  const logPath = buildLogPath(profile, sessionId);
  mkdirSync(path.dirname(logPath), { recursive: true });
  const write = (type: string, data: Record<string, unknown> = {}): void => {
    appendFileSync(
      logPath,
      `${JSON.stringify({
        ...data,
        provider: "glmNative",
        sessionId,
        timestamp: new Date().toISOString(),
        type,
      })}\n`,
      "utf8"
    );
  };
  write("session_log_opened", { logPath, profile });
  return { logPath, write };
};

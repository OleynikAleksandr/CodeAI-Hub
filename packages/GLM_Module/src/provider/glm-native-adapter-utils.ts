export interface GlmRequestFailure extends Error {
  code?: string;
  status?: number;
}

const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504, 529]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readErrorCause = (error: Error): unknown =>
  (error as Error & { readonly cause?: unknown }).cause;

const readAppliedTurnConfig = (
  turnOptions?: Record<string, unknown>
): Record<string, unknown> | null =>
  isRecord(turnOptions?.appliedTurnConfig)
    ? turnOptions.appliedTurnConfig
    : null;

export const readAppliedTurnConfigModel = (
  turnOptions?: Record<string, unknown>
): string | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return (
    readString(applied?.baseModelId) ??
    readString(applied?.modelId) ??
    readString(applied?.effectiveModelId) ??
    readString(turnOptions?.selectedModelId)
  );
};

export const readAppliedTurnConfigReasoning = (
  turnOptions?: Record<string, unknown>
): string | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return readString(applied?.reasoningEffort);
};

export const readAppliedTurnConfigThinkingEnabled = (
  turnOptions?: Record<string, unknown>
): boolean | null => {
  const applied = readAppliedTurnConfig(turnOptions);
  return typeof applied?.thinkingEnabled === "boolean"
    ? applied.thinkingEnabled
    : null;
};

export const buildGlmFailureMessage = (error: unknown): string => {
  if (error instanceof Error && error.name === "AbortError") {
    return "GLM request was stopped.";
  }
  if (error instanceof Error) {
    const causeValue = readErrorCause(error);
    const cause = isRecord(causeValue) ? causeValue : null;
    const causeCode = readString(cause?.code);
    const causeMessage = readString(cause?.message);
    if (causeCode || causeMessage) {
      return `${error.message} (${[causeCode, causeMessage].filter(Boolean).join(": ")})`;
    }
    const status = readNumber((error as GlmRequestFailure).status);
    return status ? `${error.message} (HTTP ${status})` : error.message;
  }
  return String(error);
};

export const isRetryableGlmFailure = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const failure = error as GlmRequestFailure;
  if (
    typeof failure.status === "number" &&
    RETRYABLE_HTTP_STATUSES.has(failure.status)
  ) {
    return true;
  }
  const causeValue = readErrorCause(error);
  const cause = isRecord(causeValue) ? causeValue : null;
  const code = readString(failure.code) ?? readString(cause?.code);
  return Boolean(code && RETRYABLE_ERROR_CODES.has(code));
};

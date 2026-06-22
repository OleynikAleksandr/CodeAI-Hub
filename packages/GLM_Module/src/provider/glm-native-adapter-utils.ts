export interface GlmRequestFailure extends Error {
  code?: string;
  retryAfterMs?: number;
  status?: number;
}

export const GLM_MAX_REQUEST_ATTEMPTS = 8;

const GLM_RETRY_DELAY_MS = 500;
const GLM_RETRY_MAX_DELAY_MS = 1500;
const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "EPIPE",
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

const readNonNegativeNumber = (value: string | null): number | null => {
  if (value === null) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
};

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

export const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const buildGlmRequestHeaders = (
  apiKey: string | null,
  sessionId: string
): Record<string, string> => {
  if (!apiKey) {
    throw new Error("GLM API key is missing. Set it in Settings.");
  }
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "codeai-hub/glm-native",
    "X-Session-Id": sessionId,
    "x-session-affinity": sessionId,
  };
};

const readRetryAfterMs = (headers: Headers): number | null => {
  const retryAfterMs = readNonNegativeNumber(headers.get("retry-after-ms"));
  if (retryAfterMs !== null) {
    return retryAfterMs;
  }
  const retryAfter = headers.get("retry-after");
  const retryAfterSeconds = readNonNegativeNumber(retryAfter);
  if (retryAfterSeconds !== null) {
    return Math.round(retryAfterSeconds * 1000);
  }
  const retryAfterDate = Date.parse(retryAfter ?? "");
  return Number.isFinite(retryAfterDate)
    ? Math.max(0, retryAfterDate - Date.now())
    : null;
};

export const buildGlmHttpError = async (
  response: Response
): Promise<GlmRequestFailure> => {
  const text = await response.text().catch(() => "");
  const message =
    text.trim().length === 0
      ? `GLM request failed with HTTP ${response.status}.`
      : `GLM request failed with HTTP ${response.status}: ${text.trim()}`;
  const error = new Error(message) as GlmRequestFailure;
  error.retryAfterMs = readRetryAfterMs(response.headers) ?? undefined;
  error.status = response.status;
  return error;
};

export const readGlmRetryDelayMs = (
  error: unknown,
  _attempt: number
): number => {
  const retryAfterMs =
    error instanceof Error
      ? readNumber((error as GlmRequestFailure).retryAfterMs)
      : null;
  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, GLM_RETRY_MAX_DELAY_MS);
  }
  return GLM_RETRY_DELAY_MS;
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

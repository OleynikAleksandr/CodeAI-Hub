export const GEMINI_SESSION_STALE_BINDING_ERROR_CODE =
  "GEMINI_SESSION_STALE_BINDING" as const;

const STALE_BINDING_MESSAGE_PATTERN =
  /^Gemini session (\S+) not found\. Available:/;

export class GeminiSessionStaleBindingError extends Error {
  readonly code = GEMINI_SESSION_STALE_BINDING_ERROR_CODE;
  readonly providerSessionId: string;

  constructor(providerSessionId: string, originalMessage: string) {
    super(originalMessage);
    this.name = "GeminiSessionStaleBindingError";
    this.providerSessionId = providerSessionId;
  }
}

export const isGeminiSessionStaleBindingError = (
  error: unknown
): error is GeminiSessionStaleBindingError =>
  error instanceof Error &&
  (error as { code?: string }).code === GEMINI_SESSION_STALE_BINDING_ERROR_CODE;

export const extractStaleProviderSessionId = (
  error: unknown
): string | null => {
  if (!(error instanceof Error)) {
    return null;
  }
  const match = STALE_BINDING_MESSAGE_PATTERN.exec(error.message);
  if (!match) {
    return null;
  }
  const candidate = match[1]?.trim();
  return candidate && candidate.length > 0 ? candidate : null;
};

/**
 * Provider failure classification for recovery orchestration.
 *
 * Classifies provider errors into one of four categories to determine
 * whether Core should retry, preserve binding, or escalate to recovery.
 */

export type ProviderFailureClass =
  | "transient_turn_failure"
  | "session_binding_recoverable"
  | "provider_runtime_failure"
  | "terminal_session_failure";

export type ProviderFailureClassification = {
  readonly failureClass: ProviderFailureClass;
  readonly retryable: boolean;
  readonly shouldRemoveBinding: boolean;
  readonly shouldDegradeProvider: boolean;
  readonly reason: string;
};

type ClassifierContext = {
  readonly hasBinding: boolean;
  readonly hasProviderSessionId: boolean;
  readonly adapterAvailable: boolean;
};

// Patterns that indicate transient server-side issues
const TRANSIENT_ERROR_PATTERNS: readonly RegExp[] = [
  /capacity/i,
  /rate.?limit/i,
  /too many requests/i,
  /overloaded/i,
  /resource.?exhausted/i,
  /quota/i,
  /503/,
  /502/,
  /504/,
  /429/,
  /service.?unavailable/i,
  /upstream.?timeout/i,
  /read.?timeout/i,
  /ETIMEDOUT/,
  /ECONNRESET/,
  /ECONNREFUSED/,
  /EPIPE/,
  /socket hang up/i,
  /network.?error/i,
  /temporary/i,
  /server.?error/i,
  /internal.?server/i,
  /fetch.?failed/i,
  /aborted/i,
];

// Patterns that indicate the session itself is broken beyond repair
const TERMINAL_SESSION_PATTERNS: readonly RegExp[] = [
  /auth/i,
  /unauthorized/i,
  /forbidden/i,
  /invalid.?api.?key/i,
  /invalid.?session/i,
  /session.?not.?found/i,
  /session.?expired/i,
  /unsupported.?resume/i,
  /corrupted/i,
  /permission.?denied/i,
  /401/,
  /403/,
];

// Patterns that indicate the provider runtime itself crashed
const RUNTIME_FAILURE_PATTERNS: readonly RegExp[] = [
  /module.?init/i,
  /adapter.?crash/i,
  /cannot.?find.?module/i,
  /process.?exit/i,
  /spawn/i,
  /ENOENT/,
  /binary.?not.?found/i,
  /cli.?not.?found/i,
  /initialization.?failed/i,
];

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

function extractStatusCode(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  const candidate = error as {
    readonly status?: unknown;
    readonly statusCode?: unknown;
    readonly code?: unknown;
  };
  for (const field of [candidate.status, candidate.statusCode]) {
    if (typeof field === "number" && Number.isFinite(field)) {
      return field;
    }
  }
  return null;
}

function matchesPatterns(
  message: string,
  patterns: readonly RegExp[]
): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * Classifies a provider error into one of four failure categories.
 *
 * Classification priority:
 * 1. Terminal session patterns (auth, corrupted) → terminal_session_failure
 * 2. Runtime failure patterns (module crash, binary missing) → provider_runtime_failure
 * 3. Transient patterns (rate limit, 5xx, timeout) → transient_turn_failure
 * 4. If binding exists and providerSessionId is known → session_binding_recoverable
 * 5. Fallback → provider_runtime_failure
 */
export function classifyProviderFailure(
  error: unknown,
  context: ClassifierContext
): ProviderFailureClassification {
  const message = extractErrorMessage(error);
  const statusCode = extractStatusCode(error);

  // 1. Terminal session — auth, invalid session, permission
  if (
    matchesPatterns(message, TERMINAL_SESSION_PATTERNS) ||
    statusCode === 401 ||
    statusCode === 403
  ) {
    return {
      failureClass: "terminal_session_failure",
      retryable: false,
      shouldRemoveBinding: true,
      shouldDegradeProvider: false,
      reason: `Terminal session failure: ${message}`,
    };
  }

  // 2. Provider runtime crash — module init, binary missing
  if (matchesPatterns(message, RUNTIME_FAILURE_PATTERNS)) {
    return {
      failureClass: "provider_runtime_failure",
      retryable: false,
      shouldRemoveBinding: true,
      shouldDegradeProvider: true,
      reason: `Provider runtime failure: ${message}`,
    };
  }

  // 3. Transient server-side — rate limit, 5xx, timeout, network
  if (
    matchesPatterns(message, TRANSIENT_ERROR_PATTERNS) ||
    (statusCode !== null && statusCode >= 500 && statusCode < 600) ||
    statusCode === 429
  ) {
    return {
      failureClass: "transient_turn_failure",
      retryable: true,
      shouldRemoveBinding: false,
      shouldDegradeProvider: false,
      reason: `Transient turn failure: ${message}`,
    };
  }

  // 4. Binding exists and adapter available — recoverable binding
  if (
    context.hasBinding &&
    context.hasProviderSessionId &&
    context.adapterAvailable
  ) {
    return {
      failureClass: "session_binding_recoverable",
      retryable: true,
      shouldRemoveBinding: false,
      shouldDegradeProvider: false,
      reason: `Session binding recoverable: ${message}`,
    };
  }

  // 5. Fallback — treat as runtime failure
  return {
    failureClass: "provider_runtime_failure",
    retryable: false,
    shouldRemoveBinding: true,
    shouldDegradeProvider: true,
    reason: `Provider runtime failure (unclassified): ${message}`,
  };
}

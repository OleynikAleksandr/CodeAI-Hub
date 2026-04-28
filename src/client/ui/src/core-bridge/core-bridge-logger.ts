type DiagnosticPrimitive = boolean | number | string | null;

const MAX_DIAGNOSTIC_STRING_LENGTH = 180;

const truncateDiagnosticString = (value: string): string =>
  value.length > MAX_DIAGNOSTIC_STRING_LENGTH
    ? `${value.slice(0, MAX_DIAGNOSTIC_STRING_LENGTH)}...`
    : value;

const toDiagnosticPrimitive = (value: unknown): DiagnosticPrimitive => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return truncateDiagnosticString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Error) {
    return truncateDiagnosticString(`${value.name}: ${value.message}`);
  }
  return Object.prototype.toString.call(value);
};

export const logCoreBridgeDiagnostic = (
  eventName: string,
  details: Record<string, unknown> = {}
): void => {
  const sanitized = Object.fromEntries(
    Object.entries(details).map(([key, value]) => [
      key,
      toDiagnosticPrimitive(value),
    ])
  );
  globalThis.console?.warn?.(
    `[CodeAI Hub core bridge] ${eventName}`,
    sanitized
  );
};

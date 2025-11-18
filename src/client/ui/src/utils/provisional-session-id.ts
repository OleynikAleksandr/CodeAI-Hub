const PROVISIONAL_PREFIXES = [
  "temp_",
  "temp-",
  "session_",
  "session-",
  "codex_",
  "codex-",
  "claude_",
  "claude-",
];

export const isProvisionalProviderSessionId = (
  value: string | null | undefined
): value is string => {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return PROVISIONAL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
};

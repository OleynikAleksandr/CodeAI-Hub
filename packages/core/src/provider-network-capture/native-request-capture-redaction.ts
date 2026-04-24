const CREDENTIAL_HEADER_PATTERN =
  /(^authorization$|^cookie$|^set-cookie$|api-key|token|secret|session|credential|oauth)/i;
const STAINLESS_HEADER_PATTERN = /^x-stainless-/i;
const STAINLESS_CREDENTIAL_VALUE_PATTERN =
  /(bearer|token|secret|credential|oauth|session)/i;

export const REDACTED_CAPTURE_HEADER_VALUE = "[REDACTED]";

const shouldRedactCaptureHeader = (name: string, value: string): boolean => {
  if (CREDENTIAL_HEADER_PATTERN.test(name)) {
    return true;
  }
  return (
    STAINLESS_HEADER_PATTERN.test(name) &&
    STAINLESS_CREDENTIAL_VALUE_PATTERN.test(value)
  );
};

export const redactCaptureHeaders = (
  headers: Readonly<Record<string, string>>
): Readonly<Record<string, string>> => {
  const redacted: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    redacted[name] = shouldRedactCaptureHeader(name, value)
      ? REDACTED_CAPTURE_HEADER_VALUE
      : value;
  }
  return redacted;
};

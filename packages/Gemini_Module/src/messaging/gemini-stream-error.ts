const readNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const trySerializeValue = (value: unknown): string | null => {
  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 0 ? serialized : null;
  } catch {
    return null;
  }
};

export const formatGeminiStreamErrorMessage = (
  value: unknown
): string | null => {
  if (value instanceof Error) {
    return readNonEmptyString(value.message);
  }
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const directMessage = readNonEmptyString(record.message);
  if (directMessage) {
    return directMessage;
  }

  const errorValue = record.error;
  const errorMessage = readNonEmptyString(errorValue);
  if (errorMessage) {
    return errorMessage;
  }
  if (errorValue && typeof errorValue === "object") {
    const nestedMessage = readNonEmptyString(
      (errorValue as Record<string, unknown>).message
    );
    return nestedMessage ?? trySerializeValue(errorValue);
  }
  return null;
};

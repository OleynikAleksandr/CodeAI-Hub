export interface ProviderEventStableIdEnvelope {
  readonly type?: string;
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const readStringField = (
  record: Record<string, unknown> | null,
  key: string
): string | null => {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
};

export const readProviderEventStableId = (
  event: ProviderEventStableIdEnvelope
): string | null => {
  const record = event as unknown as Record<string, unknown>;
  for (const key of ["id", "eventId", "sequence", "sequenceNumber"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return `${key}:${value.trim()}`;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return `${key}:${value}`;
    }
  }
  const timestamp = readStringField(record, "timestamp");
  return timestamp && timestamp.trim().length > 0
    ? `timestamp:${timestamp.trim()}`
    : null;
};

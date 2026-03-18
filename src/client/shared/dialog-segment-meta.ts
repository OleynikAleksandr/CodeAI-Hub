import type { SessionMessage } from "../../types/session";

const SEGMENT_BOUNDARY_MARKER = "__CODEAIHUB_SEGMENT_BOUNDARY__";
const SEGMENT_META_MARKER = "__CODEAIHUB_SEGMENT_META__:";

type SegmentSummaryPayload = {
  readonly kind: "segment_summary";
  readonly segments: readonly {
    readonly index: number;
    readonly remainingPercent?: number;
  }[];
};

const clampPercent = (value: number): number =>
  Math.max(0, Math.min(100, Math.round(value)));

const isSegmentSummaryPayload = (
  value: unknown
): value is SegmentSummaryPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const record = value as {
    readonly kind?: unknown;
    readonly segments?: unknown;
  };
  if (record.kind !== "segment_summary" || !Array.isArray(record.segments)) {
    return false;
  }
  for (const segment of record.segments) {
    if (!segment || typeof segment !== "object") {
      return false;
    }
    const candidate = segment as {
      readonly index?: unknown;
      readonly remainingPercent?: unknown;
    };
    if (
      typeof candidate.index !== "number" ||
      !Number.isFinite(candidate.index)
    ) {
      return false;
    }
    if (
      candidate.remainingPercent !== undefined &&
      (typeof candidate.remainingPercent !== "number" ||
        !Number.isFinite(candidate.remainingPercent))
    ) {
      return false;
    }
  }
  return true;
};

const tryParseSegmentSummaryPayloadFromContent = (
  content: string
): SegmentSummaryPayload | null => {
  const lines = content.split("\n").map((line) => line.trim());
  if (lines[0] !== SEGMENT_BOUNDARY_MARKER) {
    return null;
  }
  const metaLine = lines.find((line) => line.startsWith(SEGMENT_META_MARKER));
  if (!metaLine) {
    return null;
  }
  const json = metaLine.slice(SEGMENT_META_MARKER.length).trim();
  if (!json) {
    return null;
  }
  try {
    const parsed = JSON.parse(json) as unknown;
    return isSegmentSummaryPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const buildTokenDebugSummaryFromMessages = (
  messages: readonly SessionMessage[]
): string | null => {
  let latestPayload: SegmentSummaryPayload | null = null;
  for (const message of messages) {
    if (message.role !== "system") {
      continue;
    }
    const payload = tryParseSegmentSummaryPayloadFromContent(message.content);
    if (payload) {
      latestPayload = payload;
    }
  }
  if (!latestPayload) {
    return null;
  }

  const parts: string[] = [];
  for (const segment of latestPayload.segments) {
    const index = Number.isFinite(segment.index) ? segment.index : null;
    if (index === null) {
      continue;
    }
    const remaining =
      typeof segment.remainingPercent === "number" &&
      Number.isFinite(segment.remainingPercent)
        ? `${clampPercent(segment.remainingPercent)}%`
        : "—";
    parts.push(`#${index} (${remaining})`);
  }

  return parts.length > 0 ? parts.join(" | ") : null;
};

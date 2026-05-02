import {
  findCaptureWorkbenchDiffSectionDefinition,
  type CaptureWorkbenchDiffSection,
  type CaptureWorkbenchDiffSectionId,
  type CaptureWorkbenchDiffSide,
  type CaptureWorkbenchDiffStatus,
} from "./diff-section-model";

export interface CaptureWorkbenchDiffSectionInput {
  readonly id: CaptureWorkbenchDiffSectionId;
  readonly left: unknown;
  readonly right: unknown;
}

export const buildCaptureWorkbenchDiffSection = (
  input: CaptureWorkbenchDiffSectionInput
): CaptureWorkbenchDiffSection | null => {
  const left = normalizeDiffSide(input.left);
  const right = normalizeDiffSide(input.right);
  if (left.content === null && right.content === null) {
    return null;
  }
  const status = resolveDiffStatus(left.content, right.content);
  return {
    collapsedByDefault: status === "equal",
    definition: findCaptureWorkbenchDiffSectionDefinition(input.id),
    left,
    right,
    status,
    statusText: buildStatusText(status),
  };
};

export const normalizeDiffContent = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return normalizeText(value);
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(normalizeStructuredValue(value), null, 2);
};

export const resolveDiffStatus = (
  left: string | null,
  right: string | null
): CaptureWorkbenchDiffStatus => {
  if (left === null && right === null) {
    return "equal";
  }
  if (left === null) {
    return "added";
  }
  if (right === null) {
    return "removed";
  }
  return left === right ? "equal" : "changed";
};

const normalizeDiffSide = (value: unknown): CaptureWorkbenchDiffSide => {
  const content = normalizeDiffContent(value);
  return {
    content,
    lines: content === null ? [] : content.split("\n"),
  };
};

const normalizeText = (value: string): string | null => {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeStructuredValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeStructuredValue(entry));
  }
  if (!isPlainRecord(value)) {
    return value;
  }
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, normalizeStructuredValue(value[key])])
  );
};

const buildStatusText = (status: CaptureWorkbenchDiffStatus): string => {
  switch (status) {
    case "added":
      return "added";
    case "changed":
      return "changed";
    case "removed":
      return "removed";
    case "equal":
      return "equal";
  }
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

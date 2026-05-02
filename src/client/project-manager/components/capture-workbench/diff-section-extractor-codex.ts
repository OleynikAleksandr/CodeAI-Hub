import type { CaptureWorkbenchDiffSectionId } from "./diff-section-model";

export type CodexDiffSectionContentMap = Partial<
  Record<CaptureWorkbenchDiffSectionId, unknown>
>;

export const extractCodexDiffSections = (
  records: readonly unknown[]
): CodexDiffSectionContentMap => {
  const request = findCapturedRequest(records, "codex");
  const body = asRecord(request?.body);
  const captureStart = findCaptureStart(records, "codex");
  const envelope = findAppliedEnvelope(records, "codex");
  const sections: CodexDiffSectionContentMap = {};

  addSection(
    sections,
    "system_prompt",
    body?.instructions ?? findSection(records, "system")
  );
  addSection(sections, "tools", body?.tools ?? findSection(records, "tools"));
  addSection(
    sections,
    "user_prompt",
    body?.input ?? findSection(records, "messages")
  );
  addSection(
    sections,
    "model_reasoning",
    compactRecord({
      model: body?.model ?? readString(captureStart?.selectedModelId),
      reasoning: body?.reasoning ?? null,
    })
  );
  addSection(
    sections,
    "output_schema",
    body?.output_schema ?? body?.response_format
  );
  addSection(sections, "endpoint", endpointSummary(request));
  addSection(sections, "process_profile_codex", envelope);
  addSection(sections, "workflow_context", captureStart?.scenarioMetadata);

  return sections;
};

const addSection = (
  sections: CodexDiffSectionContentMap,
  id: CaptureWorkbenchDiffSectionId,
  value: unknown
): void => {
  if (hasSectionContent(value)) {
    sections[id] = value;
  }
};

const findCapturedRequest = (
  records: readonly unknown[],
  providerId: string
): Record<string, unknown> | null =>
  records.find(
    (record): record is Record<string, unknown> =>
      isRecord(record) &&
      record.type === "request_captured" &&
      record.providerId === providerId
  ) ?? null;

const findCaptureStart = (
  records: readonly unknown[],
  providerId: string
): Record<string, unknown> | null =>
  records.find(
    (record): record is Record<string, unknown> =>
      isRecord(record) &&
      record.type === "capture_start" &&
      record.providerId === providerId
  ) ?? null;

const findAppliedEnvelope = (
  records: readonly unknown[],
  providerId: string
): unknown => {
  const record = records.find(
    (record): record is Record<string, unknown> =>
      isRecord(record) &&
      record.type === "applied_input_envelope" &&
      record.providerId === providerId &&
      isRecord(record.envelope) &&
      record.envelope.kind === providerId
  );
  return record?.envelope ?? null;
};

const findSection = (
  records: readonly unknown[],
  section: "messages" | "system" | "tools"
): unknown => {
  const payloadRecord = records.find(
    (record): record is Record<string, unknown> =>
      isRecord(record) &&
      record.type === "section_extract" &&
      record.section === section
  );
  if (payloadRecord && "payload" in payloadRecord) {
    return payloadRecord.payload;
  }
  const contentRecord = records.find(
    (record): record is Record<string, unknown> =>
      isRecord(record) &&
      record.type === "section_extract" &&
      record.section === section
  );
  return contentRecord?.content;
};

const endpointSummary = (
  request: Record<string, unknown> | null
): Record<string, unknown> | null =>
  request
    ? compactRecord({
        method: readString(request.method),
        path: readString(request.path),
        target: readString(request.target),
      })
    : null;

const compactRecord = (
  record: Record<string, unknown>
): Record<string, unknown> | null => {
  const entries = Object.entries(record).filter(([, value]) =>
    hasSectionContent(value)
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
};

const hasSectionContent = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }
  return typeof value !== "string" || value.trim().length > 0;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

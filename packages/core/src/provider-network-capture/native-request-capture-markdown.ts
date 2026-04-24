import { redactCaptureHeaders } from "./native-request-capture-redaction";
import type {
  NativeRequestCaptureProviderId,
  NativeRequestCaptureProxyEvent,
  NativeRequestCaptureRequest,
} from "./native-request-capture-types";

type SectionName = "messages" | "system" | "tools";
export type NativeRequestCaptureIgnoredRecord = Extract<
  NativeRequestCaptureProxyEvent,
  { readonly type: "request_ignored" }
>;

export interface CaptureSectionRecord {
  readonly content?: unknown;
  readonly payload?: unknown;
  readonly section: SectionName;
  readonly type: "section_extract";
}

export interface ProviderRuntimeErrorRecord {
  readonly captureId: string;
  readonly message: string;
  readonly name: string | null;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly sentUpstream: false;
  readonly stack: string | null;
  readonly timestamp: string;
  readonly type: "provider_runtime_error";
}

interface ProviderDiagnosticContextRecord {
  readonly captureId: string;
  readonly kind: string;
  readonly payload: unknown;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly sentUpstream: false;
  readonly timestamp: string;
  readonly type: "provider_diagnostic_context";
}

export interface NativeRequestCaptureMarkdownOptions {
  readonly appliedTurnConfig: unknown;
  readonly capturedRequests: readonly NativeRequestCaptureRequest[];
  readonly generatedAt: string;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly records: readonly unknown[];
  readonly scenarioMetadata: unknown;
  readonly selectedModelId: string | null;
}

export const buildNativeRequestCaptureMarkdown = (
  options: NativeRequestCaptureMarkdownOptions
): string => {
  const request = selectPrimaryRequest(
    options.providerId,
    options.capturedRequests
  );
  const title = `${capitalizeProvider(options.providerId)} Native Request Capture`;
  const bodySections = request ? extractSections(request.body) : [];
  const ignoredRequests = findIgnoredRequestRecords(options.records);
  const diagnosticContext = findProviderDiagnosticContextRecords(
    options.records
  );
  const providerRuntimeError = findProviderRuntimeError(options.records);
  return [
    `# ${title}`,
    "",
    `Provider: ${options.providerId}`,
    "Sent upstream: false",
    "Capture mode: MITM capture-and-abort",
    `Generated at: ${options.generatedAt}`,
    "",
    "## Summary",
    "",
    buildSummary(request, options.records, options.capturedRequests.length),
    "",
    "## Capture Configuration",
    "",
    fencedJson({
      selectedModelId: options.selectedModelId,
      appliedTurnConfig: options.appliedTurnConfig,
      scenarioMetadata: options.scenarioMetadata,
    }),
    "",
    "## Provider Diagnostic Context",
    "",
    fencedJson(diagnosticContext),
    "",
    "## Captured Requests",
    "",
    formatCapturedRequests(options.capturedRequests),
    "",
    "## Ignored Requests",
    "",
    formatIgnoredRequests(ignoredRequests),
    "",
    "### Ignored Request Details",
    "",
    fencedJson(ignoredRequests),
    "",
    "## Request Headers",
    "",
    fencedJson(request?.headers ?? {}),
    "",
    "## Request Body",
    "",
    fencedJson(request?.body ?? null),
    "",
    "## Extracted System Prompt",
    "",
    fencedJson(findSection(bodySections, "system")?.content ?? null),
    "",
    "## Extracted Tool Declarations",
    "",
    fencedJson(findSection(bodySections, "tools")?.payload ?? null),
    "",
    "## Extracted Messages",
    "",
    fencedJson(findSection(bodySections, "messages")?.payload ?? null),
    "",
    "## Provider Runtime Error",
    "",
    fencedJson(providerRuntimeError),
    "",
    "## Notes",
    "",
    "- Sensitive local diagnostic artifact. Do not upload or share.",
    "- Credential-bearing headers are redacted by default.",
    "- Request body is intentionally preserved for instruction debugging.",
    "",
  ].join("\n");
};

export const extractSections = (
  body: unknown
): readonly CaptureSectionRecord[] => {
  if (!isRecord(body)) {
    return [];
  }
  const sections: CaptureSectionRecord[] = [];
  if ("system" in body) {
    sections.push({
      type: "section_extract",
      section: "system",
      content: body.system,
    });
  } else if ("instructions" in body) {
    sections.push({
      type: "section_extract",
      section: "system",
      content: body.instructions,
    });
  }
  if ("tools" in body) {
    sections.push({
      type: "section_extract",
      section: "tools",
      payload: body.tools,
    });
  }
  if ("messages" in body) {
    sections.push({
      type: "section_extract",
      section: "messages",
      payload: body.messages,
    });
  } else if ("input" in body) {
    sections.push({
      type: "section_extract",
      section: "messages",
      payload: body.input,
    });
  }
  return sections;
};

const selectPrimaryRequest = (
  providerId: NativeRequestCaptureProviderId,
  requests: readonly NativeRequestCaptureRequest[]
): NativeRequestCaptureRequest | null => {
  if (requests.length === 0) {
    return null;
  }
  if (providerId !== "codex") {
    return requests.at(-1) ?? null;
  }
  for (let index = requests.length - 1; index >= 0; index -= 1) {
    const request = requests[index];
    if (request && isCodexFullTurnRequest(request)) {
      return request;
    }
  }
  return requests.at(-1) ?? null;
};

const findProviderRuntimeError = (
  records: readonly unknown[]
): ProviderRuntimeErrorRecord | null =>
  records.find(isProviderRuntimeErrorRecord) ?? null;

export const sanitizeIgnoredRequest = (
  event: NativeRequestCaptureIgnoredRecord
): NativeRequestCaptureIgnoredRecord => ({
  ...event,
  headers: event.headers ? redactCaptureHeaders(event.headers) : undefined,
});

export const normalizeProviderRuntimeError = (
  error: unknown,
  metadata: {
    readonly captureId: string;
    readonly providerId: NativeRequestCaptureProviderId;
    readonly timestamp: string;
  }
): ProviderRuntimeErrorRecord => {
  if (error instanceof Error) {
    return {
      ...metadata,
      message: error.message || "Provider runtime failed",
      name: error.name || null,
      sentUpstream: false,
      stack: error.stack ?? null,
      type: "provider_runtime_error",
    };
  }
  if (isRecord(error)) {
    return {
      ...metadata,
      message: readString(error.message) ?? stringifyErrorRecord(error),
      name: readString(error.name),
      sentUpstream: false,
      stack: readString(error.stack),
      type: "provider_runtime_error",
    };
  }
  return {
    ...metadata,
    message: String(error),
    name: null,
    sentUpstream: false,
    stack: null,
    type: "provider_runtime_error",
  };
};

const findSection = (
  sections: readonly CaptureSectionRecord[],
  section: SectionName
): CaptureSectionRecord | null =>
  sections.find((record) => record.section === section) ?? null;

const buildSummary = (
  request: NativeRequestCaptureRequest | null,
  records: readonly unknown[],
  capturedRequestCount: number
): string => {
  const recordCount = records.length;
  const ignoredCount = findIgnoredRequestRecords(records).length;
  const diagnosticContextCount =
    findProviderDiagnosticContextRecords(records).length;
  const providerRuntimeError = findProviderRuntimeError(records);
  if (!request) {
    if (providerRuntimeError) {
      const errorName = providerRuntimeError.name ?? "Error";
      return [
        "No matching provider model request captured yet.",
        `Provider runtime error: ${errorName}: ${providerRuntimeError.message}.`,
        `Provider diagnostic context records: ${diagnosticContextCount}.`,
        `Ignored requests: ${ignoredCount}.`,
        `JSONL records: ${recordCount}.`,
      ].join("\n");
    }
    return [
      "No matching provider model request captured yet.",
      `Provider diagnostic context records: ${diagnosticContextCount}.`,
      `Ignored requests: ${ignoredCount}.`,
      `JSONL records: ${recordCount}.`,
    ].join("\n");
  }
  return [
    `Captured provider requests: ${capturedRequestCount}.`,
    `Primary request: ${request.target}.`,
    `Method/path: ${request.method} ${request.path}.`,
    `Provider diagnostic context records: ${diagnosticContextCount}.`,
    `Ignored requests before capture: ${ignoredCount}.`,
    `JSONL records: ${recordCount}.`,
  ].join("\n");
};

const formatCapturedRequests = (
  records: readonly NativeRequestCaptureRequest[]
): string => {
  if (records.length === 0) {
    return "- No matching request captured yet.";
  }
  return records
    .map((request, index) => {
      const bodyLength = request.bodyText.length;
      return [
        `- ${index + 1}. ${request.method} ${request.target}${request.path}`,
        `(bodyTextLength: ${bodyLength})`,
      ].join(" ");
    })
    .join("\n");
};

const fencedJson = (value: unknown): string =>
  ["```json", JSON.stringify(value, null, 2), "```"].join("\n");

const capitalizeProvider = (
  providerId: NativeRequestCaptureProviderId
): string => providerId.charAt(0).toUpperCase() + providerId.slice(1);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isCodexFullTurnRequest = (
  request: NativeRequestCaptureRequest
): boolean => {
  const body = request.body;
  if (!isRecord(body)) {
    return false;
  }
  if (Array.isArray(body.input)) {
    return body.input.length > 0;
  }
  return body.generate !== false;
};

const findIgnoredRequestRecords = (
  records: readonly unknown[]
): readonly NativeRequestCaptureIgnoredRecord[] =>
  records.filter(isIgnoredRequestRecord);

const findProviderDiagnosticContextRecords = (
  records: readonly unknown[]
): readonly ProviderDiagnosticContextRecord[] =>
  records.filter(isProviderDiagnosticContextRecord);

const formatIgnoredRequests = (
  records: readonly NativeRequestCaptureIgnoredRecord[]
): string => {
  if (records.length === 0) {
    return "- No ignored provider HTTP requests observed.";
  }
  return records
    .map((record) => {
      const request = record.method
        ? `${record.method} ${record.path ?? ""}`
        : "";
      const suffix = request ? ` - ${request}` : "";
      return `- ${record.reason}: ${record.target}${suffix}`;
    })
    .join("\n");
};

const isProviderRuntimeErrorRecord = (
  record: unknown
): record is ProviderRuntimeErrorRecord =>
  isRecord(record) &&
  record.type === "provider_runtime_error" &&
  typeof record.message === "string";

const isIgnoredRequestRecord = (
  record: unknown
): record is NativeRequestCaptureIgnoredRecord =>
  isRecord(record) &&
  record.type === "request_ignored" &&
  typeof record.reason === "string" &&
  typeof record.target === "string";

const isProviderDiagnosticContextRecord = (
  record: unknown
): record is ProviderDiagnosticContextRecord =>
  isRecord(record) &&
  record.type === "provider_diagnostic_context" &&
  typeof record.kind === "string";

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const stringifyErrorRecord = (value: Record<string, unknown>): string => {
  try {
    return JSON.stringify(value) ?? "Provider runtime failed";
  } catch {
    return "Provider runtime failed";
  }
};

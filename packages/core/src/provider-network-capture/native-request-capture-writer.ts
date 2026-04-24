import fs from "node:fs/promises";
import path from "node:path";
import { redactCaptureHeaders } from "./native-request-capture-redaction";
import type {
  NativeRequestCaptureFailureReason,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureProxyEvent,
  NativeRequestCaptureRequest,
} from "./native-request-capture-types";

type SectionName = "messages" | "system" | "tools";
type NativeRequestCaptureIgnoredRecord = Extract<
  NativeRequestCaptureProxyEvent,
  { readonly type: "request_ignored" }
>;

interface NativeRequestCaptureWriterOptions {
  readonly appliedTurnConfig?: unknown;
  readonly captureId: string;
  readonly clock?: () => Date;
  readonly outputDir: string;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly selectedModelId?: string | null;
}

interface NativeRequestCaptureArtifacts {
  readonly jsonlPath: string;
  readonly markdownPath: string;
}

interface CaptureSectionRecord {
  readonly content?: unknown;
  readonly payload?: unknown;
  readonly section: SectionName;
  readonly type: "section_extract";
}

interface ProviderRuntimeErrorRecord {
  readonly captureId: string;
  readonly message: string;
  readonly name: string | null;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly sentUpstream: false;
  readonly stack: string | null;
  readonly timestamp: string;
  readonly type: "provider_runtime_error";
}

export class NativeRequestCaptureWriter {
  readonly #artifacts: NativeRequestCaptureArtifacts;
  readonly #appliedTurnConfig: unknown;
  readonly #captureId: string;
  readonly #clock: () => Date;
  readonly #providerId: NativeRequestCaptureProviderId;
  readonly #records: unknown[] = [];
  readonly #selectedModelId: string | null;
  readonly #capturedRequests: NativeRequestCaptureRequest[] = [];

  private constructor(
    options: NativeRequestCaptureWriterOptions,
    artifacts: NativeRequestCaptureArtifacts
  ) {
    this.#artifacts = artifacts;
    this.#appliedTurnConfig = options.appliedTurnConfig ?? null;
    this.#captureId = options.captureId;
    this.#clock = options.clock ?? (() => new Date());
    this.#providerId = options.providerId;
    this.#selectedModelId = options.selectedModelId ?? null;
  }

  static async create(
    options: NativeRequestCaptureWriterOptions
  ): Promise<NativeRequestCaptureWriter> {
    await fs.mkdir(options.outputDir, { recursive: true });
    const stem = buildArtifactStem({
      now: options.clock?.() ?? new Date(),
      providerId: options.providerId,
    });
    const artifacts = {
      jsonlPath: path.join(options.outputDir, `${stem}.jsonl`),
      markdownPath: path.join(options.outputDir, `${stem}.md`),
    };
    const writer = new NativeRequestCaptureWriter(options, artifacts);
    await writer.appendRecord({
      type: "capture_start",
      captureId: options.captureId,
      appliedTurnConfig: options.appliedTurnConfig ?? null,
      providerId: options.providerId,
      selectedModelId: options.selectedModelId ?? null,
      sentUpstream: false,
      timestamp: writer.#clock().toISOString(),
    });
    return writer;
  }

  get artifacts(): NativeRequestCaptureArtifacts {
    return this.#artifacts;
  }

  async recordProxyEvent(event: NativeRequestCaptureProxyEvent): Promise<void> {
    if (event.type === "request_captured") {
      await this.writeCapturedRequest(event.request);
      return;
    }
    if (event.type === "capture_end") {
      await this.complete(event.status, event.reason);
      return;
    }
    if (event.type === "request_ignored") {
      await this.appendRecord(sanitizeIgnoredRequest(event));
      await this.writeMarkdown();
      return;
    }
    await this.appendRecord(event);
  }

  async recordProviderRuntimeError(error: unknown): Promise<void> {
    await this.appendRecord(
      normalizeProviderRuntimeError(error, {
        captureId: this.#captureId,
        providerId: this.#providerId,
        timestamp: this.#clock().toISOString(),
      })
    );
    await this.writeMarkdown();
  }

  async writeCapturedRequest(
    request: NativeRequestCaptureRequest
  ): Promise<void> {
    const sanitizedRequest = {
      ...request,
      headers: redactCaptureHeaders(request.headers),
    };
    this.#capturedRequests.push(sanitizedRequest);
    await this.appendRecord({
      type: "request_captured",
      ...sanitizedRequest,
      sentUpstream: false,
    });
    for (const section of extractSections(request.body)) {
      await this.appendRecord(section);
    }
    await this.writeMarkdown();
  }

  async complete(
    status: "captured" | "failed" | "timeout",
    reason: NativeRequestCaptureFailureReason | null = null
  ): Promise<void> {
    await this.appendRecord({
      type: "capture_end",
      captureId: this.#captureId,
      providerId: this.#providerId,
      reason,
      sentUpstream: false,
      status,
      timestamp: this.#clock().toISOString(),
    });
    await this.writeMarkdown();
  }

  private async appendRecord(record: unknown): Promise<void> {
    this.#records.push(record);
    await fs.appendFile(
      this.#artifacts.jsonlPath,
      `${JSON.stringify(record)}\n`,
      "utf8"
    );
  }

  private async writeMarkdown(): Promise<void> {
    const request = this.getPrimaryRequest();
    const title = `${capitalizeProvider(this.#providerId)} Native Request Capture`;
    const bodySections = request ? extractSections(request.body) : [];
    const ignoredRequests = findIgnoredRequestRecords(this.#records);
    const providerRuntimeError = findProviderRuntimeError(this.#records);
    const markdown = [
      `# ${title}`,
      "",
      `Provider: ${this.#providerId}`,
      "Sent upstream: false",
      "Capture mode: MITM capture-and-abort",
      `Generated at: ${this.#clock().toISOString()}`,
      "",
      "## Summary",
      "",
      buildSummary(request, this.#records, this.#capturedRequests.length),
      "",
      "## Capture Configuration",
      "",
      fencedJson({
        selectedModelId: this.#selectedModelId,
        appliedTurnConfig: this.#appliedTurnConfig,
      }),
      "",
      "## Captured Requests",
      "",
      formatCapturedRequests(this.#capturedRequests),
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
    await fs.writeFile(this.#artifacts.markdownPath, markdown, "utf8");
  }

  private getPrimaryRequest(): NativeRequestCaptureRequest | null {
    return this.#capturedRequests.length > 0
      ? (this.#capturedRequests.at(-1) ?? null)
      : null;
  }
}

const buildArtifactStem = (params: {
  readonly now: Date;
  readonly providerId: NativeRequestCaptureProviderId;
}): string => {
  const timestamp = params.now.toISOString().replace(/[:.]/g, "-");
  return `${timestamp}-${params.providerId}-native-request`;
};

const extractSections = (body: unknown): readonly CaptureSectionRecord[] => {
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
  const providerRuntimeError = findProviderRuntimeError(records);
  if (!request) {
    if (providerRuntimeError) {
      const errorName = providerRuntimeError.name ?? "Error";
      return [
        "No matching provider model request captured yet.",
        `Provider runtime error: ${errorName}: ${providerRuntimeError.message}.`,
        `Ignored requests: ${ignoredCount}.`,
        `JSONL records: ${recordCount}.`,
      ].join("\n");
    }
    return [
      "No matching provider model request captured yet.",
      `Ignored requests: ${ignoredCount}.`,
      `JSONL records: ${recordCount}.`,
    ].join("\n");
  }
  return [
    `Captured provider requests: ${capturedRequestCount}.`,
    `Primary request: ${request.target}.`,
    `Method/path: ${request.method} ${request.path}.`,
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

const findProviderRuntimeError = (
  records: readonly unknown[]
): ProviderRuntimeErrorRecord | null =>
  records.find(isProviderRuntimeErrorRecord) ?? null;

const findIgnoredRequestRecords = (
  records: readonly unknown[]
): readonly NativeRequestCaptureIgnoredRecord[] =>
  records.filter(isIgnoredRequestRecord);

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

const sanitizeIgnoredRequest = (
  event: NativeRequestCaptureIgnoredRecord
): NativeRequestCaptureIgnoredRecord => ({
  ...event,
  headers: event.headers ? redactCaptureHeaders(event.headers) : undefined,
});

const normalizeProviderRuntimeError = (
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

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 ? value : null;

const stringifyErrorRecord = (value: Record<string, unknown>): string => {
  try {
    return JSON.stringify(value) ?? "Provider runtime failed";
  } catch {
    return "Provider runtime failed";
  }
};

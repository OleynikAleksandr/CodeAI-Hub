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

interface NativeRequestCaptureWriterOptions {
  readonly captureId: string;
  readonly clock?: () => Date;
  readonly outputDir: string;
  readonly providerId: NativeRequestCaptureProviderId;
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

export class NativeRequestCaptureWriter {
  readonly #artifacts: NativeRequestCaptureArtifacts;
  readonly #captureId: string;
  readonly #clock: () => Date;
  readonly #providerId: NativeRequestCaptureProviderId;
  readonly #records: unknown[] = [];
  #capturedRequest: NativeRequestCaptureRequest | null = null;

  private constructor(
    options: NativeRequestCaptureWriterOptions,
    artifacts: NativeRequestCaptureArtifacts
  ) {
    this.#artifacts = artifacts;
    this.#captureId = options.captureId;
    this.#clock = options.clock ?? (() => new Date());
    this.#providerId = options.providerId;
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
      providerId: options.providerId,
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
    await this.appendRecord(event);
  }

  async writeCapturedRequest(
    request: NativeRequestCaptureRequest
  ): Promise<void> {
    const sanitizedRequest = {
      ...request,
      headers: redactCaptureHeaders(request.headers),
    };
    this.#capturedRequest = sanitizedRequest;
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
    const request = this.#capturedRequest;
    const title = `${capitalizeProvider(this.#providerId)} Native Request Capture`;
    const bodySections = request ? extractSections(request.body) : [];
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
      buildSummary(request, this.#records),
      "",
      "## Captured Requests",
      "",
      request
        ? `- ${request.method} ${request.target}${request.path}`
        : "- No matching request captured yet.",
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
      "## Notes",
      "",
      "- Sensitive local diagnostic artifact. Do not upload or share.",
      "- Credential-bearing headers are redacted by default.",
      "- Request body is intentionally preserved for instruction debugging.",
      "",
    ].join("\n");
    await fs.writeFile(this.#artifacts.markdownPath, markdown, "utf8");
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
  records: readonly unknown[]
): string => {
  const recordCount = records.length;
  if (!request) {
    return `No matching provider model request captured yet. JSONL records: ${recordCount}.`;
  }
  return [
    `Captured one provider request for ${request.target}.`,
    `Method/path: ${request.method} ${request.path}.`,
    `JSONL records: ${recordCount}.`,
  ].join("\n");
};

const fencedJson = (value: unknown): string =>
  ["```json", JSON.stringify(value, null, 2), "```"].join("\n");

const capitalizeProvider = (
  providerId: NativeRequestCaptureProviderId
): string => providerId.charAt(0).toUpperCase() + providerId.slice(1);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

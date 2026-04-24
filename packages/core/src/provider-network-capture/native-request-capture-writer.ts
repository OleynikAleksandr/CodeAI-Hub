import fs from "node:fs/promises";
import path from "node:path";
import {
  buildNativeRequestCaptureMarkdown,
  extractSections,
  normalizeProviderRuntimeError,
  sanitizeIgnoredRequest,
} from "./native-request-capture-markdown";
import { redactCaptureHeaders } from "./native-request-capture-redaction";
import type {
  NativeRequestCaptureFailureReason,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureProxyEvent,
  NativeRequestCaptureRequest,
} from "./native-request-capture-types";

interface NativeRequestCaptureWriterOptions {
  readonly appliedTurnConfig?: unknown;
  readonly captureId: string;
  readonly clock?: () => Date;
  readonly outputDir: string;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly scenarioMetadata?: unknown;
  readonly selectedModelId?: string | null;
}

interface NativeRequestCaptureArtifacts {
  readonly jsonlPath: string;
  readonly markdownPath: string;
}

export class NativeRequestCaptureWriter {
  readonly #artifacts: NativeRequestCaptureArtifacts;
  readonly #appliedTurnConfig: unknown;
  readonly #captureId: string;
  readonly #clock: () => Date;
  readonly #providerId: NativeRequestCaptureProviderId;
  readonly #records: unknown[] = [];
  readonly #scenarioMetadata: unknown;
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
    this.#scenarioMetadata = options.scenarioMetadata ?? null;
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
      scenarioMetadata: options.scenarioMetadata ?? null,
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

  async recordProviderDiagnosticContext(record: {
    readonly kind: string;
    readonly payload: unknown;
  }): Promise<void> {
    await this.appendRecord({
      type: "provider_diagnostic_context",
      captureId: this.#captureId,
      kind: record.kind,
      payload: record.payload,
      providerId: this.#providerId,
      sentUpstream: false,
      timestamp: this.#clock().toISOString(),
    });
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
    const markdown = buildNativeRequestCaptureMarkdown({
      appliedTurnConfig: this.#appliedTurnConfig,
      capturedRequests: this.#capturedRequests,
      generatedAt: this.#clock().toISOString(),
      providerId: this.#providerId,
      records: this.#records,
      scenarioMetadata: this.#scenarioMetadata,
      selectedModelId: this.#selectedModelId,
    });
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

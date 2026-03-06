import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const TRACE_FILE_PATH = path.join(
  homedir(),
  ".codeai-hub",
  "logs",
  "core",
  "dialog-send-trace.jsonl"
);

export type DialogSendTraceRecord = {
  readonly event: string;
  readonly outboundAttemptId: string;
  readonly providerId: string;
  readonly workspaceSlug: string;
  readonly requestId?: string;
  readonly dialogId?: string;
  readonly sessionId?: string;
  readonly providerSessionId?: string;
  readonly threadId?: string;
  readonly contentLength?: number;
  readonly payload?: unknown;
  readonly error?: string;
};

export class DialogSendTraceLogger {
  private writeQueue = Promise.resolve();
  private initPromise: Promise<void> | null = null;

  record(record: DialogSendTraceRecord): void {
    const timestampMs = Date.now();
    const entry = JSON.stringify({
      ...record,
      timestampIso: new Date(timestampMs).toISOString(),
      timestampMs,
    });
    this.writeQueue = this.writeQueue
      .then(async () => {
        await this.ensureReady();
        await fs.appendFile(TRACE_FILE_PATH, `${entry}\n`, "utf8");
      })
      .catch(() => {
        /* ignore trace write failures */
      });
  }

  private async ensureReady(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = fs
        .mkdir(path.dirname(TRACE_FILE_PATH), { recursive: true })
        .then(() => fs.appendFile(TRACE_FILE_PATH, "", "utf8"))
        .catch(() => {
          /* ignore trace initialization failures */
        });
    }
    await this.initPromise;
  }
}

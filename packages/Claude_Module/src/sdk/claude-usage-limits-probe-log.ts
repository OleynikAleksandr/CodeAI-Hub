import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import type { UsageLimitsSnapshot } from "./claude-usage-limits-snapshot";

const LOG_ROOT = path.join(homedir(), ".codeai-hub", "logs", "claude");
const LOG_FILE_PATH = path.join(LOG_ROOT, "usage-limits-probe.jsonl");

type UsageLimitsProbeResult =
  | "skipped_temp_session"
  | "skipped_missing_token"
  | "request_error"
  | "http_error"
  | "parsed_empty"
  | "parsed_ok";

type UsageLimitsProbeLogEntry = {
  readonly type: "usage_limits_probe";
  readonly timestamp: string;
  readonly sessionId: string;
  readonly cwd: string;
  readonly result: UsageLimitsProbeResult;
  readonly durationMs: number;
  readonly httpStatus?: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly snapshot?: UsageLimitsSnapshot | null;
  readonly error?: string;
};

export class ClaudeUsageLimitsProbeLog {
  private readonly filePath: string;
  private readonly fileReady: Promise<void>;
  private writeQueue = Promise.resolve();

  constructor(filePath: string = LOG_FILE_PATH) {
    this.filePath = filePath;
    this.fileReady = this.ensureLogFile();
  }

  log(entry: Omit<UsageLimitsProbeLogEntry, "type" | "timestamp">): void {
    const record: UsageLimitsProbeLogEntry = {
      type: "usage_limits_probe",
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.enqueueWrite(`${JSON.stringify(record)}\n`);
  }

  private async ensureLogFile(): Promise<void> {
    await fs.mkdir(LOG_ROOT, { recursive: true });
    const handle = await fs.open(this.filePath, "a");
    await handle.close();
  }

  private enqueueWrite(payload: string): void {
    this.writeQueue = this.writeQueue
      .then(() => this.fileReady)
      .then(() => fs.appendFile(this.filePath, payload, "utf8"))
      .catch(() => {
        /* ignore probe-log write errors */
      });
  }
}

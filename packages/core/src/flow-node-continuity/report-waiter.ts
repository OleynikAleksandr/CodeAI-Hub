import { access, stat } from "node:fs/promises";

interface WaitForReportOptions {
  readonly clock?: () => number;
  readonly pollIntervalMs: number;
  readonly reportPath: string;
  readonly timeoutMs: number;
}

export interface WaitForReportResult {
  readonly modifiedAtMs: number;
  readonly reportPath: string;
  readonly sizeBytes: number;
  readonly waitedMs: number;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const toSafeMs = (value: number, fallback: number): number => {
  if (value === Number.POSITIVE_INFINITY) {
    return value;
  }
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

export class ContinuityReportWaiter {
  readonly #clock: () => number;

  constructor(clock?: () => number) {
    this.#clock = clock ?? (() => Date.now());
  }

  async waitForReport(
    options: WaitForReportOptions
  ): Promise<WaitForReportResult> {
    const timeoutMs = toSafeMs(options.timeoutMs, 30_000);
    const pollIntervalMs = Math.min(
      toSafeMs(options.pollIntervalMs, 250),
      5000
    );
    const now = options.clock ?? this.#clock;

    const startMs = now();
    while (now() - startMs <= timeoutMs) {
      try {
        await access(options.reportPath);
        const stats = await stat(options.reportPath);
        const modifiedAtMs = stats.mtimeMs;
        return {
          reportPath: options.reportPath,
          sizeBytes: stats.size,
          modifiedAtMs,
          waitedMs: now() - startMs,
        };
      } catch {
        // Continue waiting.
      }

      await sleep(pollIntervalMs);
    }

    throw new Error(
      `Timed out waiting for continuity report: ${options.reportPath} (${timeoutMs}ms)`
    );
  }
}

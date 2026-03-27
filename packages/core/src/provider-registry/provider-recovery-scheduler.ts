import type { Logger } from "../telemetry/logger";

const DEFAULT_RECOVERY_INTERVAL_MS = 60_000;

interface ProviderRecoverySchedulerOptions {
  readonly intervalMs?: number;
  readonly logger: Logger;
  readonly retry: (providerId: string) => Promise<void>;
}

export class ProviderRecoveryScheduler {
  private readonly options: ProviderRecoverySchedulerOptions;
  private readonly retryTimers = new Map<string, NodeJS.Timeout>();

  constructor(options: ProviderRecoverySchedulerOptions) {
    this.options = options;
  }

  clearRetry(providerId: string): void {
    const timer = this.retryTimers.get(providerId);
    if (timer) {
      clearTimeout(timer);
      this.retryTimers.delete(providerId);
    }
  }

  scheduleRetry(providerId: string): void {
    if (this.retryTimers.has(providerId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.retryTimers.delete(providerId);
      this.options.retry(providerId).catch((error) => {
        this.options.logger.warn("Provider retry failed", {
          providerId,
          message: error instanceof Error ? error.message : String(error),
        });
        this.scheduleRetry(providerId);
      });
    }, this.options.intervalMs ?? DEFAULT_RECOVERY_INTERVAL_MS);

    this.retryTimers.set(providerId, timer);
  }
}

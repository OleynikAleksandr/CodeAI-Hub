export interface CodexStartupLockOwner {
  readonly sessionId: string;
}

export type CodexStartupLockRelease = () => void;

export interface CodexStartupLockAcquireOptions {
  readonly timeoutMs?: number;
}

interface QueueEntry {
  readonly grant: () => void;
  readonly owner: CodexStartupLockOwner;
  readonly reject: (error: Error) => void;
  timeoutId?: NodeJS.Timeout;
}

const DEFAULT_ACQUIRE_TIMEOUT_MS = 30_000;

class CodexStartupLock {
  private active = false;
  private readonly queue: QueueEntry[] = [];

  acquire(
    owner: CodexStartupLockOwner,
    options?: CodexStartupLockAcquireOptions
  ): Promise<CodexStartupLockRelease> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_ACQUIRE_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const entry: QueueEntry = {
        owner,
        reject,
        grant: () => {
          if (entry.timeoutId) {
            clearTimeout(entry.timeoutId);
          }
          let released = false;
          resolve(() => {
            if (released) {
              return;
            }
            released = true;
            this.releaseAndNext();
          });
        },
      };

      if (!this.active) {
        this.active = true;
        entry.grant();
        return;
      }

      if (timeoutMs > 0) {
        entry.timeoutId = setTimeout(() => {
          const index = this.queue.indexOf(entry);
          if (index >= 0) {
            this.queue.splice(index, 1);
          }
          entry.reject(
            new Error(
              `Codex startup lock acquisition timeout after ${timeoutMs}ms (sessionId=${owner.sessionId})`
            )
          );
        }, timeoutMs);
      }

      this.queue.push(entry);
    });
  }

  private releaseAndNext(): void {
    const next = this.queue.shift();
    if (next) {
      next.grant();
      return;
    }
    this.active = false;
  }
}

export const codexStartupLock = new CodexStartupLock();

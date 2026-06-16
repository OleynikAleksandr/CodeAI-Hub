export interface SessionTranslationDispatchCandidate {
  readonly content: string;
  readonly role: "assistant" | "thinking" | "system" | "user";
  readonly tag?: string;
}

export interface SessionTranslationDispatcherSnapshot {
  readonly activeJobs: number;
  readonly maxConcurrentJobs: number;
  readonly pendingJobs: number;
}

const SESSION_TRANSLATION_MAX_CONCURRENT_JOBS = 2;

export class SessionTranslationDispatcher {
  private activeJobs = 0;
  private readonly maxConcurrentJobs = SESSION_TRANSLATION_MAX_CONCURRENT_JOBS;
  private readonly queuedJobs: Array<() => void> = [];

  shouldTranslateDialogMessage(
    candidate: SessionTranslationDispatchCandidate
  ): boolean {
    if (candidate.content.trim().length === 0) {
      return false;
    }

    return (
      candidate.role === "thinking" ||
      (candidate.role === "assistant" && candidate.tag === "thinking")
    );
  }

  snapshot(): SessionTranslationDispatcherSnapshot {
    return {
      activeJobs: this.activeJobs,
      maxConcurrentJobs: this.maxConcurrentJobs,
      pendingJobs: this.queuedJobs.length,
    };
  }

  async dispatch<T>(job: () => Promise<T>): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const runJob = () => {
        this.activeJobs += 1;
        Promise.resolve()
          .then(job)
          .then(resolve, reject)
          .finally(() => {
            this.activeJobs = Math.max(0, this.activeJobs - 1);
            this.queuedJobs.shift()?.();
          });
      };

      if (this.activeJobs < this.maxConcurrentJobs) {
        runJob();
        return;
      }

      this.queuedJobs.push(runJob);
    });
  }
}

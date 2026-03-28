import type { IdlePulsePayload } from "./codex-message-processor-shared";

export const waitForNextResultWithIdlePulses = async <T>(params: {
  readonly nextPromise: Promise<T>;
  readonly idleTimeoutMs: number;
  readonly onIdle: (payload: IdlePulsePayload) => void;
}): Promise<T> => {
  const startedAt = Date.now();
  let idleCount = 0;
  while (true) {
    let timer: NodeJS.Timeout | null = null;
    try {
      const winner = (await Promise.race([
        params.nextPromise.then((result) => ({
          kind: "result" as const,
          result,
        })),
        new Promise<{ readonly kind: "idle" }>((resolve) => {
          timer = setTimeout(
            () => resolve({ kind: "idle" }),
            params.idleTimeoutMs
          );
        }),
      ])) as
        | { readonly kind: "idle" }
        | { readonly kind: "result"; readonly result: T };
      if (winner.kind === "result") {
        return winner.result;
      }
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
    idleCount += 1;
    params.onIdle({ elapsedMs: Date.now() - startedAt, idleCount });
  }
};

export const raceWithTimeout = async <T>(payload: {
  readonly promise: Promise<T>;
  readonly timeoutMs: number;
}): Promise<{ readonly timedOut: boolean; readonly result?: T }> => {
  let timer: NodeJS.Timeout | null = null;
  const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), payload.timeoutMs);
  });
  try {
    return (await Promise.race([
      payload.promise.then((result) => ({ timedOut: false as const, result })),
      timeoutPromise,
    ])) as { timedOut: boolean; result?: T };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

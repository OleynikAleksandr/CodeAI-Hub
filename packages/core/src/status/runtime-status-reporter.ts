export type RuntimeStatusPhase = "boot" | "install" | "provider" | "finalize";

export type RuntimeStatusEvent = {
  readonly phase: RuntimeStatusPhase;
  readonly label: string;
  readonly detail?: string;
  readonly scope?: string;
  readonly firstRun?: boolean;
  readonly timestamp: string;
};

type Listener = (event: RuntimeStatusEvent) => void;

export class RuntimeStatusReporter {
  private readonly listeners = new Set<Listener>();

  private lastEvent: RuntimeStatusEvent | null = null;

  emit(
    event: Omit<RuntimeStatusEvent, "timestamp"> | RuntimeStatusEvent
  ): void {
    const payload: RuntimeStatusEvent =
      "timestamp" in event
        ? event
        : {
            ...event,
            timestamp: new Date().toISOString(),
          };
    this.lastEvent = payload;
    for (const listener of this.listeners) {
      listener(payload);
    }
  }

  subscribe(listener: Listener, replay = true): () => void {
    this.listeners.add(listener);
    if (replay && this.lastEvent) {
      listener(this.lastEvent);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): RuntimeStatusEvent | null {
    return this.lastEvent;
  }
}

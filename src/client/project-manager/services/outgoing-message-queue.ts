type QueueMessage = { readonly type: string };

export class OutgoingMessageQueue<TMessage extends QueueMessage = QueueMessage> {
  private pending: TMessage[] = [];
  private readonly maxPending: number;

  constructor(options?: { readonly maxPending?: number }) {
    this.maxPending = options?.maxPending ?? 200;
  }

  enqueue(message: TMessage): void {
    if (message.type === "workspace:select") {
      // Keep only the most recent selection intent.
      this.pending = this.pending.filter(
        (candidate) => candidate.type !== "workspace:select"
      );
    }

    if (this.pending.length >= this.maxPending) {
      this.pending.shift();
    }
    this.pending.push(message);
  }

  flush(send: (message: TMessage) => void): void {
    if (this.pending.length === 0) {
      return;
    }
    const pending = this.pending;
    this.pending = [];
    for (const message of pending) {
      try {
        send(message);
      } catch {
        // If a send fails, re-queue the message and rely on reconnect.
        this.pending.push(message);
      }
    }
  }
}

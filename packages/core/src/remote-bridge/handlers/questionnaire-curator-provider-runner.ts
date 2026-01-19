type ProviderAdapter = {
  createSession(workspacePath?: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): Promise<void>;
  subscribe(
    sessionId: string,
    listener: (payload: unknown) => void
  ): () => void;
};

export type CuratorProviderAdapter = ProviderAdapter;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractAssistantContent = (event: unknown): string | null => {
  if (typeof event === "string") {
    return event;
  }
  if (!isRecord(event)) {
    return null;
  }

  const type = typeof event.type === "string" ? event.type : "";
  if (type === "assistant" && typeof event.content === "string") {
    return event.content;
  }
  if (
    type === "dialog_message" &&
    event.role === "assistant" &&
    typeof event.content === "string"
  ) {
    return event.content;
  }

  if (
    type === "stream_event" &&
    isRecord(event.data) &&
    event.data.kind === "structured_output" &&
    typeof event.data.suggested_response === "string"
  ) {
    return event.data.suggested_response;
  }
  return null;
};

export class QuestionnaireCuratorProviderRunner {
  async requestAppendBlock(
    adapter: ProviderAdapter,
    workspacePath: string,
    prompt: string
  ): Promise<string | null> {
    const curatorSessionId = await adapter.createSession(workspacePath);
    try {
      return await this.runCuratorPrompt(adapter, curatorSessionId, prompt);
    } finally {
      await adapter.closeSession(curatorSessionId).catch(() => null);
    }
  }

  private async runCuratorPrompt(
    adapter: ProviderAdapter,
    sessionId: string,
    prompt: string
  ): Promise<string | null> {
    let resolved = false;
    let latestText: string | null = null;
    let lastUpdate = Date.now();
    const promptTrimmed = prompt.trim();

    const done = (value: string | null): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      latestText = value;
    };

    const unsubscribe = adapter.subscribe(sessionId, (event) => {
      if (resolved) {
        return;
      }
      const text = extractAssistantContent(event);
      if (!text) {
        return;
      }
      const trimmed = text.trim();
      if (trimmed.length === 0) {
        return;
      }
      if (trimmed === promptTrimmed) {
        return;
      }
      if (!latestText || trimmed.length >= latestText.length) {
        latestText = trimmed;
        lastUpdate = Date.now();
      }
    });

    try {
      await adapter.sendMessage(sessionId, prompt);
      const timeoutMs = 90_000;
      const startedAt = Date.now();
      while (!resolved && Date.now() - startedAt < timeoutMs) {
        if (latestText && Date.now() - lastUpdate > 1500) {
          done(latestText);
          break;
        }
        await new Promise((resolver) => setTimeout(resolver, 250));
      }
      if (!resolved) {
        done(latestText);
      }
    } finally {
      unsubscribe();
    }

    return latestText;
  }
}

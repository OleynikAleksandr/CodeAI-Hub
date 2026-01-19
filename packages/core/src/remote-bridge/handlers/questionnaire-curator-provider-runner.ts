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

const extractMessageContent = (event: unknown): string | null => {
  if (typeof event === "string") {
    return event;
  }
  if (!event || typeof event !== "object") {
    return null;
  }
  const typed = event as {
    readonly content?: unknown;
    readonly data?: unknown;
    readonly payload?: unknown;
  };

  if (typeof typed.content === "string") {
    return typed.content;
  }
  if (typed.content && typeof typed.content === "object") {
    return JSON.stringify(typed.content);
  }

  if (typeof typed.data === "string") {
    return typed.data;
  }
  if (typed.data && typeof typed.data === "object") {
    return JSON.stringify(typed.data);
  }

  if (typeof typed.payload === "string") {
    return typed.payload;
  }
  if (typed.payload && typeof typed.payload === "object") {
    return JSON.stringify(typed.payload);
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
      const text = extractMessageContent(event);
      if (!text) {
        return;
      }
      const trimmed = text.trim();
      if (trimmed.length === 0) {
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

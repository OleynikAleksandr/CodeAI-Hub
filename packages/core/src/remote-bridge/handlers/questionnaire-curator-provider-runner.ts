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

const BEGIN_APPEND_MARKER = "BEGIN_APPEND";
const END_APPEND_MARKER = "END_APPEND";
const APPEND_BLOCK_RE = /BEGIN_APPEND\s*([\s\S]*?)\s*END_APPEND/m;

const extractAppendBlock = (text: string): string | null => {
  const match = text.match(APPEND_BLOCK_RE);
  if (!match) {
    return null;
  }
  const content = match[1]?.trim();
  return content && content.length > 0 ? content : null;
};

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
    let appendBlock: string | null = null;

    const done = (value: string | null): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      appendBlock = value;
    };

    const unsubscribe = adapter.subscribe(sessionId, (event) => {
      if (resolved) {
        return;
      }
      const text = extractMessageContent(event);
      if (!text) {
        return;
      }
      if (
        !(
          text.includes(BEGIN_APPEND_MARKER) && text.includes(END_APPEND_MARKER)
        )
      ) {
        return;
      }
      done(extractAppendBlock(text));
    });

    try {
      await adapter.sendMessage(sessionId, prompt);
      const timeoutMs = 90_000;
      const startedAt = Date.now();
      while (!resolved && Date.now() - startedAt < timeoutMs) {
        await new Promise((resolver) => setTimeout(resolver, 250));
      }
      if (!resolved) {
        done(null);
      }
    } finally {
      unsubscribe();
    }

    return appendBlock;
  }
}

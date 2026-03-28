interface ReasoningDelta {
  readonly delta: string;
  readonly merged: string;
}

export class CodexReasoningStreams {
  private readonly reasoningStreams = new Map<string, Map<string, string>>();

  append(sessionId: string, itemId: string, nextText: string): string | null {
    if (!nextText) {
      return null;
    }
    const sessionMap = this.getSession(sessionId);
    const previous = sessionMap.get(itemId) ?? "";
    const { delta, merged } = this.resolveDelta(previous, nextText);
    if (merged !== previous) {
      sessionMap.set(itemId, merged);
    }
    return delta.length > 0 ? delta : null;
  }

  complete(sessionId: string, itemId: string, nextText: string): string | null {
    const delta = this.append(sessionId, itemId, nextText);
    const sessionMap = this.reasoningStreams.get(sessionId);
    if (sessionMap) {
      sessionMap.delete(itemId);
      if (sessionMap.size === 0) {
        this.reasoningStreams.delete(sessionId);
      }
    }
    return delta;
  }

  clear(sessionId: string): void {
    this.reasoningStreams.delete(sessionId);
  }

  private getSession(sessionId: string): Map<string, string> {
    const existing = this.reasoningStreams.get(sessionId);
    if (existing) {
      return existing;
    }
    const fresh = new Map<string, string>();
    this.reasoningStreams.set(sessionId, fresh);
    return fresh;
  }

  private resolveDelta(previous: string, nextText: string): ReasoningDelta {
    if (!previous) {
      return { delta: nextText, merged: nextText };
    }
    if (nextText.startsWith(previous)) {
      return {
        delta: nextText.slice(previous.length),
        merged: nextText,
      };
    }
    if (previous.startsWith(nextText)) {
      return { delta: "", merged: previous };
    }
    return { delta: nextText, merged: `${previous}${nextText}` };
  }
}

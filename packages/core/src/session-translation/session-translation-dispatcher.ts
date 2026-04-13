export interface SessionTranslationDispatchCandidate {
  readonly content: string;
  readonly role: "assistant" | "thinking" | "system" | "user";
  readonly tag?: string;
}

export class SessionTranslationDispatcher {
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
}

/**
 * Provider-Facing Dialog Builder — builds unified-dialog.prompt.md
 * from dialog history. Produces plain User:/Assistant: transcript
 * without metadata, timestamps, or provider-specific envelopes.
 */

export type DialogMessage = {
  readonly role: "system" | "user" | "assistant" | "thinking";
  readonly content: string;
};

/**
 * Build a plain-text dialog transcript for the new provider.
 * Only user and assistant messages are included.
 * Thinking, system, and tool messages are excluded.
 */
export function buildProviderFacingDialog(
  messages: readonly DialogMessage[]
): string {
  const lines: string[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      lines.push(`User:\n${message.content}`);
    } else if (message.role === "assistant") {
      lines.push(`Assistant:\n${message.content}`);
    }
    // thinking and system messages are intentionally excluded
  }

  return lines.join("\n\n");
}

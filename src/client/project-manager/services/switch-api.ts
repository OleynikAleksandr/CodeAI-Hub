import type { OutgoingMessage } from "../core-stream-message-types";
import type {
  ClaudeModelSwitchRequestPayload,
  ClaudeThinkingEffort,
  CodexModelSwitchReasoningEffort,
} from "./switch-payloads";

type Send = (message: OutgoingMessage) => void;

export class SwitchApi {
  readonly #send: Send;

  constructor(send: Send) {
    this.#send = send;
  }

  requestCodexModelSwitch(sessionId: string, targetModelId: string): void {
    this.#send({
      type: "session:codex:model-switch",
      payload: { sessionId, targetModelId },
    });
  }

  requestCodexReasoningSwitch(
    sessionId: string,
    targetReasoningEffort: CodexModelSwitchReasoningEffort
  ): void {
    this.#send({
      type: "session:codex:reasoning-switch",
      payload: { sessionId, targetReasoningEffort },
    });
  }

  requestClaudeModelSwitch(
    sessionId: string,
    targetModelId: ClaudeModelSwitchRequestPayload["targetModelId"]
  ): void {
    this.#send({
      type: "session:claude:model-switch",
      payload: { sessionId, targetModelId },
    });
  }

  requestClaudeThinkingSwitch(
    sessionId: string,
    thinkingEnabled: boolean,
    targetReasoningEffort?: ClaudeThinkingEffort
  ): void {
    this.#send({
      type: "session:claude:thinking-switch",
      payload: { sessionId, thinkingEnabled, targetReasoningEffort },
    });
  }
}

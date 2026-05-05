import type {
  SessionSpeechService,
  SessionSpeechSpeakRequest,
  SessionSpeechState,
} from "../../session-speech/session-speech-service";

export interface SessionSpeechStateEvent {
  readonly payload: SessionSpeechState;
  readonly type: "session:speech:state";
}

export type SessionSpeechBroadcaster = (event: SessionSpeechStateEvent) => void;

interface SessionSpeechRequestHandlerOptions {
  readonly broadcaster: SessionSpeechBroadcaster;
  readonly service: SessionSpeechService;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const optionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const optionalRate = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export class SessionSpeechRequestHandler {
  private readonly broadcaster: SessionSpeechBroadcaster;
  private readonly service: SessionSpeechService;

  constructor(options: SessionSpeechRequestHandlerOptions) {
    this.broadcaster = options.broadcaster;
    this.service = options.service;
    this.service.setStateListener((state) => {
      this.broadcast(state);
    });
  }

  handleSpeakMessage(payload: unknown): SessionSpeechState {
    const request = this.normalizeSpeakRequest(payload);
    if (!request) {
      return this.broadcast({
        error: "Invalid Text-to-Speech speak request.",
        messageId: null,
        sessionId: null,
        status: "error",
        updatedAt: new Date().toISOString(),
      });
    }

    return this.service.speak(request);
  }

  handleStop(payload: unknown): SessionSpeechState {
    const sessionId = isRecord(payload)
      ? optionalString(payload.sessionId)
      : null;
    const messageId = isRecord(payload)
      ? optionalString(payload.messageId)
      : null;
    return this.service.stop({ messageId, sessionId });
  }

  broadcast(state: SessionSpeechState): SessionSpeechState {
    this.broadcaster({
      payload: state,
      type: "session:speech:state",
    });
    return state;
  }

  private normalizeSpeakRequest(
    payload: unknown
  ): SessionSpeechSpeakRequest | null {
    if (!isRecord(payload)) {
      return null;
    }
    const messageId = optionalString(payload.messageId);
    const sessionId = optionalString(payload.sessionId);
    const text = optionalString(payload.text);
    if (!(messageId && sessionId && text)) {
      return null;
    }

    return {
      language: optionalString(payload.language),
      messageId,
      providerId: optionalString(payload.providerId),
      rate: optionalRate(payload.rate),
      sessionId,
      text,
    };
  }
}

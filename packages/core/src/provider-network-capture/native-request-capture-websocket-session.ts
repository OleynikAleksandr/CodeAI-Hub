import type tls from "node:tls";
import type {
  NativeRequestCaptureProviderId,
  NativeRequestCaptureRequest,
} from "./native-request-capture-types";
import { parseWebSocketClientFrame } from "./native-request-capture-websocket";

const WEBSOCKET_FRAME_SETTLE_MS = 250;

interface WebSocketRequestHead {
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
}

interface WebSocketCaptureSessionOptions {
  readonly captureId: string;
  readonly onCaptured: (request: NativeRequestCaptureRequest) => void;
  readonly onComplete: (request: NativeRequestCaptureRequest) => void;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly request: WebSocketRequestHead;
  readonly target: string;
  readonly tlsSocket: tls.TLSSocket;
}

export const shouldCompleteWebSocketCapture = (
  providerId: NativeRequestCaptureProviderId,
  body: unknown
): boolean => {
  if (providerId !== "codex") {
    return true;
  }
  if (!isRecord(body)) {
    return false;
  }
  if (Array.isArray(body.input)) {
    return body.input.length > 0;
  }
  return body.generate !== false;
};

export const captureWebSocketClientFrames = (
  options: WebSocketCaptureSessionOptions
): void => {
  let buffer = Buffer.alloc(0);
  let bestRequest: NativeRequestCaptureRequest | null = null;
  let settleTimer: NodeJS.Timeout | null = null;
  const finish = (request: NativeRequestCaptureRequest): void => {
    if (settleTimer) {
      clearTimeout(settleTimer);
      settleTimer = null;
    }
    options.tlsSocket.end();
    options.onComplete(request);
  };
  const scheduleSettle = (): void => {
    if (!bestRequest) {
      return;
    }
    if (settleTimer) {
      clearTimeout(settleTimer);
    }
    settleTimer = setTimeout(() => {
      if (bestRequest) {
        finish(bestRequest);
      }
    }, WEBSOCKET_FRAME_SETTLE_MS);
  };

  options.tlsSocket.on("data", (chunk: Buffer) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (true) {
      const frame = parseWebSocketClientFrame(buffer);
      if (!frame) {
        return;
      }
      buffer = buffer.subarray(frame.bytesConsumed);
      const capturedRequest = buildCapturedWebSocketRequest(options, frame);
      bestRequest = capturedRequest;
      options.onCaptured(capturedRequest);
      if (shouldCompleteWebSocketCapture(options.providerId, frame.body)) {
        finish(capturedRequest);
        return;
      }
      scheduleSettle();
    }
  });
};

const buildCapturedWebSocketRequest = (
  options: WebSocketCaptureSessionOptions,
  frame: {
    readonly body: unknown;
    readonly bodyText: string;
  }
): NativeRequestCaptureRequest => ({
  ...options.request,
  body: frame.body,
  bodyText: frame.bodyText,
  captureId: options.captureId,
  providerId: options.providerId,
  target: options.target,
  timestamp: new Date().toISOString(),
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

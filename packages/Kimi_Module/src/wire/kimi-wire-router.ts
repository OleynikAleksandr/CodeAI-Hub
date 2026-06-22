import { createKimiWireRequestError } from "../messaging/kimi-request-failure-normalizer";

export interface KimiWireRequest {
  readonly id: string | number;
  readonly method: string;
  readonly params?: unknown;
}

export interface KimiWireRouterOptions {
  readonly onEvent?: (params: unknown) => void;
  readonly onMalformedFrame?: (line: string, error: Error) => void;
  readonly onRequest?: (request: KimiWireRequest) => Promise<unknown> | unknown;
  readonly sendJson: (message: unknown) => void;
}

interface PendingRequest {
  readonly reject: (error: Error) => void;
  readonly resolve: (value: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class KimiWireRouter {
  private nextRequestId = 1;
  private readonly options: KimiWireRouterOptions;
  private readonly pendingRequests = new Map<string | number, PendingRequest>();

  constructor(options: KimiWireRouterOptions) {
    this.options = options;
  }

  handleLine(line: string): void {
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch (error) {
      this.options.onMalformedFrame?.(
        line,
        error instanceof Error ? error : new Error(String(error))
      );
      return;
    }

    if (!isRecord(message)) {
      this.options.onMalformedFrame?.(
        line,
        new Error("Kimi Wire frame is not a JSON object.")
      );
      return;
    }

    if ("id" in message && ("result" in message || "error" in message)) {
      this.handleResponse(message);
      return;
    }

    if (typeof message.method === "string") {
      if (typeof message.id === "string" || typeof message.id === "number") {
        this.handleAgentRequest({
          id: message.id,
          method: message.method,
          params: message.params,
        });
        return;
      }
      this.options.onEvent?.(message);
    }
  }

  notify(method: string, params?: unknown): void {
    this.options.sendJson({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  request(method: string, params?: unknown): Promise<unknown> {
    const id = String(this.nextRequestId);
    this.nextRequestId += 1;
    const message = {
      id,
      jsonrpc: "2.0",
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { reject, resolve });
      this.options.sendJson(message);
    });
  }

  private handleAgentRequest(request: KimiWireRequest): void {
    Promise.resolve(this.options.onRequest?.(request))
      .then((result) => {
        this.options.sendJson({
          id: request.id,
          jsonrpc: "2.0",
          result: result ?? {},
        });
      })
      .catch((error) => {
        this.options.sendJson({
          error: {
            code: -32_603,
            message: error instanceof Error ? error.message : String(error),
          },
          id: request.id,
          jsonrpc: "2.0",
        });
      });
  }

  private handleResponse(message: Record<string, unknown>): void {
    if (typeof message.id !== "string" && typeof message.id !== "number") {
      return;
    }
    const id = typeof message.id === "number" ? String(message.id) : message.id;
    const pending = this.pendingRequests.get(id);
    if (!pending) {
      return;
    }
    this.pendingRequests.delete(id);

    if (isRecord(message.error)) {
      const code =
        typeof message.error.code === "number" ? message.error.code : undefined;
      const errorMessage =
        typeof message.error.message === "string"
          ? message.error.message
          : "Kimi Wire request failed.";
      pending.reject(
        createKimiWireRequestError(code, errorMessage, message.error.data)
      );
      return;
    }

    pending.resolve(message.result);
  }
}

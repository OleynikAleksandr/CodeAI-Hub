import http from "node:http";
import net from "node:net";
import tls from "node:tls";
import type {
  NativeRequestCaptureFailureReason,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureProxyEvent,
  NativeRequestCaptureProxyHandle,
  NativeRequestCaptureProxyResult,
  NativeRequestCaptureRequest,
  NativeRequestCaptureTargetRule,
  NativeRequestCaptureTlsCredentials,
} from "./native-request-capture-types";
import {
  buildWebSocketUpgradeResponse,
  isWebSocketUpgradeRequest,
  parseWebSocketClientFrame,
} from "./native-request-capture-websocket";

const DEFAULT_TIMEOUT_MS = 30_000;
const HTTP_HEADER_SEPARATOR = "\r\n\r\n";
const LOCAL_PROXY_HOST = "127.0.0.1";

interface NativeRequestCaptureProxyOptions {
  readonly captureId: string;
  readonly onEvent?: (event: NativeRequestCaptureProxyEvent) => void;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly resolveTlsCredentials: (params: {
    readonly hostname: string;
    readonly target: string;
  }) =>
    | NativeRequestCaptureTlsCredentials
    | Promise<NativeRequestCaptureTlsCredentials>;
  readonly targetRules: readonly NativeRequestCaptureTargetRule[];
  readonly timeoutMs?: number;
}

interface ParsedHttpRequest {
  readonly body: unknown;
  readonly bodyText: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
}

interface PendingCapture {
  readonly promise: Promise<NativeRequestCaptureProxyResult>;
  readonly resolve: (result: NativeRequestCaptureProxyResult) => void;
  readonly timeout: NodeJS.Timeout;
}

export class NativeRequestCaptureProxy {
  readonly #options: NativeRequestCaptureProxyOptions;
  readonly #sockets = new Set<net.Socket>();
  #pendingCapture: PendingCapture | null = null;
  #server: http.Server | null = null;

  constructor(options: NativeRequestCaptureProxyOptions) {
    this.#options = options;
  }

  async start(): Promise<NativeRequestCaptureProxyHandle> {
    if (this.#server) {
      throw new Error("Native request capture proxy is already started");
    }

    const server = http.createServer();
    this.#server = server;
    this.#pendingCapture = this.#createPendingCapture();
    server.on("connect", (request, socket, head) => {
      if (!(socket instanceof net.Socket)) {
        socket.destroy();
        return;
      }
      this.#handleConnect(request, socket, head).catch(() => {
        socket.destroy();
      });
    });
    server.on("clientError", (_error, socket) => {
      socket.destroy();
    });

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, LOCAL_PROXY_HOST, () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address();
    if (!isTcpAddress(address)) {
      throw new Error("Native request capture proxy failed to bind TCP port");
    }

    const proxyUrl = `http://${LOCAL_PROXY_HOST}:${address.port}`;
    this.#emit({
      type: "proxy_listening",
      captureId: this.#options.captureId,
      providerId: this.#options.providerId,
      proxyUrl,
    });

    return {
      captureId: this.#options.captureId,
      port: address.port,
      proxyUrl,
      stop: () => this.stop(),
      waitForCapture: () =>
        this.#pendingCapture?.promise ??
        Promise.resolve({
          status: "failed",
          reason: "runtime_failed",
        }),
    };
  }

  async stop(): Promise<void> {
    const pending = this.#consumePendingCapture();
    pending?.resolve({ status: "failed", reason: "runtime_failed" });
    const server = this.#server;
    this.#server = null;
    for (const socket of this.#sockets) {
      socket.destroy();
    }
    this.#sockets.clear();
    if (!server?.listening) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  async #handleConnect(
    request: http.IncomingMessage,
    socket: net.Socket,
    head: Buffer
  ): Promise<void> {
    const target = request.url ?? "";
    this.#trackSocket(socket);
    this.#emit({
      type: "proxy_connect",
      captureId: this.#options.captureId,
      providerId: this.#options.providerId,
      target,
    });

    const connectRule = this.#findConnectRule(target);
    if (!connectRule) {
      this.#emitIgnored(target, "target_not_configured");
      socket.end("HTTP/1.1 502 CodeAI Hub capture target ignored\r\n\r\n");
      return;
    }

    const hostname = parseConnectTarget(target).hostname;
    const credentials = await this.#resolveCredentials(hostname, target);
    if (!credentials) {
      socket.end("HTTP/1.1 502 TLS credentials unavailable\r\n\r\n");
      this.#completeFailure("tls_credentials_unavailable");
      return;
    }

    socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
    if (head.length > 0) {
      socket.unshift(head);
    }
    const tlsSocket = new tls.TLSSocket(socket, {
      isServer: true,
      secureContext: tls.createSecureContext(credentials),
    });
    this.#trackSocket(tlsSocket);
    this.#readTlsRequest(tlsSocket, target, connectRule);
  }

  #readTlsRequest(
    tlsSocket: tls.TLSSocket,
    target: string,
    connectRule: NativeRequestCaptureTargetRule
  ): void {
    const chunks: Buffer[] = [];
    const handleHttpData = (chunk: Buffer) => {
      chunks.push(chunk);
      const parsed = parseHttpRequest(Buffer.concat(chunks));
      if (!parsed) {
        return;
      }

      if (!requestMatchesRule(parsed, connectRule)) {
        this.#emitIgnored(target, "request_path_not_matched", parsed);
        tlsSocket.end();
        return;
      }

      if (isWebSocketUpgradeRequest(parsed)) {
        tlsSocket.off("data", handleHttpData);
        this.#captureWebSocketFrame(tlsSocket, target, parsed);
        return;
      }

      const capturedRequest: NativeRequestCaptureRequest = {
        ...parsed,
        captureId: this.#options.captureId,
        providerId: this.#options.providerId,
        target,
        timestamp: new Date().toISOString(),
      };
      this.#emit({
        type: "request_captured",
        captureId: this.#options.captureId,
        providerId: this.#options.providerId,
        request: capturedRequest,
      });
      tlsSocket.end(buildCapturedResponse());
      this.#completeCaptured(capturedRequest);
    };
    tlsSocket.on("data", handleHttpData);
    tlsSocket.on("error", () => {
      this.#emitIgnored(target, "tls_socket_error");
    });
  }

  #captureWebSocketFrame(
    tlsSocket: tls.TLSSocket,
    target: string,
    request: ParsedHttpRequest
  ): void {
    const response = buildWebSocketUpgradeResponse(request.headers);
    if (!response) {
      this.#completeFailure("runtime_failed");
      return;
    }

    let buffer = Buffer.alloc(0);
    tlsSocket.write(response);
    tlsSocket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      const frame = parseWebSocketClientFrame(buffer);
      if (!frame) {
        return;
      }
      const capturedRequest: NativeRequestCaptureRequest = {
        ...request,
        body: frame.body,
        bodyText: frame.bodyText,
        captureId: this.#options.captureId,
        providerId: this.#options.providerId,
        target,
        timestamp: new Date().toISOString(),
      };
      this.#emit({
        type: "request_captured",
        captureId: this.#options.captureId,
        providerId: this.#options.providerId,
        request: capturedRequest,
      });
      tlsSocket.end();
      this.#completeCaptured(capturedRequest);
    });
  }

  #createPendingCapture(): PendingCapture {
    let resolveCapture: PendingCapture["resolve"] | null = null;
    const promise = new Promise<NativeRequestCaptureProxyResult>((resolve) => {
      resolveCapture = resolve;
    });
    const timeout = setTimeout(() => {
      this.#completeTimeout();
    }, this.#options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    return {
      promise,
      resolve: (result) => resolveCapture?.(result),
      timeout,
    };
  }

  #completeCaptured(request: NativeRequestCaptureRequest): void {
    const pending = this.#consumePendingCapture();
    if (!pending) {
      return;
    }
    pending.resolve({ status: "captured", request });
    this.#emit({
      type: "capture_end",
      captureId: this.#options.captureId,
      providerId: this.#options.providerId,
      reason: null,
      status: "captured",
    });
  }

  #completeFailure(reason: NativeRequestCaptureFailureReason): void {
    const pending = this.#consumePendingCapture();
    if (!pending) {
      return;
    }
    pending.resolve({ status: "failed", reason });
    this.#emit({
      type: "capture_end",
      captureId: this.#options.captureId,
      providerId: this.#options.providerId,
      reason,
      status: "failed",
    });
  }

  #completeTimeout(): void {
    const pending = this.#consumePendingCapture();
    if (!pending) {
      return;
    }
    pending.resolve({ status: "timeout", reason: "timeout" });
    this.#emit({
      type: "capture_end",
      captureId: this.#options.captureId,
      providerId: this.#options.providerId,
      reason: "timeout",
      status: "timeout",
    });
    this.stop().catch(() => undefined);
  }

  #consumePendingCapture(): PendingCapture | null {
    const pending = this.#pendingCapture;
    if (!pending) {
      return null;
    }
    clearTimeout(pending.timeout);
    this.#pendingCapture = null;
    return pending;
  }

  #emit(event: NativeRequestCaptureProxyEvent): void {
    this.#options.onEvent?.(event);
  }

  #emitIgnored(
    target: string,
    reason: string,
    request?: ParsedHttpRequest
  ): void {
    this.#emit({
      type: "request_ignored",
      captureId: this.#options.captureId,
      method: request?.method,
      path: request?.path,
      providerId: this.#options.providerId,
      reason,
      target,
    });
  }

  #findConnectRule(target: string): NativeRequestCaptureTargetRule | null {
    const parsed = parseConnectTarget(target);
    if (!parsed.hostname) {
      return null;
    }
    return (
      this.#options.targetRules.find((rule) => {
        const expectedPort = rule.port ?? 443;
        return rule.host === parsed.hostname && expectedPort === parsed.port;
      }) ?? null
    );
  }

  async #resolveCredentials(
    hostname: string,
    target: string
  ): Promise<NativeRequestCaptureTlsCredentials | null> {
    try {
      return await this.#options.resolveTlsCredentials({ hostname, target });
    } catch {
      return null;
    }
  }

  #trackSocket(socket: net.Socket): void {
    this.#sockets.add(socket);
    socket.once("close", () => {
      this.#sockets.delete(socket);
    });
  }
}

const isTcpAddress = (
  address: string | net.AddressInfo | null
): address is net.AddressInfo =>
  typeof address === "object" && address !== null && "port" in address;

const parseConnectTarget = (
  target: string
): { readonly hostname: string; readonly port: number } => {
  const [hostname = "", portRaw = "443"] = target.split(":");
  const port = Number.parseInt(portRaw, 10);
  return {
    hostname,
    port: Number.isFinite(port) ? port : 443,
  };
};

const parseHttpRequest = (buffer: Buffer): ParsedHttpRequest | null => {
  const headerEnd = buffer.indexOf(HTTP_HEADER_SEPARATOR);
  if (headerEnd < 0) {
    return null;
  }

  const headerText = buffer.subarray(0, headerEnd).toString("utf8");
  const [requestLine = "", ...headerLines] = headerText.split("\r\n");
  const [method = "", path = ""] = requestLine.split(" ");
  const headers = parseHeaders(headerLines);
  const contentLength = Number.parseInt(headers["content-length"] ?? "0", 10);
  const safeContentLength = Number.isFinite(contentLength) ? contentLength : 0;
  const bodyStart = headerEnd + HTTP_HEADER_SEPARATOR.length;
  const bodyEnd = bodyStart + safeContentLength;
  if (buffer.length < bodyEnd) {
    return null;
  }

  const bodyText = buffer.subarray(bodyStart, bodyEnd).toString("utf8");
  return {
    body: parseBody(bodyText),
    bodyText,
    headers,
    method,
    path,
  };
};

const parseHeaders = (
  headerLines: readonly string[]
): Readonly<Record<string, string>> => {
  const headers: Record<string, string> = {};
  for (const line of headerLines) {
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const name = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (name) {
      headers[name] = value;
    }
  }
  return headers;
};

const parseBody = (bodyText: string): unknown => {
  if (!bodyText.trim()) {
    return null;
  }
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
};

const requestMatchesRule = (
  request: ParsedHttpRequest,
  rule: NativeRequestCaptureTargetRule
): boolean => {
  if (!rule.pathIncludes) {
    return true;
  }
  return request.path.includes(rule.pathIncludes);
};

const buildCapturedResponse = (): string => {
  const body = "CodeAI Hub captured this diagnostic request locally.\n";
  return [
    "HTTP/1.1 502 CodeAI Hub Native Request Captured",
    "Content-Type: text/plain; charset=utf-8",
    `Content-Length: ${Buffer.byteLength(body)}`,
    "Connection: close",
    "",
    body,
  ].join("\r\n");
};

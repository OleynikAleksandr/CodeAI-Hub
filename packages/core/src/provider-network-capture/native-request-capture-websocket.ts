import { createHash } from "node:crypto";

const CLIENT_FRAME_MASK_LENGTH = 4;
const EXTENDED_16BIT_LENGTH = 126;
const EXTENDED_64BIT_LENGTH = 127;
const MAX_FRAME_LENGTH = 1024 * 1024;
const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

export interface ParsedWebSocketFrame {
  readonly body: unknown;
  readonly bodyText: string;
  readonly bytesConsumed: number;
  readonly opcode: number;
}

export interface WebSocketUpgradeRequest {
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
}

export const isWebSocketUpgradeRequest = (
  request: WebSocketUpgradeRequest
): boolean =>
  request.method.toUpperCase() === "GET" &&
  readHeader(request.headers, "upgrade")?.toLowerCase() === "websocket";

export const buildWebSocketUpgradeResponse = (
  headers: Readonly<Record<string, string>>
): string | null => {
  const key = readHeader(headers, "sec-websocket-key");
  if (!key) {
    return null;
  }
  const accept = createHash("sha1")
    .update(`${key}${WEBSOCKET_GUID}`)
    .digest("base64");
  return [
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    "",
  ].join("\r\n");
};

export const parseWebSocketClientFrame = (
  buffer: Buffer
): ParsedWebSocketFrame | null => {
  if (buffer.length < 2) {
    return null;
  }
  const opcode = buffer[0] % 16;
  const secondByte = buffer[1];
  const masked = secondByte >= 128;
  let payloadLength = secondByte % 128;
  let offset = 2;

  if (payloadLength === EXTENDED_16BIT_LENGTH) {
    if (buffer.length < offset + 2) {
      return null;
    }
    payloadLength = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (payloadLength === EXTENDED_64BIT_LENGTH) {
    if (buffer.length < offset + 8) {
      return null;
    }
    const bigLength = buffer.readBigUInt64BE(offset);
    if (bigLength > BigInt(MAX_FRAME_LENGTH)) {
      throw new Error("Native request capture WebSocket frame is too large");
    }
    payloadLength = Number(bigLength);
    offset += 8;
  }

  if (!masked || payloadLength > MAX_FRAME_LENGTH) {
    throw new Error("Invalid provider WebSocket client frame");
  }
  if (buffer.length < offset + CLIENT_FRAME_MASK_LENGTH + payloadLength) {
    return null;
  }

  const mask = buffer.subarray(offset, offset + CLIENT_FRAME_MASK_LENGTH);
  offset += CLIENT_FRAME_MASK_LENGTH;
  const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));
  for (let index = 0; index < payload.length; index += 1) {
    // biome-ignore lint/suspicious/noBitwiseOperators: WebSocket client masking is defined as byte-wise XOR.
    payload[index] ^= mask[index % CLIENT_FRAME_MASK_LENGTH];
  }
  const bodyText = payload.toString("utf8");
  return {
    body: parsePayload(bodyText),
    bodyText,
    bytesConsumed: offset + payloadLength,
    opcode,
  };
};

const readHeader = (
  headers: Readonly<Record<string, string>>,
  name: string
): string | null => headers[name.toLowerCase()] ?? null;

const parsePayload = (bodyText: string): unknown => {
  if (!bodyText.trim()) {
    return null;
  }
  try {
    return JSON.parse(bodyText) as unknown;
  } catch {
    return bodyText;
  }
};

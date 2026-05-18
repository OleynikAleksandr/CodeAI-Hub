import type { KimiSessionEvent } from "../provider/kimi-provider-adapter";
import type { KimiWireRequest } from "../wire/kimi-wire-router";

export type KimiFailureKind =
  | "auth"
  | "quota"
  | "service"
  | "unknown"
  | "unsupported_model";

export interface KimiWireFailureMetadata {
  readonly code?: number;
  readonly kind: KimiFailureKind;
  readonly message: string;
}

class KimiWireRequestError extends Error {
  readonly code?: number;
  readonly data?: unknown;
  readonly kind: KimiFailureKind;

  constructor(metadata: KimiWireFailureMetadata, data?: unknown) {
    super(metadata.message);
    this.name = "KimiWireRequestError";
    this.code = metadata.code;
    this.data = data;
    this.kind = metadata.kind;
  }
}

const classifyKimiFailure = (
  code: number | undefined,
  message: string
): KimiFailureKind => {
  const normalizedMessage = message.toLowerCase();
  if (code === -32_001 || normalizedMessage.includes("login")) {
    return "auth";
  }
  if (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate")
  ) {
    return "quota";
  }
  if (code === -32_002 || normalizedMessage.includes("not supported")) {
    return "unsupported_model";
  }
  if (code === -32_003 || normalizedMessage.includes("service")) {
    return "service";
  }
  return "unknown";
};

export const createKimiWireRequestError = (
  code: number | undefined,
  message: string,
  data?: unknown
): KimiWireRequestError =>
  new KimiWireRequestError(
    {
      code,
      kind: classifyKimiFailure(code, message),
      message,
    },
    data
  );

export const normalizeKimiWireRequest = (
  request: KimiWireRequest
): KimiSessionEvent => ({
  payload: {
    id: request.id,
    params: request.params,
    provider: "kimi",
    requestType: extractWireRequestType(request.params),
  },
  type: "provider_request",
});

const extractWireRequestType = (params: unknown): string => {
  if (
    typeof params === "object" &&
    params !== null &&
    "type" in params &&
    typeof params.type === "string"
  ) {
    return params.type;
  }
  return "unknown";
};

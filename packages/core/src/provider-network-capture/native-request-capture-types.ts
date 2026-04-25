export type NativeRequestCaptureProviderId = "claude" | "codex";

export type NativeRequestCaptureFailureReason =
  | "provider_not_ready"
  | "provider_not_supported"
  | "runtime_failed"
  | "target_not_seen"
  | "timeout"
  | "tls_credentials_unavailable"
  | "tls_trust_failed";

export interface NativeRequestCaptureTargetRule {
  readonly host: string;
  readonly minimumToolCount?: number;
  readonly pathIncludes?: string;
  readonly port?: number;
}

export interface NativeRequestCaptureTlsCredentials {
  readonly ca?: Buffer | string;
  readonly cert: Buffer | string;
  readonly key: Buffer | string;
}

export interface NativeRequestCaptureRequest {
  readonly body: unknown;
  readonly bodyText: string;
  readonly captureId: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly method: string;
  readonly path: string;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly target: string;
  readonly timestamp: string;
}

export type NativeRequestCaptureProxyEvent =
  | {
      readonly captureId: string;
      readonly providerId: NativeRequestCaptureProviderId;
      readonly proxyUrl: string;
      readonly type: "proxy_listening";
    }
  | {
      readonly captureId: string;
      readonly providerId: NativeRequestCaptureProviderId;
      readonly target: string;
      readonly type: "proxy_connect";
    }
  | {
      readonly body?: unknown;
      readonly bodyText?: string;
      readonly captureId: string;
      readonly headers?: Readonly<Record<string, string>>;
      readonly method?: string;
      readonly path?: string;
      readonly providerId: NativeRequestCaptureProviderId;
      readonly reason: string;
      readonly target: string;
      readonly type: "request_ignored";
    }
  | {
      readonly captureId: string;
      readonly providerId: NativeRequestCaptureProviderId;
      readonly request: NativeRequestCaptureRequest;
      readonly type: "request_captured";
    }
  | {
      readonly captureId: string;
      readonly providerId: NativeRequestCaptureProviderId;
      readonly reason: NativeRequestCaptureFailureReason | null;
      readonly status: "captured" | "failed" | "timeout";
      readonly type: "capture_end";
    };

export type NativeRequestCaptureProxyResult =
  | {
      readonly request: NativeRequestCaptureRequest;
      readonly status: "captured";
    }
  | {
      readonly reason: NativeRequestCaptureFailureReason;
      readonly status: "failed" | "timeout";
    };

export interface NativeRequestCaptureProxyHandle {
  readonly captureId: string;
  readonly port: number;
  readonly proxyUrl: string;
  stop(): Promise<void>;
  waitForCapture(): Promise<NativeRequestCaptureProxyResult>;
}

export type NativeRequestCaptureProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmClaudeCode"
  | "glmOpenCode";

export type NativeRequestCaptureMode = "managed" | "vanilla";

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

export interface NativeRequestCaptureStartRecord {
  readonly appliedTurnConfig: unknown;
  readonly captureId: string;
  readonly mode: NativeRequestCaptureMode;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly releaseVersion: string;
  readonly scenarioMetadata: unknown;
  readonly selectedModelId: string | null;
  readonly sentUpstream: false;
  readonly timestamp: string;
  readonly type: "capture_start";
}

export interface NativeRequestCaptureClaudeAppliedInputEnvelope {
  readonly allowDangerouslySkipPermissions: boolean | null;
  readonly cwd: string | null;
  readonly hasSystemPrompt: boolean;
  readonly kind: "claude";
  readonly permissionMode: string | null;
  readonly settingSources: readonly string[] | null;
  readonly toolCount: number;
}

export interface NativeRequestCaptureCodexAppliedInputEnvelope {
  readonly approvalPolicy: string | null;
  readonly kind: "codex";
  readonly modelReasoningSummary: string | null;
  readonly persistExtendedHistory: boolean | null;
  readonly processProfileKey: string | null;
  readonly providerHomeOverrides: Readonly<
    Record<string, string | null>
  > | null;
  readonly sandbox: string | null;
}

export interface NativeRequestCaptureKimiAppliedInputEnvelope {
  readonly kind: "kimi";
  readonly providerHomePath: string | null;
  readonly selectedModelId: string | null;
  readonly userConfigPath: string | null;
  readonly wireJsonlPath: string | null;
}

export interface NativeRequestCaptureGlmOpenCodeAppliedInputEnvelope {
  readonly kind: "glm-opencode";
  readonly modelSelector: string;
  readonly userConfigPath: string;
}

export type NativeRequestCaptureAppliedInputEnvelope =
  | NativeRequestCaptureClaudeAppliedInputEnvelope
  | NativeRequestCaptureCodexAppliedInputEnvelope
  | NativeRequestCaptureKimiAppliedInputEnvelope
  | NativeRequestCaptureGlmOpenCodeAppliedInputEnvelope;

export interface NativeRequestCaptureAppliedInputEnvelopeRecord {
  readonly captureId: string;
  readonly envelope: NativeRequestCaptureAppliedInputEnvelope;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly sentUpstream: false;
  readonly timestamp: string;
  readonly type: "applied_input_envelope";
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

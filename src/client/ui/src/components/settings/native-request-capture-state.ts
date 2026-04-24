import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type { CodexModelId } from "../../../../../types/codex-model-registry";

export type NativeRequestCaptureProviderId = "claude" | "codex";
export type NativeRequestCaptureModelId = ClaudeModelAliasId | CodexModelId;
export type NativeRequestCaptureStatus =
  | "idle"
  | "running"
  | "success"
  | "error";

export interface NativeRequestCaptureState {
  readonly activeModelId: NativeRequestCaptureModelId | null;
  readonly activeProvider: NativeRequestCaptureProviderId | null;
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly modelId: NativeRequestCaptureModelId | null;
  readonly providerId: NativeRequestCaptureProviderId | null;
  readonly status: NativeRequestCaptureStatus;
}

export interface NativeRequestCaptureResult {
  readonly error?: string | null;
  readonly jsonlPath?: string | null;
  readonly markdownPath?: string | null;
  readonly modelId?: NativeRequestCaptureModelId | null;
  readonly ok: boolean;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly reason?: string | null;
  readonly type?: string;
}

export const createNativeRequestCaptureState =
  (): NativeRequestCaptureState => ({
    activeModelId: null,
    activeProvider: null,
    error: null,
    jsonlPath: null,
    markdownPath: null,
    modelId: null,
    providerId: null,
    status: "idle",
  });

export const startNativeRequestCapture = (
  providerId: NativeRequestCaptureProviderId,
  modelId?: NativeRequestCaptureModelId
): NativeRequestCaptureState => ({
  activeModelId: modelId ?? null,
  activeProvider: providerId,
  error: null,
  jsonlPath: null,
  markdownPath: null,
  modelId: modelId ?? null,
  providerId,
  status: "running",
});

export const completeNativeRequestCapture = (
  result: NativeRequestCaptureResult
): NativeRequestCaptureState => ({
  activeModelId: null,
  activeProvider: null,
  error: result.ok ? null : (result.error ?? result.reason ?? "capture_failed"),
  jsonlPath: result.jsonlPath ?? null,
  markdownPath: result.markdownPath ?? null,
  modelId: result.modelId ?? null,
  providerId: result.providerId,
  status: result.ok ? "success" : "error",
});

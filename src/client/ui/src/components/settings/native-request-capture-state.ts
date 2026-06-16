import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type { CodexModelId } from "../../../../../types/codex-model-registry";
import type { KimiModelId } from "../../../../../types/kimi-model-registry";

export type NativeRequestCaptureProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmOpenCode";
type GlmOpenCodeModelId = "zai-coding-plan/glm-5.2" | "kimi-for-coding/k2p7";
export type NativeRequestCaptureModelId =
  | ClaudeModelAliasId
  | CodexModelId
  | KimiModelId
  | GlmOpenCodeModelId;
export type NativeRequestCaptureScenarioId =
  | "description"
  | "virtual_simulation"
  | "diagram_modules"
  | "translation"
  | "diagnostic_probe";
export type NativeRequestCaptureStatus =
  | "idle"
  | "running"
  | "success"
  | "error";

export interface NativeRequestCaptureState {
  readonly activeModelId: NativeRequestCaptureModelId | null;
  readonly activeProvider: NativeRequestCaptureProviderId | null;
  readonly activeScenarioId: NativeRequestCaptureScenarioId | null;
  readonly error: string | null;
  readonly jsonlPath: string | null;
  readonly markdownPath: string | null;
  readonly modelId: NativeRequestCaptureModelId | null;
  readonly providerId: NativeRequestCaptureProviderId | null;
  readonly scenarioId: NativeRequestCaptureScenarioId | null;
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
  readonly scenarioId?: NativeRequestCaptureScenarioId | null;
  readonly type?: string;
}

export const createNativeRequestCaptureState =
  (): NativeRequestCaptureState => ({
    activeModelId: null,
    activeProvider: null,
    activeScenarioId: null,
    error: null,
    jsonlPath: null,
    markdownPath: null,
    modelId: null,
    providerId: null,
    scenarioId: null,
    status: "idle",
  });

export const startNativeRequestCapture = (
  providerId: NativeRequestCaptureProviderId,
  modelId?: NativeRequestCaptureModelId,
  scenarioId?: NativeRequestCaptureScenarioId
): NativeRequestCaptureState => ({
  activeModelId: modelId ?? null,
  activeProvider: providerId,
  activeScenarioId: scenarioId ?? null,
  error: null,
  jsonlPath: null,
  markdownPath: null,
  modelId: modelId ?? null,
  providerId,
  scenarioId: scenarioId ?? null,
  status: "running",
});

export const completeNativeRequestCapture = (
  result: NativeRequestCaptureResult
): NativeRequestCaptureState => ({
  activeModelId: null,
  activeProvider: null,
  activeScenarioId: null,
  error: result.ok ? null : (result.error ?? result.reason ?? "capture_failed"),
  jsonlPath: result.jsonlPath ?? null,
  markdownPath: result.markdownPath ?? null,
  modelId: result.modelId ?? null,
  providerId: result.providerId,
  scenarioId: result.scenarioId ?? null,
  status: result.ok ? "success" : "error",
});

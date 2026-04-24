import type { NativeRequestCaptureModelId, NativeRequestCaptureProviderId } from "../../../ui/src/components/settings/use-settings-state-support";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import type { UseProjectManagerSettingsResult } from "./use-project-manager-settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isNativeRequestCaptureProviderId = (
  value: unknown
): value is NativeRequestCaptureProviderId =>
  value === "claude" || value === "codex";

export const handleProjectManagerSettingsHostMessage = (params: {
  readonly handleNativeRequestCapture: (
    providerId: NativeRequestCaptureProviderId,
    modelId: NativeRequestCaptureModelId
  ) => void;
  readonly message: unknown;
  readonly settings: Settings;
  readonly transport: UseProjectManagerSettingsResult;
}): void => {
  if (!isRecord(params.message) || typeof params.message.type !== "string") {
    return;
  }
  if (params.message.type === "settings:open-user-glossary-file") {
    params.transport.openUserGlossaryFile();
  }
  if (
    params.message.type === "settings:native-request-capture" &&
    isNativeRequestCaptureProviderId(params.message.providerId)
  ) {
    const defaultModelId =
      params.message.providerId === "claude"
        ? params.settings.providers.claude.defaultModel
        : params.settings.providers.codex.defaultModel;
    const modelId =
      typeof params.message.modelId === "string" &&
      params.message.modelId.trim().length > 0
        ? (params.message.modelId as NativeRequestCaptureModelId)
        : defaultModelId;
    params.handleNativeRequestCapture(params.message.providerId, modelId);
  }
};

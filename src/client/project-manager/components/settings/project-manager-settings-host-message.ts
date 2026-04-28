import type {
  NativeRequestCaptureModelId,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureScenarioId,
} from "../../../ui/src/components/settings/use-settings-state-support";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import type { SettingsTemplateUpdateResolutionAction } from "../../core-stream-message-types";
import type { UseProjectManagerSettingsResult } from "./use-project-manager-settings";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isNativeRequestCaptureProviderId = (
  value: unknown
): value is NativeRequestCaptureProviderId =>
  value === "claude" || value === "codex";

const isTemplateUpdateResolutionAction = (
  value: unknown
): value is SettingsTemplateUpdateResolutionAction =>
  value === "backup-and-replace" ||
  value === "preserve-current" ||
  value === "replace-with-incoming";

const isNativeRequestCaptureScenarioId = (
  value: unknown
): value is NativeRequestCaptureScenarioId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "translation" ||
  value === "diagnostic_probe";

export const handleProjectManagerSettingsHostMessage = (params: {
  readonly handleNativeRequestCapture: (
    providerId: NativeRequestCaptureProviderId,
    modelId: NativeRequestCaptureModelId,
    scenarioId: NativeRequestCaptureScenarioId
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
  if (params.message.type === "settings:template-updates") {
    params.transport.loadTemplateUpdates();
  }
  if (
    params.message.type === "settings:template-update:resolve" &&
    typeof params.message.id === "string" &&
    isTemplateUpdateResolutionAction(params.message.action)
  ) {
    params.transport.resolveTemplateUpdate(
      params.message.id,
      params.message.action
    );
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
    const scenarioId = isNativeRequestCaptureScenarioId(params.message.scenarioId)
      ? params.message.scenarioId
      : "description";
    params.handleNativeRequestCapture(
      params.message.providerId,
      modelId,
      scenarioId
    );
  }
};

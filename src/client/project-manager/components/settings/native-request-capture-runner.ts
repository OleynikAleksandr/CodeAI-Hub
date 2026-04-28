import type { Dispatch, SetStateAction } from "react";
import type {
  NativeRequestCaptureModelId,
  NativeRequestCaptureProviderId,
  NativeRequestCaptureScenarioId,
  NativeRequestCaptureState,
} from "../../../ui/src/components/settings/use-settings-state-support";
import {
  completeNativeRequestCapture,
  startNativeRequestCapture,
} from "../../../ui/src/components/settings/use-settings-state-support";
import { api } from "../../api";
import type { SettingsLoadedPayload } from "../../core-stream-message-types";
import { buildNativeRequestCaptureScenarioPrompt } from "../../services/native-request-capture-scenario-prompt";

interface ProjectManagerNativeRequestCaptureParams {
  readonly modelId: NativeRequestCaptureModelId;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly settingsPayload: SettingsLoadedPayload | null;
  readonly workspaceName?: string;
  readonly workspacePath?: string;
  readonly workspaceSlug?: string | null;
}

type NativeRequestCaptureStateSetter = Dispatch<
  SetStateAction<NativeRequestCaptureState>
>;

const normalizeNativeRequestCaptureError = (error: unknown): string =>
  error instanceof Error ? error.message : "Native request capture failed.";

const runProjectManagerNativeRequestCapture = async (
  params: ProjectManagerNativeRequestCaptureParams
): Promise<void> => {
  if (params.scenarioId === "diagnostic_probe") {
    api.captureNativeRequest(params.providerId, params.modelId);
    return;
  }
  if (params.scenarioId === "translation") {
    api.captureNativeRequest(params.providerId, params.modelId, {
      scenarioId: params.scenarioId,
      scenarioLabel: "Translation",
    });
    return;
  }
  if (!(params.workspacePath && params.workspaceSlug)) {
    throw new Error("Select a workspace before running workflow capture.");
  }

  const scenario = await buildNativeRequestCaptureScenarioPrompt({
    getWorkflowState: api.getWorkflowState.bind(api),
    scenarioId: params.scenarioId,
    settingsPayload: params.settingsPayload,
    workspaceName: params.workspaceName,
    workspacePath: params.workspacePath,
    workspaceSlug: params.workspaceSlug,
  });
  api.captureNativeRequest(params.providerId, params.modelId, {
    scenarioId: scenario.scenarioId,
    scenarioInputPath: scenario.inputPath,
    scenarioLabel: scenario.scenarioLabel,
    scenarioPrompt: scenario.prompt,
    scenarioTargetPath: scenario.targetRelativePath,
    workspacePath: params.workspacePath,
  });
};

export const startProjectManagerNativeRequestCapture = (params: {
  readonly context: {
    readonly activeWorkspaceName?: string;
    readonly activeWorkspacePath?: string;
    readonly activeWorkspaceSlug?: string | null;
  };
  readonly modelId: NativeRequestCaptureModelId;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly setNativeRequestCapture: NativeRequestCaptureStateSetter;
}): void => {
  params.setNativeRequestCapture(
    startNativeRequestCapture(
      params.providerId,
      params.modelId,
      params.scenarioId
    )
  );
  void runProjectManagerNativeRequestCapture({
    modelId: params.modelId,
    providerId: params.providerId,
    scenarioId: params.scenarioId,
    settingsPayload: api.getLastSettingsPayload(),
    workspaceName: params.context.activeWorkspaceName,
    workspacePath: params.context.activeWorkspacePath,
    workspaceSlug: params.context.activeWorkspaceSlug,
  }).catch((error: unknown) => {
    params.setNativeRequestCapture(
      completeNativeRequestCapture({
        error: normalizeNativeRequestCaptureError(error),
        modelId: params.modelId,
        ok: false,
        providerId: params.providerId,
      })
    );
  });
};

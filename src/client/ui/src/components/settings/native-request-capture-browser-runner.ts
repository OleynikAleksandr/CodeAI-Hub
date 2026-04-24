import type { Dispatch, SetStateAction } from "react";
import vscode from "../../vscode";
import {
  type NativeRequestCaptureModelId,
  type NativeRequestCaptureProviderId,
  type NativeRequestCaptureScenarioId,
  type NativeRequestCaptureState,
  startNativeRequestCapture,
} from "./native-request-capture-state";

export const startBrowserNativeRequestCapture = (params: {
  readonly modelId: NativeRequestCaptureModelId;
  readonly providerId: NativeRequestCaptureProviderId;
  readonly scenarioId: NativeRequestCaptureScenarioId;
  readonly setNativeRequestCapture: Dispatch<
    SetStateAction<NativeRequestCaptureState>
  >;
}): void => {
  params.setNativeRequestCapture(
    startNativeRequestCapture(
      params.providerId,
      params.modelId,
      params.scenarioId
    )
  );
  vscode.postMessage({
    type: "settings:native-request-capture",
    modelId: params.modelId,
    providerId: params.providerId,
    scenarioId: params.scenarioId,
  });
};

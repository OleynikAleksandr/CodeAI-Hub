import { useMemo } from "react";
import type { SessionSnapshot } from "../../../../types/session";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import { SessionModelSwitcherFacade } from "../../../ui/src/session/model-switcher/session-model-switcher-facade";
import { SessionModelSwitchController } from "./session-model-switch-controller";

export interface SessionModelSwitchHandlers {
  readonly onSelectSessionModel: (sessionId: string, modelId: string) => void;
  readonly onSelectSessionReasoning: (
    sessionId: string,
    reasoningId: string
  ) => void;
}

export interface SessionModelSwitchFactoryOptions {
  readonly saveSettings: (settings: Settings) => void;
  readonly setSessionModel: (sessionId: string, targetModelId: string) => void;
  readonly settings: Settings;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}

const modelSwitcherFacade = new SessionModelSwitcherFacade();

export const createSessionModelSwitchHandlers = (
  options: SessionModelSwitchFactoryOptions
): SessionModelSwitchHandlers => {
  const controller = new SessionModelSwitchController({
    saveSettings: options.saveSettings,
    setSessionModel: options.setSessionModel,
  });

  const resolveModelState = (sessionId: string) => {
    const modelInfo = options.snapshots[sessionId]?.status.models?.[0] ?? null;
    if (!modelInfo) {
      return null;
    }
    return modelSwitcherFacade.buildState({
      modelInfo,
      providerId: modelInfo.providerId,
      settings: options.settings,
    });
  };

  return {
    onSelectSessionModel: (sessionId, modelId) => {
      const modelState = resolveModelState(sessionId);
      if (!modelState) {
        return;
      }
      controller.selectModel({
        modelId,
        providerId: modelState.providerId,
        sessionId,
        settings: options.settings,
      });
    },
    onSelectSessionReasoning: (sessionId, reasoningId) => {
      const modelState = resolveModelState(sessionId);
      if (!modelState) {
        return;
      }
      controller.selectReasoning({
        modelId: modelState.selectedModelId,
        providerId: modelState.providerId,
        reasoningId,
        sessionId,
        settings: options.settings,
      });
    },
  };
};

export const useSessionModelSwitch = (options: {
  readonly saveSettings: (settings: Settings) => void;
  readonly setSessionModel: (sessionId: string, targetModelId: string) => void;
  readonly settings: Settings;
  readonly snapshots: Readonly<Record<string, SessionSnapshot>>;
}): SessionModelSwitchHandlers =>
  useMemo(
    () =>
      createSessionModelSwitchHandlers({
        saveSettings: options.saveSettings,
        setSessionModel: options.setSessionModel,
        settings: options.settings,
        snapshots: options.snapshots,
      }),
    [
      options.saveSettings,
      options.setSessionModel,
      options.settings,
      options.snapshots,
    ]
  );

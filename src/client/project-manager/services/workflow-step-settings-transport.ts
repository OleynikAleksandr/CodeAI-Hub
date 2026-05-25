import { api } from "../api";
import type { SettingsLoadedPayload } from "../core-stream-message-types";
import type { Settings } from "../../ui/src/components/settings/settings-state-model";
import type { WorkspaceSettingsScopePayload } from "./project-manager-settings-client";

const SETTINGS_IO_TIMEOUT_MS = 5_000;

type WorkflowSettingsScope = WorkspaceSettingsScopePayload;

export type WorkflowSettingsLoader = (
  scope: WorkflowSettingsScope
) => Promise<SettingsLoadedPayload | null>;

export type WorkflowSettingsSaver = (
  settings: Settings,
  scope: WorkflowSettingsScope
) => Promise<void> | void;

export const loadWorkflowSettingsPayload: WorkflowSettingsLoader = (scope) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Settings load timed out before workflow start."));
    }, SETTINGS_IO_TIMEOUT_MS);
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type !== "settings:loaded") {
        return;
      }
      cleanup();
      resolve(message.payload as SettingsLoadedPayload);
    });
    api.loadSettings(scope);
  });

export const saveWorkflowSettingsAndWait: WorkflowSettingsSaver = (
  settings,
  scope
) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      unsubscribe();
    };
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("Settings save timed out before workflow start."));
    }, SETTINGS_IO_TIMEOUT_MS);
    const unsubscribe = api.onCoreEvent((message) => {
      if (message.type === "settings:saved") {
        cleanup();
        resolve();
        return;
      }
      if (message.type === "settings:save-error") {
        cleanup();
        const payload = message.payload;
        const error =
          payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "Settings save failed before workflow start.";
        reject(new Error(error));
      }
    });
    api.saveSettings(settings, scope);
  });

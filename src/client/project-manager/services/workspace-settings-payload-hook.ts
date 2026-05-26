import { useEffect, useState } from "react";
import { api } from "../api";
import type { SettingsLoadedPayload } from "../core-stream-message-types";
import {
  resolveWorkspaceSettingsScope,
  type WorkspaceSettingsScopePayload,
} from "./project-manager-settings-client";

type ScopedSettingsPayload = SettingsLoadedPayload & WorkspaceSettingsScopePayload;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isSettingsPayloadForScope = (
  payload: unknown,
  scope: WorkspaceSettingsScopePayload
): payload is ScopedSettingsPayload =>
  typeof scope.workspacePath === "string" &&
  typeof scope.workspaceSlug === "string" &&
  isRecord(payload) &&
  payload.workspacePath === scope.workspacePath &&
  payload.workspaceSlug === scope.workspaceSlug;

export const useWorkspaceSettingsPayload = (
  scope: WorkspaceSettingsScopePayload
): SettingsLoadedPayload | null => {
  const [payload, setPayload] = useState<SettingsLoadedPayload | null>(null);
  const workspacePath = scope.workspacePath ?? null;
  const workspaceSlug = scope.workspaceSlug ?? null;

  useEffect(() => {
    const resolvedScope = resolveWorkspaceSettingsScope({
      workspacePath,
      workspaceSlug,
    });
    if (!resolvedScope) {
      setPayload(null);
      return;
    }

    setPayload(null);
    const unsubscribe = api.onCoreEvent((message) => {
      if (
        (message.type !== "settings:loaded" &&
          message.type !== "settings:saved") ||
        !isSettingsPayloadForScope(message.payload, resolvedScope)
      ) {
        return;
      }
      setPayload(message.payload);
    });
    api.loadSettings(resolvedScope);
    return unsubscribe;
  }, [workspacePath, workspaceSlug]);

  return payload;
};

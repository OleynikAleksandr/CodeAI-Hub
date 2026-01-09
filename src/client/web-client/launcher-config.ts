import type { CoreBridgeConfig } from "../ui/src/core-bridge/types";

export type CoreBridgeConfigWithWorkspace = CoreBridgeConfig & {
  readonly workspacePath?: string;
};

export type LauncherConfig = {
  readonly httpUrl?: string;
  readonly wsUrl?: string;
  readonly workspacePath?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const mergeLauncherConfig = (
  coreConfig: CoreBridgeConfigWithWorkspace | undefined,
  launcherConfig: unknown
): CoreBridgeConfigWithWorkspace | null => {
  if (!isRecord(launcherConfig)) {
    return null;
  }

  const workspacePath =
    typeof launcherConfig.workspacePath === "string"
      ? launcherConfig.workspacePath
      : coreConfig?.workspacePath;
  const httpUrl =
    typeof launcherConfig.httpUrl === "string"
      ? launcherConfig.httpUrl
      : coreConfig?.httpUrl;
  const wsUrl =
    typeof launcherConfig.wsUrl === "string"
      ? launcherConfig.wsUrl
      : coreConfig?.wsUrl;

  if (httpUrl && wsUrl) {
    return { httpUrl, wsUrl, workspacePath };
  }

  if (workspacePath && coreConfig && !coreConfig.workspacePath) {
    return { ...coreConfig, workspacePath };
  }

  return null;
};

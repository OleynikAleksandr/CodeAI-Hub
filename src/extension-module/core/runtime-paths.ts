import path from "node:path";
import type { PlatformKey } from "../cef/platform";

export const resolveNodeExecutable = (
  runtimeDir: string,
  platform: PlatformKey
): string => {
  if (platform === "win32-x64") {
    return path.join(runtimeDir, "node", "node.exe");
  }
  return path.join(runtimeDir, "node", "bin", "node");
};

export const resolveEntryPoint = (runtimeDir: string): string =>
  path.join(runtimeDir, "app", "dist", "index.js");

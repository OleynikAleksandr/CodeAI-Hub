import path from "node:path";
import type { PlatformKey } from "./runtime-installer";

const MACOS_APP_BINARY = path.join(
  "CodeAIHubLauncher.app",
  "Contents",
  "MacOS",
  "CodeAIHubLauncher"
);

const WINDOWS_EXECUTABLE = path.join(
  "CodeAIHubLauncher",
  "CodeAIHubLauncher.exe"
);

const LINUX_EXECUTABLE = "codeai-hub-launcher";

const platformExecutableMap: Record<PlatformKey, string> = {
  "darwin-arm64": MACOS_APP_BINARY,
  "darwin-x64": MACOS_APP_BINARY,
  "win32-arm64": WINDOWS_EXECUTABLE,
  "win32-x64": WINDOWS_EXECUTABLE,
  "linux-x64": LINUX_EXECUTABLE,
};

export const getLauncherExecutableRelativePath = (
  platform: PlatformKey
): string => platformExecutableMap[platform];

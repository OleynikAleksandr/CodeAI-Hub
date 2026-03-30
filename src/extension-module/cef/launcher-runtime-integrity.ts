import path from "node:path";
import { getLauncherExecutableRelativePath } from "./launcher-paths";
import type { PlatformKey } from "./platform";

const MACOS_FRAMEWORK_BINARY = path.join(
  "CodeAIHubLauncher.app",
  "Contents",
  "Frameworks",
  "Chromium Embedded Framework.framework",
  "Chromium Embedded Framework"
);

const getPlatformSpecificRequiredPaths = (
  installDir: string,
  platform: PlatformKey
): string[] => {
  if (platform === "darwin-arm64" || platform === "darwin-x64") {
    return [path.join(installDir, MACOS_FRAMEWORK_BINARY)];
  }
  return [];
};

const getRequiredLauncherPaths = (
  installDir: string,
  platform: PlatformKey
): string[] => [
  path.join(installDir, getLauncherExecutableRelativePath(platform)),
  ...getPlatformSpecificRequiredPaths(installDir, platform),
];

export const collectMissingLauncherPaths = async (
  installDir: string,
  platform: PlatformKey,
  pathExists: (targetPath: string) => Promise<boolean>
): Promise<string[]> => {
  const missing: string[] = [];
  const requiredPaths = getRequiredLauncherPaths(installDir, platform);
  for (const requiredPath of requiredPaths) {
    if (!(await pathExists(requiredPath))) {
      missing.push(requiredPath);
    }
  }
  return missing;
};

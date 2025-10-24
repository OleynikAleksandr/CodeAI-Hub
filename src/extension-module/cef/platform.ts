export type PlatformKey =
  | "darwin-arm64"
  | "darwin-x64"
  | "win32-x64"
  | "win32-arm64"
  | "linux-x64";

export const resolvePlatformKey = (): PlatformKey => {
  const { platform, arch } = process;

  if (platform === "darwin") {
    return arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  }

  if (platform === "win32") {
    return arch === "arm64" ? "win32-arm64" : "win32-x64";
  }

  if (platform === "linux") {
    if (arch !== "x64") {
      throw new Error(`Unsupported Linux architecture: ${arch}`);
    }
    return "linux-x64";
  }

  throw new Error(`Unsupported platform: ${platform} (${arch})`);
};

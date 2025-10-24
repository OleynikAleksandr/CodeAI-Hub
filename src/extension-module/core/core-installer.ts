import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { ExtensionContext, Progress } from "vscode";
import {
  downloadFile,
  ensureDirectory,
  extractArchive,
  verifySha1,
} from "../cef/runtime-files";

type ProgressReporter = Progress<{
  message?: string;
  increment?: number;
}>;

export type PlatformKey =
  | "darwin-arm64"
  | "darwin-x64"
  | "win32-x64"
  | "linux-x64";

export type CoreRuntimeInfo = {
  readonly version: string;
  readonly platform: PlatformKey;
  readonly runtimeDir: string;
  readonly binaryPath: string;
};

type ManifestEntry = {
  readonly coreVersion: string;
  readonly package: string;
  readonly size: number;
  readonly sha1: string;
};

type CoreManifest = {
  readonly schema: number;
  readonly baseUrl: string;
  readonly platforms: Record<PlatformKey, ManifestEntry>;
};

const INSTALL_MARKER_FILE = "install.json";
const DOWNLOADS_DIR_NAME = "downloads";
const BINARY_EXECUTABLE_MODE = 0o755;

type InstallMarker = {
  readonly platform: PlatformKey;
  readonly coreVersion: string;
  readonly installedAt: string;
  readonly package: string;
};

const resolvePlatformKey = (): PlatformKey => {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === "darwin") {
    if (arch === "arm64") {
      return "darwin-arm64";
    }
    if (arch === "x64") {
      return "darwin-x64";
    }
  } else if (platform === "win32" && arch === "x64") {
    return "win32-x64";
  } else if (platform === "linux" && arch === "x64") {
    return "linux-x64";
  }

  throw new Error(`Unsupported platform: ${platform}-${arch}`);
};

const readManifest = async (
  context: ExtensionContext
): Promise<CoreManifest> => {
  const manifestPath = path.join(
    context.extensionPath,
    "assets",
    "core",
    "manifest.json"
  );
  const content = await fs.readFile(manifestPath, "utf8");
  return JSON.parse(content) as CoreManifest;
};

const getBaseInstallDir = async (): Promise<string> => {
  const homeDir = process.env.HOME ?? tmpdir();
  const baseDir = path.join(homeDir, ".codeai-hub", "core");
  await ensureDirectory(baseDir);
  return baseDir;
};

const loadInstallMarker = async (
  runtimeDir: string
): Promise<InstallMarker | null> => {
  try {
    const markerPath = path.join(runtimeDir, INSTALL_MARKER_FILE);
    const content = await fs.readFile(markerPath, "utf8");
    return JSON.parse(content) as InstallMarker;
  } catch {
    return null;
  }
};

const verifyExistingInstall = async (
  runtimeDir: string,
  manifestEntry: ManifestEntry
): Promise<boolean> => {
  const marker = await loadInstallMarker(runtimeDir);
  if (!marker) {
    return false;
  }

  if (marker.coreVersion !== manifestEntry.coreVersion) {
    return false;
  }

  try {
    const binaryPath = path.join(runtimeDir, "codeai-hub-core");
    const stat = await fs.stat(binaryPath);
    return stat.isFile();
  } catch {
    return false;
  }
};

const writeInstallMarker = async (
  runtimeDir: string,
  platform: PlatformKey,
  manifestEntry: ManifestEntry
): Promise<void> => {
  const marker: InstallMarker = {
    platform,
    coreVersion: manifestEntry.coreVersion,
    installedAt: new Date().toISOString(),
    package: manifestEntry.package,
  };

  const targetPath = path.join(runtimeDir, INSTALL_MARKER_FILE);
  await fs.writeFile(
    targetPath,
    `${JSON.stringify(marker, null, 2)}\n`,
    "utf8"
  );
};

const prepareDownload = async (platformDir: string): Promise<string> => {
  const downloadsDir = path.join(platformDir, DOWNLOADS_DIR_NAME);
  await ensureDirectory(downloadsDir);
  return downloadsDir;
};

const performInstall = async (
  manifest: CoreManifest,
  platform: PlatformKey,
  baseDir: string,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo> => {
  const manifestEntry = manifest.platforms[platform];
  if (!manifestEntry) {
    throw new Error(`No manifest entry for platform: ${platform}`);
  }

  const platformDir = path.join(baseDir, platform);
  const runtimeDir = path.join(platformDir, manifestEntry.coreVersion);

  const existingIsValid = await verifyExistingInstall(
    runtimeDir,
    manifestEntry
  );
  if (existingIsValid) {
    progress?.report({ message: "Using existing core installation" });
    const binaryPath = path.join(runtimeDir, "codeai-hub-core");
    return {
      version: manifestEntry.coreVersion,
      platform,
      runtimeDir,
      binaryPath,
    };
  }

  await ensureDirectory(runtimeDir);

  const downloadsDir = await prepareDownload(platformDir);
  const archivePath = path.join(downloadsDir, manifestEntry.package);

  progress?.report({ message: "Downloading core orchestrator..." });
  const downloadUrl = `${manifest.baseUrl}v${manifestEntry.coreVersion}/${manifestEntry.package}`;
  await downloadFile(downloadUrl, archivePath, progress);

  progress?.report({ message: "Verifying download..." });
  if (manifestEntry.sha1) {
    const checksumValid = await verifySha1(archivePath, manifestEntry.sha1);
    if (!checksumValid) {
      throw new Error("SHA-1 checksum verification failed");
    }
  }

  progress?.report({ message: "Extracting core orchestrator..." });
  await extractArchive(archivePath, runtimeDir);

  await writeInstallMarker(runtimeDir, platform, manifestEntry);

  const binaryPath = path.join(runtimeDir, "codeai-hub-core");
  await fs.chmod(binaryPath, BINARY_EXECUTABLE_MODE);

  progress?.report({ message: "Core orchestrator installed successfully" });

  return {
    version: manifestEntry.coreVersion,
    platform,
    runtimeDir,
    binaryPath,
  };
};

export const ensureCoreInstalled = async (
  context: ExtensionContext,
  progress?: ProgressReporter
): Promise<CoreRuntimeInfo> => {
  const platform = resolvePlatformKey();
  const manifest = await readManifest(context);
  const baseDir = await getBaseInstallDir();

  return await performInstall(manifest, platform, baseDir, progress);
};
